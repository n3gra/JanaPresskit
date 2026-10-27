/**
 * The site-wide pause (WCAG 2.2.2): one switch, the VCR display's PLAY/PAUSE,
 * freezes everything that moves on its own — the hero footage, the CRT glass,
 * the REC dot, the tape counter and Perfil's film advance.
 *
 * CSS reads it as [data-paused] on the stage (the element with data-bp), so
 * every animation under it stops with one attribute; the video and the
 * counter subscribe here. The choice is remembered: ViewfinderBoot applies a
 * stored pause before React, so a paused visitor never sees a frame move.
 */
type Listener = () => void;

export const PAUSE_KEY = "jana:paused";

let paused = false;
let read = false;
const listeners = new Set<Listener>();

/** Mirrors the state onto the stage, for the CSS. */
function apply() {
  const el = document.querySelector<HTMLElement>("[data-bp]");
  if (!el) return;
  if (paused) el.dataset.paused = "";
  else delete el.dataset.paused;
}

function load() {
  if (read) return;
  read = true;
  try {
    paused = localStorage.getItem(PAUSE_KEY) === "1";
  } catch {
    // storage blocked (private mode, previews): start playing
  }
}

export const motion = {
  isPaused() {
    load();
    return paused;
  },
  /** Re-applies a stored pause, in case the boot script could not. */
  sync() {
    load();
    apply();
  },
  set(next: boolean) {
    load();
    if (next === paused) return;
    paused = next;
    apply();
    try {
      if (paused) localStorage.setItem(PAUSE_KEY, "1");
      else localStorage.removeItem(PAUSE_KEY);
    } catch {
      // not remembered, still paused for this visit
    }
    listeners.forEach((l) => l());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
