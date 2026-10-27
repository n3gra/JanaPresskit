import Image from "next/image";
import type { SetRecord } from "@/lib/sets";
import { minutesLabel } from "./format";

/**
 * The big visor: the set that is playing, printed like a cassette card. It is
 * keyed by set so a new one "enters" instead of swapping in place.
 */
export default function PlayerVisor({ set }: { set: SetRecord }) {
  return (
    <div className="mp-cassette">
      <div className="mp-cassette__inner" key={set.id}>
        <div className="mp-cassette__content">
          <span className="mp-cassette__dur">{minutesLabel(set.minutes)}</span>
          <span className="mp-cassette__cover">
            <Image
              src={set.artColor}
              alt={`Portada de ${set.title}`}
              fill
              sizes="20vw"
              className="mp-cover"
            />
          </span>
          <span className="mp-cassette__title">{set.title}</span>
        </div>
        <p className="mp-cassette__side">
          <span>{set.source}</span>
          {set.tag && (
            <>
              <span aria-hidden="true">*</span>
              <span>{set.tag}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
