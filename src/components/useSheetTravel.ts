"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import { FRAMINGS } from "@/lib/viewfinder";

/** How long the sheet takes to travel from one framing to the next. */
const TRAVEL_MS = 1100;
/** A swipe is quicker: the finger already gave it its start. */
const SWIPE_MS = 750;
/** The shortest finish of a drag that already covered most of the way. */
const SWIPE_MIN_MS = 260;
/** Finger travel before the sheet starts following, so a tap stays a tap. */
const DRAG_SLOP = 6;
/** Share of the way to the next stop that commits a drag on release. */
const DRAG_COMMIT = 0.2;
/** A flick commits however short it was: px per ms over the finger's last
    FLICK_WINDOW ms (not since touchdown: the browser holds the first move back
    until the finger has slipped a few px), once it has gone FLICK_MIN px. */
const FLICK = 0.3;
const FLICK_WINDOW = 100;
const FLICK_MIN = 20;

/** How long the arrival animations run past the travel's end (globals.css, fx-in). */
const ARRIVE_TAIL_MS = 600;

/** How long a stray scroll must be still before the sheet settles on a stop. */
const REST_MS = 160;

/** Wheel distance that commits to a move, so a stray touch does not fire one. */
const COMMIT = 24;

/** Quiet time after a travel, so trackpad momentum does not queue a second one. */
const COOLDOWN_MS = 140;

/** How long a new viewport size takes to settle (rotation, eyepiece morph). */
const RESIZE_SETTLE_MS = 300;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** For a swipe: moving at once, as the finger was, then settling. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The sheet travels between framings on its own clock.
 *
 * CSS scroll-snap was doing the framing, but its animation is not
 * configurable: measured, one wheel gesture moved the sheet 900px in **152ms**
 * — about 6000px/s — which is what read as the content lurching past. A soft
 * wheel tick, meanwhile, moved nothing at all, because snap pulled it back.
 *
 * Wanting both halves — always framed, AND slow enough to follow — leaves no
 * choice but to drive the travel ourselves. This is scroll hijacking, which is
 * a real cost, so it is kept honest: `prefers-reduced-motion` jumps instantly,
 * the keyboard drives the same travel as the wheel, and a framing taller than
 * the viewport gets its own intermediate stop so none of its content can
 * become unreachable.
 */
