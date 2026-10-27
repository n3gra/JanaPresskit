"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { heroIntro } from "@/lib/heroIntro";
import { motion } from "@/lib/motion";

/** Both clips are 24 fps; the intro's last frame is held this long before the loop. */
const FRAME_MS = 1000 / 24;

/** If the intro has not started by then (slow network), stop holding the menu shut. */
const STALL_MS = 3000;

/** Where the plate is drawn at most ~1400 CSS px wide: the 1350px cut is enough. */
const SMALL = "(max-width: 1400px) and (max-height: 940px)";

type Stage = "poster" | "intro" | "loop";

/**
 * The hero's moving plate: an intro that plays once, then a loop forever.
 *
 * Three layers, bottom to top: the poster (the intro's frame 0, a still image so
 * it can be the LCP without waiting on video), the loop, the intro. The loop is
 * preloaded and parked on its frame 0 under the intro, so the hand-off is just
 * hiding the intro on the tick its last frame expires — the loop's first frame
 * is already on screen, nothing has to decode in the gap.
 *
 * Like the Figma, the plate covers the whole screen and the eyepiece crops it;
 * it is not fitted to the eyepiece box.
 *
 * Each clip lists WebM (VP9) first and the original H.264 MP4 second: a browser
 * takes the first source it can play, so only one that cannot play VP9 (older
 * Safari) pays for the heavier MP4.
 *
 * Screens that show the plate at most ~1400 CSS px wide (cover makes that
 * max(width, 1.5 × height): phones, small laptops) get a 1350px cut, ~70%
 * lighter and the same to the eye at that size (H7). The 2700px masters stay
 * for anything larger.
 *
 * The intro also drives `heroIntro`, the clock the menu opens on. Every path
 * that means "there will be no intro" (reduced motion, refused autoplay, a
 * stall) finishes that clock, so the menu is never left closed.
 *
 * The site's pause (lib/motion.ts) holds whichever clip is on screen; a visit
 * that starts paused stays on the poster, like reduced motion, until PLAY.
 */
export default function HeroVideo() {
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState<Stage>("poster");

  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;
    // Reduced motion stays on the poster; the clips are never even fetched.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      heroIntro.finish();
      return;
    }

    let handedOff = false;
    let holdTimer = 0;
    let frameCb = 0;

    const handOff = () => {
      if (handedOff) return;
      handedOff = true;
      heroIntro.finish();
      setStage("loop");
      if (!motion.isPaused()) loop.play().catch(() => {});
    };

    // requestVideoFrameCallback reports the frame actually presented, so the
    // hand-off lands one frame after the last one — `ended` alone fires late
    // and unevenly. `ended` stays as the fallback where rVFC is missing.
    const watch = (_now: number, meta: VideoFrameCallbackMetadata) => {
      heroIntro.anchor(meta.expectedDisplayTime - meta.mediaTime * 1000, intro.duration * 1000);
      const last = intro.duration - (1.5 * FRAME_MS) / 1000;
      if (meta.mediaTime >= last) {
        holdTimer = window.setTimeout(handOff, FRAME_MS);
        return;
      }
      frameCb = intro.requestVideoFrameCallback(watch);
    };
    const hasFrameCb = typeof intro.requestVideoFrameCallback === "function";
    if (hasFrameCb) frameCb = intro.requestVideoFrameCallback(watch);
    intro.addEventListener("ended", handOff);
    const onPlaying = () => {
      window.clearTimeout(stallTimer);
      setStage((s) => (s === "poster" ? "intro" : s));
      if (!hasFrameCb)
        heroIntro.anchor(performance.now() - intro.currentTime * 1000, intro.duration * 1000);
    };
    intro.addEventListener("playing", onPlaying, { once: true });
    const stallTimer = window.setTimeout(() => heroIntro.finish(), STALL_MS);

    // Autoplay can still be refused (e.g. iOS Low Power Mode): keep the poster.
    // The intro is asked for first; the loop only needs to be ready by its end.
    // Only a real refusal ends the clock: an AbortError just means this play()
    // was interrupted by a pause (e.g. React remounting the effect in dev).
    const playIntro = () =>
      intro.play().catch((e: DOMException) => {
        if (e.name !== "AbortError") heroIntro.finish();
      });
    // Arriving paused (lib/motion.ts): the poster holds and the menu opens
    // as with reduced motion; PLAY starts the intro from there.
    if (motion.isPaused()) heroIntro.finish();
    else playIntro();
    loop.preload = "auto";
    loop.load();

    // Nobody sees the loop once the hero has scrolled away.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!handedOff) return;
      if (visible && !motion.isPaused()) loop.play().catch(() => {});
      else loop.pause();
    });
    io.observe(loop);

    const unsubscribe = motion.subscribe(() => {
      if (motion.isPaused()) {
        intro.pause();
        loop.pause();
      } else if (handedOff) {
        if (visible) loop.play().catch(() => {});
      } else {
        playIntro();
      }
    });

    return () => {
      unsubscribe();
      io.disconnect();
      window.clearTimeout(holdTimer);
      window.clearTimeout(stallTimer);
      intro.removeEventListener("playing", onPlaying);
      if (hasFrameCb) intro.cancelVideoFrameCallback(frameCb);
      intro.removeEventListener("ended", handOff);
      intro.pause();
      loop.pause();
    };
  }, []);

  return (
    /* The screen, capped where the eyepiece stops growing (--stage-max-*):
       up to that it is the whole screen, past it the footage stays framed
       to the glass instead of being cropped to the monitor. */
    <div
      aria-hidden="true"
      className="fx fx-footage pointer-events-none absolute inset-0 m-auto h-[min(100%,var(--stage-max-h))] w-[min(100%,var(--stage-max-w))] bg-sf-300"
    >
      <Image
        src="/images/hero-poster.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1920px) 1920px, 100vw"
        className="object-cover"
      />
      <video
        ref={loopRef}
        className={`absolute inset-0 h-full w-full object-cover ${stage === "poster" ? "opacity-0" : ""}`}
        muted
        playsInline
        loop
        preload="none"
        disablePictureInPicture
      >
        <source src="/video/hero-loop-1350.webm" type="video/webm" media={SMALL} />
        <source src="/video/hero-loop-1350.mp4" type="video/mp4" media={SMALL} />
        <source src="/video/hero-loop.webm" type="video/webm" />
        <source src="/video/hero-loop.mp4" type="video/mp4" />
      </video>
      <video
        ref={introRef}
        className={`absolute inset-0 h-full w-full object-cover ${stage === "intro" ? "" : "opacity-0"}`}
        muted
        playsInline
        preload="none"
        disablePictureInPicture
      >
        <source src="/video/hero-intro-1350.webm" type="video/webm" media={SMALL} />
        <source src="/video/hero-intro-1350.mp4" type="video/mp4" media={SMALL} />
        <source src="/video/hero-intro.webm" type="video/webm" />
        <source src="/video/hero-intro.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
