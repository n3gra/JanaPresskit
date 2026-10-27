import type { MetadataRoute } from "next";
import { SITE, SITE_URL } from "@/lib/site";

/*
 * Crawlers may always read the page. Until launch (SITE.indexable) the
 * page's own noindex meta (layout.tsx) keeps it out of results: a Disallow
 * here would hide that meta from Google and stop link previews (LinkedIn's
 * bot honours robots.txt), 2026-10-15. The sitemap is offered after launch.
 */
export default function robots(): MetadataRoute.Robots {
  return SITE.indexable
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: new URL("/sitemap.xml", SITE_URL).href }
    : { rules: { userAgent: "*", allow: "/" } };
}
