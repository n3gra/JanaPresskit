import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* One page: the sections are anchors inside it, not URLs of their own. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL.href, changeFrequency: "monthly", priority: 1 }];
}
