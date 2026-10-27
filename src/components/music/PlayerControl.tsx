"use client";

import { useState } from "react";
import type { SetRecord } from "@/lib/sets";
import { hms, shortClock } from "./format";
import SeekBar from "./SeekBar";
import { usePeaks } from "./usePeaks";
import { PlayKey, StepKey } from "./TransportKeys";
import VolumeSlider from "./VolumeSlider";
import Vumetro from "./Vumetro";

type Props = {
  set: SetRecord;
  playing: boolean;
  /** play asked for, not sounding yet */
  pending: boolean;
  /** the last play never started */
  stalled: boolean;
  ready: boolean;
  position: number;
  duration: number;
  volume: number;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onSeek: (ms: number) => void;
  onVolume: (value: number) => void;
  getPosition: () => number;
};

/** The hardware unit: LCD readout, fader + level meter, and the three keys. */
export default function PlayerControl({
  set,
  playing,
  pending,
  stalled,
  ready,
  position,
  duration,
  volume,
  onToggle,
  onStep,
  onSeek,
  onVolume,
  getPosition,
}: Props) {
  // time under the pointer while dragging the timeline; the LCD shows it instead of the clock
  const [scrub, setScrub] = useState<number | null>(null);
  const peaks = usePeaks(set.id);
  const total = duration > 0 ? duration : set.minutes * 60_000;

  return (
    <div className="mp-control">
      <div className="mp-control__top">
        <div className="mp-lcd">
          <div className="mp-lcd__clock">
            {/* while a play waits on SoundCloud the clock says so, like a deck
                reading the tape; "SIN SEÑAL" if it never started */}
            {pending ? (
              <span className="mp-lcd__time mp-lcd__status">
                Cargando
                <span className="mp-lcd__dots" aria-hidden="true">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            ) : stalled ? (
              <span className="mp-lcd__time mp-lcd__status">Sin señal</span>
            ) : (
              <span className="mp-lcd__time">{hms(scrub ?? position)}</span>
            )}
            <span className="mp-lcd__total" title="Duración del set">
              {shortClock(total)}
            </span>
          </div>
          <span className="mp-lcd__title">{set.title}</span>
          {/* the same news for screen readers */}
          <span className="sr-only" role="status">
            {pending ? `Cargando ${set.title}` : stalled ? `No se pudo cargar ${set.title}` : ""}
          </span>
          <span className="mp-lcd__meta">
            <span>{set.source}</span>
            {set.tag && (
              <>
                <span aria-hidden="true">*</span>
                <span>{set.tag}</span>
              </>
            )}
          </span>
          <SeekBar
            position={position}
            duration={duration}
            disabled={!ready || duration <= 0}
            bars={peaks?.bars ?? null}
            onSeek={onSeek}
            onScrub={setScrub}
          />
        </div>

        <div className="mp-audio">
          <VolumeSlider value={volume} onChange={onVolume} />
          <Vumetro
            setId={set.id}
            playing={playing && !pending}
            durationMs={total}
            getPosition={getPosition}
          />
        </div>
      </div>

      <div className="mp-keys">
        <StepKey dir="prev" onClick={() => onStep(-1)} />
        <PlayKey playing={playing} busy={pending} ready={ready} title={set.title} onClick={onToggle} />
        <StepKey dir="next" onClick={() => onStep(1)} />
      </div>
    </div>
  );
}
