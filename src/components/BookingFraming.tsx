import "./contacto/contacto.css";
import { PRESS_KIT, TECH_RIDER } from "@/lib/channels";
import SectionStage from "./SectionStage";
import CopyEmail from "./contacto/CopyEmail";

/** A document that opens in a new tab: a plain link, not an item_contact. */
function DocLink({ href, children }: { href: string; children: string }) {
  return (
    <li>
      <a className="ct-link" href={href} target="_blank" rel="noopener noreferrer">
        {children} ↗<span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
    </li>
  );
}

/**
 * Contacto, drawn on the shared SectionStage (Figma `Contact` 536:541). Its
 * own round glass, the ringed lens and the red ground belong to the eyepiece
 * (FRAMINGS in lib/viewfinder.ts); the menu crosses the middle of the glass
 * here (SiteMenu). The booking addresses under their label, each copied by a
 * tap, then the press folder and the tech rider (next to booking, where a
 * booker needs it) as links.
 */
export default function BookingFraming({ emails }: { emails: string[] }) {
  return (
    <section id="booking" aria-label="Contacto" className="relative min-h-[100dvh]">
      <h2 className="sr-only">Contacto</h2>

      <div className="ct-scene">
        <SectionStage className="ct-stage">
          <div className="stage-safe ct-grid">
            <div className="ct-rows">
              <dl className="ct-group">
                <dt>Contrataciones</dt>
                <CopyEmail emails={emails} />
              </dl>
              {/* The documents name themselves: a label over each only repeated it. */}
              <ul className="ct-group ct-links">
                <DocLink href={PRESS_KIT}>Material de prensa</DocLink>
                <DocLink href={TECH_RIDER}>Tech rider</DocLink>
              </ul>
            </div>
          </div>
        </SectionStage>
      </div>
    </section>
  );
}
