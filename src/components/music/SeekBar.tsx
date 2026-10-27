"use client";

import { useMemo, useRef, useState } from "react";
import { vars } from "./css";
import { hms } from "./format";
import { BARS } from "./levels";

type Props = {
  position: number;
  duration: number;
  disabled: boolean;
  /** the set's dynamics, one 0..1 peak per bar (null while loading) */
  bars: readonly number[] | null;
  onSeek: (ms: number) => void;
  /** Called with the time under the pointer while dragging, then null on release. */
  onScrub: (ms: number | null) => void;
};

const STEP = 10_000;
const BIG = 60_000;
const H = 20;
const MIN = 3;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** One path of 72 bars, so a whole layer is a single element. */
function barsPath(bars: readonly number[] | null) {
  let d = "";
  for (let i = 0; i < BARS; i++) {
    const h = MIN + (bars ? bars[i] : 0) * (H - MIN);
    d += `M${i + 0.15} ${H}V${(H - h).toFixed(2)}h0.7V${H}Z`;
  }
  return d;
}

/**
 * The set's timeline, drawn as its own dynamics: every bar is the loudest moment
 * of that slice of the set (real peaks), lit up to the playhead. Drops and
 * breakdowns are visible, so "jump to the drop" is something you can aim at.
 * A ghost line follows the pointer; a drag previews the time in the LCD clock
 * and the seek is sent once, on release. Keyboard: arrows ±10 s, Page keys ±1 min.
 *
 * A finger only drags the playhead's grip (a 44 px hit area around the thin
 * line): the rest of the rail lets a swipe through to the page, because on a
 * phone the rail sits right where the thumb scrolls. A mouse can still click
 * anywhere on the rail to jump there.
 */
export default function SeekBar({ position, duration, disabled, bars, onSeek, onScrub }: Props) {
  const rail = useRef<HTMLDivElement | null>(null);
  // where in the rail the grip was taken, so a grab doesn't jump the playhead
  const grabOffset = useRef(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const path = useMemo(() => barsPath(bars), [bars]);

  const fractionAt = (clientX: number) => {
    const el = rail.current;
    if (!el) return 0;
    const box = el.getBoundingClientRect();
    return clamp01((clientX - box.left) / box.width);
  };

  const shown = drag ?? (duration > 0 ? clamp01(position / duration) : 0);
  const shownMs = shown * duration;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const delta: Record<string, number> = {
      ArrowRight: STEP,
      ArrowUp: STEP,
      ArrowLeft: -STEP,
      ArrowDown: -STEP,
      PageUp: BIG,
      PageDown: -BIG,
    };
    if (e.key in delta) {
      e.preventDefault();
      onSeek(Math.min(Math.max(position + delta[e.key], 0), duration));
    } else if (e.key === "Home") {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onSeek(Math.max(duration - 1000, 0));
    }
  };

  return (
    <div
      ref={rail}
      className="mp-seek"
      data-drag={drag !== null}
      data-swipe-through=""
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Posición en el set"
      aria-disabled={disabled}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration / 1000)}
      aria-valuenow={Math.round(shownMs / 1000)}
      aria-valuetext={hms(shownMs)}
      style={vars({ "--f": shown, "--g": hover ?? 0 })}
      onKeyDown={disabled ? undefined : onKeyDown}
      onPointerDown={(e) => {
        if (disabled) return;
        const onGrip = Boolean((e.target as Element).closest(".mp-seek__grip"));
        if (e.pointerType !== "mouse" && !onGrip) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        grabOffset.current = onGrip ? fractionAt(e.clientX) - shown : 0;
        const f = clamp01(fractionAt(e.clientX) - grabOffset.current);
        setDrag(f);
        onScrub(f * duration);
      }}
      onPointerMove={(e) => {
        if (drag !== null) {
          const f = clamp01(fractionAt(e.clientX) - grabOffset.current);
          setDrag(f);
          onScrub(f * duration);
        } else if (!disabled && e.pointerType === "mouse") {
          setHover(fractionAt(e.clientX));
        }
      }}
      onPointerUp={(e) => {
        if (drag === null) return;
        const f = clamp01(fractionAt(e.clientX) - grabOffset.current);
        setDrag(null);
        onScrub(null);
        onSeek(f * duration);
      }}
      onPointerCancel={() => {
        setDrag(null);
        onScrub(null);
      }}
      onPointerLeave={() => setHover(null)}
    >
      <svg className="mp-seek__bars" viewBox={`0 0 ${BARS} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={path} />
      </svg>
      <svg
        className="mp-seek__bars mp-seek__bars--lit"
        viewBox={`0 0 ${BARS} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
      {hover !== null && drag === null && <span className="mp-seek__ghost" />}
      <span className="mp-seek__head">
        <span className="mp-seek__grip" data-drag="" />
      </span>
    </div>
  );
}
