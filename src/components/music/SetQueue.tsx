"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SetRecord } from "@/lib/sets";
import { vars } from "./css";
import { minutesLabel } from "./format";

type Props = {
  sets: SetRecord[];
  current: number;
  onSelect: (index: number) => void;
};

/** The most queue slots the stage shows before the rest slides out of view. */
const MOST = 5;
/** Fewer than this and the queue stops reading as a queue. */
const FEWEST = 2;
/** Focus by how many slots show: the far end blurs, as long as there is one. */
const TIERS: Record<number, string[]> = {
  2: ["clear", "clear"],
  3: ["clear", "clear", "soft"],
  4: ["clear", "clear", "clear", "soft"],
  5: ["clear", "clear", "clear", "soft", "far"],
};
/** A swipe this long changes the set; shorter is a tap on an item. */
const SWIPE = 40;

/**
 * The queue of sets still to come. The set that is playing is not listed: it
 * lives in the visor. Position 0 is the next one to play and sits closest to
 * the controls; further ones stack upward and blur out. Anything past the
 * last slot is hidden, so a longer catalogue only needs more sets.
 *
 * Portrait screens cross the disc with it, so there it shows only the slots
 * that fit under the disc's hub: on a short phone five covered the whole disc.
 *
 * On a touch screen the box also takes a swipe: the list follows the finger,
 * so down brings the next set into the player and up brings back the last.
 *
 * DOM order never changes (keys stay put) so every slot can transition to its
 * new position when the queue advances.
 */
export default function SetQueue({ sets, current, onSelect }: Props) {
  const n = sets.length;
  const listRef = useRef<HTMLUListElement | null>(null);
  const [shown, setShown] = useState(MOST);

  useEffect(() => {
    const list = listRef.current;
    const player = list?.parentElement;
    const stage = player?.parentElement;
    const disc = stage?.querySelector<HTMLElement>(".mp-disc");
    if (!list || !player || !stage || !disc) return;

    // offset* are layout pixels: the stage's scale does not reach them.
    const measure = () => {
      const bp = stage.closest<HTMLElement>("[data-bp]")?.dataset.bp;
      if (bp !== "iphone" && bp !== "ipad") return setShown(MOST);
      const item = list.querySelector<HTMLElement>(".mp-queue__slot")?.offsetHeight ?? 0;
      if (!item) return;
      const bottom = player.offsetTop + list.offsetTop + list.offsetHeight;
      const hub = disc.offsetTop + disc.offsetHeight * 0.65;
      const fit = Math.floor((bottom - hub) / item);
      setShown(Math.max(FEWEST, Math.min(MOST, fit)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  /* ---- swipe ------------------------------------------------------------ */
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) < SWIPE || Math.abs(dy) < Math.abs(dx)) return;
    swiped.current = true;
    onSelect(current + (dy > 0 ? 1 : -1));
  };
  // The finger lifted on an item: its click would pick that one as well.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <ul
      ref={listRef}
      className="mp-queue fx"
      aria-label="Próximos sets"
      data-drag=""
      style={vars({ "--shown": shown })}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      onClickCapture={onClickCapture}
    >
      {sets.map((set, i) => {
        // ring position: 0 = next up … n-1 = the set that is playing
        const p = (i - current - 1 + n) % n;
        const hidden = p >= shown || p === n - 1;
        const tier = hidden ? "hidden" : TIERS[shown][p];

        return (
          <li
            key={set.id}
            className="mp-queue__slot"
            data-tier={tier}
            style={vars({ "--p": p })}
            inert={hidden}
          >
            <button
              type="button"
              className="mp-item"
              onClick={() => onSelect(i)}
              aria-label={`Reproducir ${set.title}`}
            >
              <span className="mp-item__thumb">
                <Image src={set.art} alt="" fill sizes="10vw" className="mp-cover" />
              </span>
              <span className="mp-item__text">
                <span className="mp-item__title">{set.title}</span>
                <span className="mp-item__meta">
                  <span className="mp-item__source">{set.source}</span>
                  {set.tag && (
                    <>
                      <span className="mp-item__source" aria-hidden="true">
                        *
                      </span>
                      <span>{set.tag}</span>
                    </>
                  )}
                  <span className="mp-item__dur">{minutesLabel(set.minutes)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
