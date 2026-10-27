"use client";

import { useEffect, useRef } from "react";
import { SEGMENTS, levelAt } from "./levels";
import { usePeaks } from "./usePeaks";

type Props = {
  setId: string;
  playing: boolean;
  durationMs: number;
  getPosition: () => number;
};

/*
 * Ballistics, all time constants in ms. Two stages, like real gear:
 *  - the "needle" (level) jumps up fast and falls back slowly;
 *  - each lamp then has its own inertia: it warms up quickly and keeps glowing
 *    after it is no longer driven, so a rise sweeps up the column and a fall
 *    leaves a fading trail instead of switching off.
 * A peak marker sits above the level, holds, then drops.
 */
const ATTACK = 45;
const RELEASE = 320;
const LAMP_UP = 35;
const LAMP_DOWN = 210;
const HOLD = 1200;
const FALL = 0.005; // segments per ms

const ease = (cur: number, target: number, dt: number, tc: number) =>
  cur + (target - cur) * (1 - Math.exp(-dt / tc));

type Meter = {
  level: number[];
  peak: number[];
  hold: number[];
  peakSeg: number[];
  lamp: Float32Array;
  shown: Float32Array;
};

const makeMeter = (): Meter => ({
  level: [0, 0],
  peak: [0, 0],
  hold: [0, 0],
  peakSeg: [-1, -1],
  lamp: new Float32Array(2 * SEGMENTS),
  shown: new Float32Array(2 * SEGMENTS).fill(-1),
});

/**
 * Two 19-lamp columns driven by the set's published peaks at the playback
 * position (see levels.ts). Lamp brightness is written straight to the DOM from a
 * requestAnimationFrame loop, so the meter never re-renders React. The state
 * lives in a ref, so it keeps decaying smoothly when playback pauses.
 */
export default function Vumetro({ setId, playing, durationMs, getPosition }: Props) {
  const segs = useRef<(HTMLSpanElement | null)[]>([]);
  const meter = useRef<Meter | null>(null);
  const fine = useRef<Float32Array | null>(null);
  const peaks = usePeaks(setId);

  useEffect(() => {
    fine.current = peaks?.fine ?? null;
  }, [peaks]);

  useEffect(() => {
    const m = (meter.current ??= makeMeter());
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const pos = getPosition();
      let alive = playing;

      for (let c = 0; c < 2; c++) {
        const target = playing ? levelAt(fine.current, pos, durationMs, c === 0 ? 0 : 3) : 0;
        m.level[c] = ease(m.level[c], target, dt, target > m.level[c] ? ATTACK : RELEASE);
        const lit = m.level[c] * SEGMENTS;

        if (lit >= m.peak[c]) {
          m.peak[c] = lit;
          m.hold[c] = now + HOLD;
        } else if (now > m.hold[c]) {
          m.peak[c] = Math.max(lit, m.peak[c] - FALL * dt);
        }
        const marker = m.peak[c] > lit + 0.8 ? Math.min(SEGMENTS - 1, Math.floor(m.peak[c])) : -1;

        for (let s = 0; s < SEGMENTS; s++) {
          const i = c * SEGMENTS + s;
          const goal = Math.min(Math.max(lit - s, 0), 1); // the top lamp lights fractionally
          const next = ease(m.lamp[i], goal, dt, goal > m.lamp[i] ? LAMP_UP : LAMP_DOWN);
          m.lamp[i] = next;
          if (Math.abs(next - m.shown[i]) > 0.004) {
            m.shown[i] = next;
            segs.current[i]?.style.setProperty("--i", next.toFixed(3));
          }
          if (next > 0.004) alive = true;
        }

        if (marker !== m.peakSeg[c]) {
          if (m.peakSeg[c] >= 0) segs.current[c * SEGMENTS + m.peakSeg[c]]?.removeAttribute("data-peak");
          if (marker >= 0) segs.current[c * SEGMENTS + marker]?.setAttribute("data-peak", "true");
          m.peakSeg[c] = marker;
        }
        if (marker >= 0) alive = true;
      }

      if (alive) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationMs, getPosition]);

  return (
    <div className="mp-vu" aria-hidden="true">
      {[0, 1].map((c) => (
        <span key={c} className="mp-vu__col">
          {Array.from({ length: SEGMENTS }, (_, s) => (
            <span
              key={s}
              className="mp-vu__seg"
              ref={(el) => {
                segs.current[c * SEGMENTS + s] = el;
              }}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
