import Viewfinder from "@/components/Viewfinder";
import ViewfinderBoot from "@/components/ViewfinderBoot";
import HeroFraming from "@/components/HeroFraming";
import MusicaFraming from "@/components/MusicaFraming";
import PerfilFraming from "@/components/PerfilFraming";
import BookingFraming from "@/components/BookingFraming";
import { SITE, SITE_URL } from "@/lib/site";

/**
 * Jana's own booking address: she prefers it to her agency's (Wake Agency).
 * Changed to novoaagust@gmail.com on 2026-10-27.
 */
const CONTACT_EMAILS = ["novoaagust@gmail.com"];

/**
 * Who Jana is, for search engines (schema.org): a MusicGroup is how
 * schema.org describes a music act, solo ones included. sameAs ties her
 * profiles to this page; the email is the booking one Contacto shows.
 */
const ARTIST_LD = {
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  name: SITE.name,
  description: SITE.bio,
  url: SITE_URL.href,
  image: new URL(SITE.ogImage, SITE_URL).href,
  genre: SITE.genres,
  foundingDate: SITE.since,
  foundingLocation: { "@type": "Place", name: SITE.city },
  sameAs: SITE.profiles,
  email: CONTACT_EMAILS[0],
};

/* Sections in the menu's order; FRAMINGS in lib/viewfinder.ts must match. */
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        /* "<" escaped so no string in the data can close the script tag */
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTIST_LD).replace(/</g, "\\u003c") }}
      />
      <Viewfinder>
        <HeroFraming />
        <MusicaFraming />
        <PerfilFraming />
        <BookingFraming emails={CONTACT_EMAILS} />
      </Viewfinder>
      {/* after the Viewfinder: it paints the first frame into it */}
      <ViewfinderBoot />
    </>
  );
}
