import Image from "next/image";
import "./perfil/perfil.css";
import { INSTAGRAM, SOUNDCLOUD, YOUTUBE } from "@/lib/channels";
import PerfilCarousel from "./perfil/PerfilCarousel";
import SectionStage from "./SectionStage";

const FACTS = [
  ["Desde", "2020"],
  ["Base", "Mendoza, Argentina"],
];

const LINKS = [INSTAGRAM, YOUTUBE, SOUNDCLOUD];

/** The cut-out as Figma draws it on each family: [family, width, height] of the export. */
const PHOTOS = [
  ["desktop", 937, 1557],
  ["surface", 937, 1568],
  ["tablet", 916, 1488],
  ["ipad", 938, 1565],
  ["iphone", 612, 1022],
] as const;

/**
 * Perfil, drawn on the shared SectionStage (Figma section `Perfil` 514:291,
 * one frame per family). Its ground and veil belong to the eyepiece glass
 * (FRAMINGS.perfil.sheen), so they crossfade instead of sliding in. Here,
 * bottom to top: the tilted feed, the cut-out, then the two groups of facts
 * on the safe zone's grid. The feed and the cut-out are decoration and bleed
 * past the glass. Sizes are Figma pixels per family in perfil/perfil.css.
 */
export default function PerfilFraming() {
  return (
    <section id="perfil" aria-label="Perfil" className="relative min-h-[100dvh]">
      <h2 className="sr-only">Perfil</h2>

      <div className="pf-scene">
        <SectionStage className="pf-stage">
          <PerfilCarousel />

          {/* Figma frames her differently on each screen (its own crop and
              scale in the same box), so each family has its own export and
              shows only that one. Lazy: a hidden one is never fetched. */}
          {PHOTOS.map(([bp, w, h]) => (
            <div key={bp} className="pf-photo fx" data-for={bp}>
              <Image
                src={`/images/perfil/jana-${bp}.webp`}
                alt="Jana con anteojos oscuros y camiseta de fútbol americano"
                width={w}
                height={h}
                loading="lazy"
                unoptimized
              />
            </div>
          ))}

          <div className="stage-safe pf-grid">
            <dl className="pf-group pf-group--facts">
              {FACTS.map(([term, value]) => (
                <div key={term} className="pf-row">
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <dl className="pf-group pf-group--links">
              {LINKS.map((c) => (
                <div key={c.label} className="pf-row">
                  <dt>{c.label}</dt>
                  <dd>
                    {/* the arrow, as in Contacto: it leaves the site */}
                    <a href={c.href} target="_blank" rel="noopener noreferrer">
                      {c.handle} ↗<span className="sr-only"> (se abre en otra pestaña)</span>
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </SectionStage>
      </div>
    </section>
  );
}
