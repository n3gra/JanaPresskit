import type { Metadata, Viewport } from "next";
import { Oswald, Oxanium } from "next/font/google";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * Two families only, each a single variable file (H13): Oxanium is the base and
 * the readouts (Perfil's quote in ExtraLight, its values in SemiBold); Oswald
 * is the menu and the LCD clock (Light).
 */
const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["200", "400", "500", "600"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: SITE.title,
  description: SITE.description,
  alternates: { canonical: "/" },
  robots: { index: SITE.indexable, follow: SITE.indexable },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: "/",
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: "Jana pasando música, con su logo en rojo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: [SITE.ogImage],
  },
};

/* The browser's bars match the black around the eyepiece. */
export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /* suppressHydrationWarning: ViewfinderBoot sets the --eye-* variables
       here before React hydrates. */
    <html lang="es" className={`${oxanium.variable} ${oswald.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
