import { INSTAGRAM, SOUNDCLOUD, YOUTUBE } from "./channels";

/**
 * What search engines and link previews read about the site (layout.tsx
 * metadata, robots.ts, sitemap.ts, the JSON-LD in page.tsx), in one place.
 */
export const SITE = {
  name: "Jana",
  title: "Jana — DJ digital y vinilo · Mendoza, Argentina",
  /**
   * For results and link previews: her bio (below) cut to the ~155
   * characters a result shows, plus the city, which bookers search by.
   * No genre on purpose (2026-10-14): she plays digital and vinyl and does
   * not want to be boxed into one.
   */
  description:
    "Jana, DJ y curadora de Mendoza, Argentina. Grooves hipnóticos, ritmos de alta energía y atmósferas envolventes, en digital y vinilo. Sets y booking.",
  /** Her own words (2026-10-14), "curadora" for "selectora" (Yamina), for the structured data. */
  bio: "Jana es DJ y curadora musical. Su propuesta combina grooves hipnóticos, ritmos de alta energía y atmósferas envolventes, explorando la música electrónica desde una búsqueda sonora versátil que trasciende géneros y formatos, tanto digital como en vinilo.",
  genres: ["Música electrónica"],
  since: "2020",
  city: "Mendoza, Argentina",
  /** Her public profiles. */
  profiles: [INSTAGRAM.href, SOUNDCLOUD.href, YOUTUBE.href],
  /** Link preview, 1200×630 (made by Auditoria/mediciones/scripts/og.py). */
  ogImage: "/og.jpg",
  /** Launched on janablack.com (2026-10-27): open to search engines. */
  indexable: true,
};

/**
 * The site's address, for absolute URLs (Open Graph needs them). Hosted on
 * Netlify since 2026-10-27, which does not set Vercel's env var, so the
 * domain is fixed here.
 */
export const SITE_URL = new URL("https://janablack.com");
