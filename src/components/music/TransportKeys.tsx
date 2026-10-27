"use client";

/**
 * The keys, in the Figma's order: previous, play/pause, next (the widest key
 * in the middle). Every visual state (enable / hover / press) lives in CSS on
 * :hover and :active, so the only React state that matters is `playing`.
 * Prev/next light their icon only while pressed; play/pause keeps the lit glyph
 * for the *current* state and swaps it while pressed.
 */

const PREV =
  "M7.33332 24V8H9.55566V24H7.33332ZM24.6667 24L12.9777 16L24.6667 8V24ZM22.4443 19.7777V12.2223L16.911 16L22.4443 19.7777Z";
const NEXT =
  "M22.4443 24V8H24.6667V24H22.4443ZM7.33332 24V8L19.0223 16L7.33332 24ZM9.55566 19.7777L15.089 16L9.55566 12.2223V19.7777Z";
const PLAY =
  "M4 25.6667V7L18.6667 16.3333L4 25.6667ZM6.22233 21.6223L14.5333 16.3333L6.22233 11.0443V21.6223Z";
const PAUSE =
  "M33.4444 25.3327V6.66602H41.3334V25.3327H33.4444ZM22.6667 25.3327V6.66602H30.5557V25.3327H22.6667ZM35.6667 23.1103H39.1111V8.88835H35.6667V23.1103ZM24.8891 23.1103H28.3334V8.88835H24.8891V23.1103Z";

export function StepKey({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mp-key mp-key--step"
      onClick={onClick}
      aria-label={dir === "prev" ? "Set anterior" : "Set siguiente"}
    >
      <span className="mp-key__face">
        <svg className="mp-ico" viewBox="0 0 32 32" aria-hidden="true">
          <path fill="currentColor" d={dir === "prev" ? PREV : NEXT} />
        </svg>
      </span>
    </button>
  );
}

export function PlayKey({
  playing,
  busy,
  ready,
  title,
  onClick,
}: {
  playing: boolean;
  /** a play is loading: the key holds still (aria-disabled keeps it focusable) */
  busy: boolean;
  ready: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mp-key mp-key--pp"
      data-playing={playing}
      onClick={onClick}
      disabled={!ready}
      aria-disabled={busy || undefined}
      aria-label={busy ? `Cargando ${title}` : playing ? `Pausar ${title}` : `Reproducir ${title}`}
      aria-pressed={playing}
    >
      <span className="mp-key__face">
        <span className="mp-pp">
          <svg className="mp-ico mp-ico--play" viewBox="0 0 46 32" aria-hidden="true">
            <path fill="currentColor" d={PLAY} />
          </svg>
          <svg className="mp-ico mp-ico--pause" viewBox="0 0 46 32" aria-hidden="true">
            <path fill="currentColor" d={PAUSE} />
          </svg>
        </span>
      </span>
    </button>
  );
}