export default function useSheetTravel(scrollRef: RefObject<HTMLElement | null>) {
  const animating = useRef(false);
  const until = useRef(0);
  const goRef = useRef<((dir: number) => void) | null>(null);
  const toRef = useRef<((id: string) => void) | null>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* Every position the sheet is allowed to rest at. A framing contributes its
       top; one taller than the viewport also contributes its bottom, so its
       overflow stays reachable instead of being skipped over. */
    const stops = () => {
      const vp = scroller.clientHeight;
      const out: number[] = [];
      for (const f of FRAMINGS) {
        const el = document.getElementById(f.id);
        if (!el) continue;
        out.push(el.offsetTop);
        if (el.offsetHeight > vp + 1) out.push(el.offsetTop + el.offsetHeight - vp);
      }
      const max = scroller.scrollHeight - vp;
      return [...new Set(out.map((v) => Math.max(0, Math.min(v, max))))].sort(
        (a, b) => a - b,
      );
    };

    let raf: number | null = null;

    /* Presence (globals.css, .fx): the stage says which section is present,
       which way the sheet is going, and whether it is travelling. A section's
       decoration (its photo, feed, disc, footage) leaves as a travel starts
       and the destination's arrives as it ends, so nothing is on screen at the
       seam when it passes, where it used to show cut by a straight line. */
    const stage = scroller.parentElement ?? scroller;
    const sectionAt = (top: number) => {
      let id: string = FRAMINGS[0].id;
      for (const f of FRAMINGS) {
        const el = document.getElementById(f.id);
        if (el && el.offsetTop <= top + 1) id = f.id;
      }
      return id;
    };
    // a finger is holding the sheet (touch drag, below)
    let dragging = false;
    // the viewport is changing (rotation, a resized window: see onResize)
    let resizing = false;

    /* Where the sheet rests, as a section and not as pixels: a section's top,
       or the foot of a framing taller than the viewport. Every section is as
       tall as the viewport, so a rotation moves them all, and the old scrollTop
       then lands in another section, up to a whole screen off (measured,
       2026-10-20). A resize puts the sheet back on this. */
    const anchorOf = (top: number) => {
      const id = sectionAt(top);
      const el = document.getElementById(id);
      return { id, foot: Boolean(el && top > el.offsetTop + 1) };
    };
    let anchor = anchorOf(scroller.scrollTop);

    /* At rest the present section follows the sheet, without animating:
       the first load (a #hash included) and any scroll that is not a travel. */
    const settle = () => {
      if (animating.current || dragging || resizing) return;
      anchor = anchorOf(scroller.scrollTop);
      const id = anchor.id;
      if (stage.dataset.present === id) return;
      stage.dataset.fxInstant = "";
      stage.dataset.present = id;
      requestAnimationFrame(() => requestAnimationFrame(() => delete stage.dataset.fxInstant));
    };
    settle();

    /* The safety net: a scroll that was not a travel (iOS momentum, a drag
       that slipped past the handlers, a scrollbar) never leaves the sheet
       between two sections. Once it has been still for a moment, the sheet
       travels to the nearest stop. */
    let restTimer = 0;
    const onScroll = () => {
      settle();
      if (animating.current || dragging || resizing) return;
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(() => {
        if (animating.current) return;
        const here = scroller.scrollTop;
        const list = stops();
        if (!list.length) return;
        const nearest = list.reduce((a, b) => (Math.abs(b - here) < Math.abs(a - here) ? b : a));
        if (Math.abs(nearest - here) > 1) travel(nearest);
      }, REST_MS);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    /* `ms`: a drag's finish is shorter than a whole swipe. `back`: a drag let
       go too early returns to where it was: no arrival plays, the decoration
       just eases back (globals.css, .fx transitions). */
    const travel = (to: number, swipe = false, ms = swipe ? SWIPE_MS : TRAVEL_MS, back = false) => {
      const from = scroller.scrollTop;
      if (Math.abs(to - from) < 1) {
        delete stage.dataset.fxScrubbed;
        return;
      }

      if (still.matches) {
        scroller.scrollTop = to;
        return;
      }

      if (raf !== null) cancelAnimationFrame(raf);
      animating.current = true;
      const ease = swipe ? easeOut : easeInOut;
      if (!back) {
        // a resize mid-travel lands on where the travel was going
        anchor = anchorOf(to);
        // the arrivals (globals.css, fx-in) start half way, whatever the pace
        stage.style.setProperty("--travel-ms", `${ms}ms`);
        stage.dataset.dir = to > from ? "down" : "up";
        stage.dataset.present = sectionAt(to);
        stage.dataset.travel = "";
      }
      const start = performance.now();

      const step = () => {
        const t = Math.min(1, (performance.now() - start) / ms);
        scroller.scrollTop = from + (to - from) * ease(t);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          raf = null;
          animating.current = false;
          until.current = performance.now() + COOLDOWN_MS;
          // the arrival animations run past the travel; let them finish
          window.setTimeout(() => {
            if (animating.current) return;
            delete stage.dataset.travel;
            delete stage.dataset.fxScrubbed;
          }, ARRIVE_TAIL_MS);
        }
      };
      raf = requestAnimationFrame(step);
    };

    const go = (dir: number, swipe = false) => {
      const list = stops();
      const here = scroller.scrollTop;
      const next =
        dir > 0
          ? list.find((v) => v > here + 1)
          : [...list].reverse().find((v) => v < here - 1);
      if (next !== undefined) travel(next, swipe);
    };

    const toId = (id: string) => {
      const el = document.getElementById(id);
      if (el) travel(el.offsetTop);
    };

    goRef.current = go;
    toRef.current = toId;

    /* The open menu dialog is modal: nothing behind it may travel. */
    const inMenu = (t: EventTarget | null) =>
      Boolean((t as Element | null)?.closest?.("dialog[open]"));

    let wheelSum = 0;

    const onWheel = (e: WheelEvent) => {
      // ctrl/⌘ + wheel is the browser's zoom. Never swallow it.
      if (e.ctrlKey || e.metaKey || inMenu(e.target)) return;
      e.preventDefault();
      if (animating.current || performance.now() < until.current) return;
      wheelSum += e.deltaY;
      if (Math.abs(wheelSum) < COMMIT) return;
      const dir = wheelSum > 0 ? 1 : -1;
      wheelSum = 0;
      go(dir);
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (inMenu(el)) return;
      // Space on a focused button or link activates it; it is not a page move.
      if (e.key === " " && el?.closest("button, a")) return;

      const list = stops();
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(1);
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(-1);
          break;
        case "Home":
          e.preventDefault();
          travel(list[0] ?? 0);
          break;
        case "End":
          e.preventDefault();
          travel(list[list.length - 1] ?? 0);
          break;
      }
    };

    /* Touch: a swipe commits to one move, the same as a wheel gesture — but a
       touch on a control that drags (the seek bar, the volume, the queue's own
       swipe, a text field) belongs to that control. Buttons and links do not
       drag: a swipe that starts on one is still a page move, and a tap still
       taps. They used to count as controls, and since they cover much of a
       phone's screen, a swipe on one fell through to the browser's native
       scroll, which left the sheet halfway between two sections.
       A control marked data-swipe-through (the seek bar) only keeps the touch
       on its own draggable part; elsewhere a swipe is still a page move. */
    const CONTROLS = 'input,select,textarea,[role="slider"],[data-drag]';
    let touchY = 0;
    let onControl = false;

    /* The sheet follows the finger, and on release finishes the move or goes
       back (feedback, 2026-10-20: a 36 px flick used to fire the whole travel,
       far ahead of the finger). The decoration follows too, scrubbed by the
       same progress: the leaving section's goes in the first half of the way,
       the arriving one's comes in the second half, as in a travel
       (globals.css, [data-finger]). Reduced motion: the sheet still follows (the
       finger moves it), the decoration does not. */
    let from = 0; // scrollTop when the finger came down
    let to: number | null = null; // the stop the drag is heading to
    let samples: { t: number; y: number }[] = [];

    const scrub = (progress: number) => {
      stage.style.setProperty("--o", Math.min(1, progress * 2).toFixed(3));
      stage.style.setProperty("--i", Math.min(1, Math.max(0, 2 - progress * 2)).toFixed(3));
    };

    // the decoration back to rest (it eases there: globals.css, .fx)
    const endDecoration = () => {
      delete stage.dataset.finger;
      delete stage.dataset.next;
      stage.style.removeProperty("--o");
      stage.style.removeProperty("--i");
    };
    const endDrag = () => {
      dragging = false;
      endDecoration();
    };

    const onTouchStart = (e: TouchEvent) => {
      const el = e.target as HTMLElement | null;
      const control = el?.closest(CONTROLS);
      onControl = Boolean(control && !control.hasAttribute("data-swipe-through")) || inMenu(el);
      touchY = e.touches[0]?.clientY ?? 0;
      from = scroller.scrollTop;
      to = null;
      samples = [{ t: e.timeStamp, y: touchY }];
    };

    const onTouchMove = (e: TouchEvent) => {
      if (onControl) return;
      e.preventDefault();
      if (animating.current) return;
      const y = e.touches[0]?.clientY ?? touchY;
      samples.push({ t: e.timeStamp, y });
      if (samples.length > 5) samples.shift();
      const dy = touchY - y;

      if (!dragging) {
        if (Math.abs(dy) < DRAG_SLOP) return;
        dragging = true;
        window.clearTimeout(restTimer);
      }

      // the stop ahead, in whichever way the finger is going now
      const list = stops();
      const next =
        dy > 0 ? list.find((v) => v > from + 1) : [...list].reverse().find((v) => v < from - 1);
      if (next === undefined) {
        // the first or last stop: give a little, then hold
        to = null;
        scroller.scrollTop = from + Math.sign(dy) * Math.min(Math.abs(dy) * 0.25, 48);
        endDecoration();
        return;
      }
      to = next;
      const span = Math.abs(next - from);
      const moved = Math.min(Math.abs(dy), span);
      scroller.scrollTop = from + Math.sign(dy) * moved;

      const here = stage.dataset.present;
      const there = sectionAt(next);
      if (still.matches || there === here) {
        endDecoration();
        return;
      }
      stage.dataset.finger = "";
      stage.dataset.dir = dy > 0 ? "down" : "up";
      stage.dataset.next = there;
      scrub(moved / span);
    };

    const onTouchEnd = () => {
      if (onControl || !dragging) return;
      const target = to;
      const arriving =
        stage.dataset.next !== undefined && Number(stage.style.getPropertyValue("--i")) < 1;
      endDrag();
      if (target === null) {
        travel(from, true, SWIPE_MIN_MS, true);
        return;
      }

      const span = Math.abs(target - from);
      const done = Math.abs(scroller.scrollTop - from) / span;
      const last = samples[samples.length - 1];
      const first = samples.find((s) => last.t - s.t <= FLICK_WINDOW) ?? last;
      const speed = last.t > first.t ? (first.y - last.y) / (last.t - first.t) : 0;
      const heading = Math.sign(target - from);
      const flick =
        Math.sign(speed) === heading &&
        Math.abs(speed) >= FLICK &&
        Math.abs(touchY - last.y) >= FLICK_MIN;

      if (done >= DRAG_COMMIT || flick) {
        // the arriving decoration already partly in: let it finish from there
        if (arriving) stage.dataset.fxScrubbed = "";
        travel(target, true, Math.max(SWIPE_MIN_MS, SWIPE_MS * (1 - done)));
      } else {
        travel(from, true, Math.max(SWIPE_MIN_MS, SWIPE_MS * done), true);
      }
    };

    /* A rotation or a resized window: whatever was moving stops, and the
       sheet lands, at once, back on the section it rested on (or was going
       to). No travel: the whole layout just changed, an animated move on top
       would only add to it. The window's resize event comes before the scroll
       the browser fires when it clamps the old scrollTop, so `resizing` is
       already up when that scroll reaches settle() and the safety net. Done
       again once the eyepiece and the sections have settled into the new size. */
    let resizeTimer = 0;
    const realign = () => {
      const el = document.getElementById(anchor.id);
      if (!el) return;
      const vp = scroller.clientHeight;
      const top = anchor.foot ? el.offsetTop + el.offsetHeight - vp : el.offsetTop;
      scroller.scrollTop = Math.max(0, Math.min(top, scroller.scrollHeight - vp));
    };
    const onResize = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      animating.current = false;
      if (dragging) endDrag();
      window.clearTimeout(restTimer);
      resizing = true;
      stage.dataset.fxInstant = "";
      stage.dataset.present = anchor.id;
      delete stage.dataset.travel;
      delete stage.dataset.fxScrubbed;
      realign();
      requestAnimationFrame(realign);
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        realign();
        resizing = false;
        delete stage.dataset.fxInstant;
      }, RESIZE_SETTLE_MS);
    };

    stage.addEventListener("wheel", onWheel as EventListener, { passive: false });
    window.addEventListener("resize", onResize);
    stage.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    stage.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });
    stage.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    stage.addEventListener("touchcancel", onTouchEnd as EventListener, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      stage.removeEventListener("wheel", onWheel as EventListener);
      stage.removeEventListener("touchstart", onTouchStart as EventListener);
      stage.removeEventListener("touchmove", onTouchMove as EventListener);
      stage.removeEventListener("touchend", onTouchEnd as EventListener);
      stage.removeEventListener("touchcancel", onTouchEnd as EventListener);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      scroller.removeEventListener("scroll", onScroll);
      window.clearTimeout(restTimer);
      window.clearTimeout(resizeTimer);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  /** Used by the menu, so choosing a section travels like everything else. */
  const goTo = useCallback((id: string) => toRef.current?.(id), []);

  return { goTo };
}
