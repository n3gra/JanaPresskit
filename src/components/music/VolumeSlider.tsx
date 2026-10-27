"use client";

import { useRef } from "react";
import { vars } from "./css";

type Props = { value: number; onChange: (value: number) => void };

/** The thumb's height in design pixels (.mp-vol__thumb). */
const THUMB = 6;

const clamp = (v: number) => Math.min(Math.max(v, 0), 100);

/** Vertical fader: up raises, down lowers. Pointer + keyboard, per the WAI-ARIA slider pattern. */
export default function VolumeSlider({ value, onChange }: Props) {
  const rail = useRef<HTMLDivElement | null>(null);

  const fromPointer = (clientY: number) => {
    const el = rail.current;
    if (!el) return;
    // The rail's height changes per family and the stage is scaled, so the
    // pointer is read in the rail's own design pixels.
    const box = el.getBoundingClientRect();
    const height = el.offsetHeight;
    const along = ((clientY - box.top) / box.height) * height;
    onChange(clamp((1 - (along - THUMB / 2) / (height - THUMB)) * 100));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = {
      ArrowUp: 5,
      ArrowRight: 5,
      ArrowDown: -5,
      ArrowLeft: -5,
      PageUp: 20,
      PageDown: -20,
    };
    if (e.key in step) {
      e.preventDefault();
      onChange(clamp(value + step[e.key]));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(100);
    }
  };

  return (
    <div className="mp-vol">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.9193 20.6056V18.8988C15.488 18.4459 16.7639 17.5759 17.7471 16.2889C18.7302 15.002 19.2218 13.5411 19.2218 11.906C19.2218 10.271 18.7329 8.80726 17.7553 7.51476C16.7776 6.22225 15.4989 5.35511 13.9193 4.91334V3.20648C15.974 3.67046 17.6477 4.71026 18.9402 6.3259C20.2327 7.94153 20.8789 9.80158 20.8789 11.906C20.8789 14.0105 20.2327 15.8706 18.9402 17.4862C17.6477 19.1018 15.974 20.1416 13.9193 20.6056ZM2.98267 14.9136V8.9482H6.95961L11.9308 3.97702V19.8848L6.95961 14.9136H2.98267ZM13.5879 16.0403V7.78817C14.4551 8.09754 15.1413 8.63335 15.6468 9.3956C16.1522 10.1578 16.4049 11.003 16.4049 11.9309C16.4049 12.8423 16.1494 13.6777 15.6385 14.4371C15.1275 15.1967 14.444 15.7311 13.5879 16.0403ZM10.2736 8.1031L7.68863 10.6053H4.63981V13.2565H7.68863L10.2736 15.7754V8.1031Z"
        />
      </svg>

      <div
        ref={rail}
        className="mp-vol__rail"
        role="slider"
        tabIndex={0}
        aria-label="Volumen"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        style={vars({ "--v": value / 100 })}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientY);
        }}
      >
        <span className="mp-vol__track" />
        <span className="mp-vol__thumb" />
      </div>

      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.95959 14.9137V8.94829H10.9365L15.9077 3.97711V19.8849L10.9365 14.9137H6.95959ZM8.61674 13.2566H11.6656L14.2506 15.7755V8.10319L11.6656 10.6054H8.61674V13.2566Z"
        />
      </svg>
    </div>
  );
}
