"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * When the SoundCloud widget may load. It weighs ~1.2 MB (its own script), and
 * loaded with the page it competed with the hero for the connection. Nothing
 * the visitor sees depends on it — the player is drawn by us — only the audio.
 *
 * So it waits for whichever comes first:
 * - the page has loaded and the main thread is idle: by the time anyone reaches
 *   Música the widget is usually ready, and the hero never shared bandwidth;
 * - Música starts to come into view: someone who jumps there before the page
 *   settled still gets it as early as possible.
 *
 * Once armed it stays armed: unmounting the widget would stop the music.
 */
export function useWidgetArming(sectionRef: RefObject<HTMLElement | null>) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (armed) return;
    const arm = () => setArmed(true);

    /* ---- after load, when idle ------------------------------------------- */
    let idle = 0;
    let timer = 0;
    const whenIdle = () => {
      // Safari has no requestIdleCallback: a short delay stands in for it.
      if (typeof window.requestIdleCallback === "function")
        idle = window.requestIdleCallback(arm, { timeout: 3000 });
      else timer = window.setTimeout(arm, 1500);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    /* ---- Música coming into view -----------------------------------------
       The root is the sheet (<main>), which scrolls, not the window. Música
       sits right under the hero, touching its bottom edge, which already
       counts as "intersecting" with a zero ratio: only a real sliver counts. */
    const section = sectionRef.current;
    const io = section
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.intersectionRatio > 0)) arm();
          },
          { root: section.closest("main"), threshold: [0, 0.01] },
        )
      : null;
    if (section && io) io.observe(section);

    return () => {
      window.removeEventListener("load", whenIdle);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [armed, sectionRef]);

  return armed;
}
