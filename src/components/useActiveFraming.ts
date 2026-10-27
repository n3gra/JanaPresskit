"use client";

import { RefObject, useEffect, useState } from "react";
import { FRAMINGS } from "@/lib/viewfinder";

/**
 * Which framing the eyepiece should take: the section covering most of the
 * scroller's viewport.
 *
 * State changes only when the answer does. It used to also publish the scroll
 * fraction (for the shutter scale), which set state on every scroll event and
 * re-rendered the Viewfinder and the menu each time for nothing.
 *
 * This used to be an IntersectionObserver and it flickered. Its callback only
 * carries the sections whose thresholds *changed*, and the code picked the best
 * among those alone: on every transition the outgoing section arrived by itself
 * — still intersecting — and won over the incoming one already filling the
 * screen. Measured, all four transitions went A -> B -> A -> B, so the eyepiece
 * morphed backwards for 50-100ms in the middle of each one.
 *
 * Comparing overlap across *all* the sections removes the failure instead of
 * tuning it: as you scroll, one section's share only falls and the next one's
 * only rises, so there is exactly one crossover and the shape never reverses.
 */
export default function useActiveFraming(scrollRef: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const sections = FRAMINGS.map((f) => document.getElementById(f.id));

    /* Boxes are cached, not read on every scroll: the eyepiece rewrites styles
       every frame, so measuring on each event would force a layout each time.
       They are refreshed only when the scroll length or the viewport actually
       changes — two cheap reads per scroll event.

       Watching the sections themselves was the wrong signal, and measurably so:
       their padding follows the eyepiece, so they breathe sub-pixel on every
       frame of the morph and a ResizeObserver on them fired ~once per frame.
       Only `perfil` ever moves a real amount (900 -> 1000px, which shifts
       every section below it), and that shows up in `scrollHeight`. */
    let boxes = sections.map(() => ({ top: 0, height: 0 }));
    let lastLength = -1;
    let lastViewport = -1;

    const measure = () => {
      boxes = sections.map((el) =>
        el ? { top: el.offsetTop, height: el.offsetHeight } : { top: 0, height: 0 },
      );
    };

    const read = () => {
      const length = scroller.scrollHeight;
      const viewport = scroller.clientHeight;
      if (length !== lastLength || viewport !== lastViewport) {
        lastLength = length;
        lastViewport = viewport;
        measure();
      }

      const top = scroller.scrollTop;
      const bottom = top + viewport;
      let best = 0;
      let bestOverlap = -1;
      boxes.forEach((box, i) => {
        const overlap =
          Math.min(box.top + box.height, bottom) - Math.max(box.top, top);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = i;
        }
      });
      setActive(best);
    };

    read();
    scroller.addEventListener("scroll", read, { passive: true });

    /* A viewport resize moves everything but fires no scroll event, so the
       scroller itself is watched. Nothing else is. */
    const ro = new ResizeObserver(read);
    ro.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, [scrollRef]);

  return { active };
}
