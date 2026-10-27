import Image from "next/image";

/**
 * The turntable, as one composition measured against the colour disc: every
 * layer's box is a fixed fraction of it (see .mp-disc in music.css), so a
 * family only sets the disc's size and position. Bottom to top: plate photo,
 * colour wash (per set), spindle hub, the rotating groove texture, the two
 * red rings. Decoration: it may bleed past the safe zone into the curve.
 *
 * Both images load eagerly: Archivo is the section after the hero, and lazy
 * they were fetched and decoded in the middle of the first travel, which a
 * phone showed as unpainted blocks (checkerboarding, 2026-10-13 recording).
 */
export default function Disc() {
  return (
    <div className="mp-disc fx" aria-hidden="true">
      <Image
        src="/music/disc.webp"
        alt=""
        width={1445}
        height={808}
        loading="eager"
        unoptimized
        className="mp-disc__plate"
      />
      <span className="mp-disc__color mp-color" />
      <span className="mp-disc__hub mp-hub" />
      <Image
        src="/music/disc-texture.webp"
        alt=""
        width={740}
        height={747}
        loading="eager"
        unoptimized
        className="mp-disc__texture mp-texture"
      />
      <span className="mp-disc__ring mp-disc__ring--inner" />
      <span className="mp-disc__ring mp-disc__ring--outer" />
    </div>
  );
}
