/**
 * The hero intro's clock, shared with anything that must move in time with it
 * (the menu opens as the intro plays).
 *
 * The video reports each presented frame; this keeps the moment the intro's
 * time zero was (or would have been) on screen, so a listener can read
 * progress at display rate instead of stepping at the clip's 24 fps. Progress
 * only moves forward: a late or re-anchored frame never rewinds the menu.
 */
type Listener = () => void;

let origin: number | null = null;
let durationMs = 0;
let done = false;
let last = 0;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());

export const heroIntro = {
  /** Time zero of the intro, in performance.now() milliseconds. */
  anchor(at: number, duration: number) {
    if (done) return;
    origin = at;
    durationMs = duration;
    emit();
  },
  /** The intro is over, skipped (reduced motion) or never going to play. */
  finish() {
    if (done) return;
    done = true;
    emit();
  },
  /** 0 before the intro starts, 1 once it has finished. */
  progress(now: number) {
    if (done) return 1;
    if (origin === null || durationMs <= 0) return last;
    last = Math.max(last, Math.min(1, (now - origin) / durationMs));
    return last;
  },
  isDone: () => done,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
