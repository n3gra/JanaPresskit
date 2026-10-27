"use client";

import { RefObject, useEffect, useRef, useSyncExternalStore } from "react";
import { motion } from "@/lib/motion";

/** The site's maker, credited in the bottom-right corner (her Linktree has the rest). */
const MAKER = {
  name: "Yamina Pipolo",
  href: "https://linktr.ee/yamina.pipolo",
};

/* ---- the frame's outline ----------------------------------------------------
   A tube's pincushion (design, 2026-10-20): sharp corners, the top and bottom
   pinched in to a softened peak at the middle, the sides bowed in. Drawn in
   the frame's own pixels, so the stroke stays one width.
   - The pinch never takes more than the band between the frame and the
     nearest glass of any section (less 8px), so no glass is ever touched.
   - The sides bow in a little, or, where the glass on screen is narrower
     than the stage (Contacto's lens), to half the way to it: the same rule
     as the frame itself. The Viewfinder redraws it on every frame of a
     morph (frameOutline), so the sides follow the glass in and out. */
const PINCH = 0.05; // of the height, at the middle of the top and the bottom
const BOW = 0.012; // of the width, at the middle of the sides
const SOFTEN = 60; // px along each side of a peak that round it off
const CLEAR = 8;

/**
 * The frame sits at half the hull (the gap to the nearest glass of any
 * section, as globals.css .hud__frame places it); `glassX` is the glass on
 * screen now. Coordinates are the frame's own, from its top-left corner.
 */
export function frameOutline(w: number, h: number, hull: { x: number; y: number }, glassX: number) {
  const fw = w - hull.x;
  const fh = h - hull.y;
  const bandX = hull.x / 2;
  const bandY = hull.y / 2;
  return outlinePath(
    fw,
    fh,
    Math.max(0, Math.min(fh * PINCH, bandY - CLEAR)),
    Math.max(0, Math.min(fw * BOW, bandX - CLEAR), (glassX - bandX) / 2),
  );
}

function outlinePath(w: number, h: number, d: number, s: number) {
  const k = Math.min(SOFTEN, w / 4);
  const len = Math.hypot(w / 2, d);
  const kx = ((w / 2) * k) / len;
  const ky = (d * k) / len;
  const n = (v: number) => v.toFixed(1);
  return [
    `M0 0`,
    `L${n(w / 2 - kx)} ${n(d - ky)} Q${n(w / 2)} ${n(d)} ${n(w / 2 + kx)} ${n(d - ky)} L${n(w)} 0`,
    `Q${n(w - 2 * s)} ${n(h / 2)} ${n(w)} ${n(h)}`,
    `L${n(w / 2 + kx)} ${n(h - d + ky)} Q${n(w / 2)} ${n(h - d)} ${n(w / 2 - kx)} ${n(h - d + ky)} L0 ${n(h)}`,
    `Q${n(2 * s)} ${n(h / 2)} 0 0Z`,
  ].join(" ");
}

/**
 * A VCR's on-screen display in the black around the eyepiece (design,
 * 2026-10-13): a thin red frame around the stage (2026-10-20) and, in its
 * corners, REC with a slow red dot, the tape counter, PLAY and the maker's
 * credit. Under the CRT glass, so it gets the same scanlines and grain.
 *
 * PLAY is the site's pause (WCAG 2.2.2, lib/motion.ts): pressed, it reads
 * PAUSE and everything that moves on its own holds still, the counter too,
 * like a tape on pause. Shown with reduced motion too: the counter still
 * ticks there.
 *
 * Cheap on purpose: the counter rewrites one span once a second (a tiny
 * repaint) and the dot only fades (opacity). The rest is decoration for
 * assistive tech; the pause and the credit are real controls.
 */
export default function ScreenHud({ outlineRef }: { outlineRef: RefObject<SVGSVGElement | null> }) {
  const counter = useRef<HTMLSpanElement | null>(null);
  const paused = useSyncExternalStore(motion.subscribe, motion.isPaused, () => false);
  useEffect(() => motion.sync(), []);

  useEffect(() => {
    const el = counter.current;
    if (!el) return;
    // Tape time only runs while playing.
    let banked = 0;
    let since: number | null = motion.isPaused() ? null : performance.now();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const ms = banked + (since === null ? 0 : performance.now() - since);
      const s = Math.floor(ms / 1000);
      el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    };
    const unsubscribe = motion.subscribe(() => {
      if (motion.isPaused() && since !== null) {
        banked += performance.now() - since;
        since = null;
      } else if (!motion.isPaused() && since === null) {
        since = performance.now();
      }
      tick();
    });
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      unsubscribe();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="hud">
      <span className="hud__frame" aria-hidden="true">
        {/* drawn by the Viewfinder, which knows where the glass is (frameOutline) */}
        <svg ref={outlineRef} className="hud__outline" focusable="false">
          <path />
        </svg>
      </span>
      <span className="hud__tl" aria-hidden="true">
        <span className="hud__rec" /> REC
      </span>
      <span className="hud__tr" aria-hidden="true">
        SP <span ref={counter}>00:00:00</span>
      </span>
      {/* no section name here: "PLAY ▶ CONTACTO" read as a link */}
      {/* the display shows the deck's state, as a VCR does, labelled like the
          credit (what, dim; its value, bright); the hidden part says what
          pressing it does */}
      <button type="button" className="hud__bl hud__play" onClick={() => motion.set(!paused)}>
        <span className="hud__role">Animación</span>
        <span aria-hidden="true">{paused ? "❚❚" : "▶"}</span>
        {paused ? "PAUSE" : "PLAY"}
        <span className="sr-only">: {paused ? "reanudar" : "pausar"} video y animaciones</span>
      </button>
      {/* a credit line, as studios sign: the role, then the name, linked */}
      <span className="hud__br">
        <span className="hud__role">Website by</span>
        <a href={MAKER.href} target="_blank" rel="noopener noreferrer">
          {MAKER.name}
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      </span>
    </div>
  );
}
