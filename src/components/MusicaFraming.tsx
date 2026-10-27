"use client";

import { useRef } from "react";
import { preconnect } from "react-dom";
import "./music/music.css";
import { SETS } from "@/lib/sets";
import SectionStage from "./SectionStage";
import Disc from "./music/Disc";
import PlayerControl from "./music/PlayerControl";
import PlayerVisor from "./music/PlayerVisor";
import SetQueue from "./music/SetQueue";
import { WIDGET_SRC, useSoundCloud } from "./music/useSoundCloud";
import { useWidgetArming } from "./music/useWidgetArming";

/**
 * The whole Música screen, drawn on the shared SectionStage: the turntable as
 * decoration, and the queue, visor and control placed on the safe zone's grid.
 * The red ground belongs to the eyepiece glass (FRAMINGS in lib/viewfinder.ts).
 * Behaviour lives in `useSoundCloud`; sizes are Figma pixels per family in
 * music.css. See docs/secciones/musica.md.
 */
export default function MusicaFraming() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /* The widget loads late (useWidgetArming); the handshakes with its hosts
     start now, so the late load does not also pay for them. */
  preconnect("https://w.soundcloud.com");
  preconnect("https://widget.sndcdn.com");
  const armed = useWidgetArming(sectionRef);
  const sc = useSoundCloud(iframeRef, armed);
  const { current } = sc;

  return (
    <section
      ref={sectionRef}
      id="musica"
      aria-label="Archivo de música"
      className="relative min-h-[100dvh]"
    >
      <h2 className="sr-only">Sets</h2>

      <div className="mp-scene" data-disc={current.disc} data-playing={sc.playing && !sc.pending}>
        <SectionStage className="mp-stage">
          <Disc />

          {/* the safe zone's grid places the queue, the visor and the control */}
          <div className="stage-safe mp-player">
            <SetQueue sets={SETS} current={sc.index} onSelect={sc.select} />
            <PlayerVisor set={current} />
            <PlayerControl
              set={current}
              playing={sc.playing}
              pending={sc.pending}
              stalled={sc.stalled}
              ready={sc.ready}
              position={sc.position}
              duration={sc.duration}
              volume={sc.volume}
              onToggle={sc.toggle}
              onStep={sc.step}
              onSeek={sc.seek}
              onVolume={sc.setVolume}
              getPosition={sc.getPosition}
            />
          </div>
        </SectionStage>
      </div>

      {/* kept at full size and moved out of view: a 1px iframe gets
          throttled, and display:none stops the widget responding */}
      <div className="pointer-events-none absolute h-0 w-full overflow-hidden" aria-hidden="true">
        {armed && (
          <iframe
            ref={iframeRef}
            title={`Reproductor de SoundCloud — ${current.title}`}
            src={WIDGET_SRC(SETS[0].url)}
            width="100%"
            height="60"
            frameBorder="0"
            /* the widget probes encrypted-media; refused, it logs a
               permissions-policy error on every load */
            allow="autoplay; encrypted-media"
            tabIndex={-1}
            className="block w-full"
          />
        )}
      </div>
    </section>
  );
}
