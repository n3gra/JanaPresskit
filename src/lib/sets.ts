/**
 * Real sets, read from Jana's SoundCloud. Titles, durations, dates, genres and
 * cover art are hers — nothing here is invented.
 *
 * One account since 2026-10-14: she merged her two (janablack and this one)
 * into "JanaB•" and deleted some sets on the way, which left three of the
 * old six as dead links. Only this account is used now.
 */

/** Her SoundCloud display name, as the account shows it. */
const ACCOUNT = "JanaB•";

export type SetRecord = {
  id: string;
  title: string;
  /** the account it lives on, as shown under the title */
  source: typeof ACCOUNT;
  url: string;
  /** minutes, as published */
  minutes: number;
  year: number;
  /** the genre tag she set herself, when she set one */
  tag?: string;
  /** her own words on the upload, verbatim */
  note?: string;
  /** cover for the queue: greyscaled and graded, like the rest of the archive */
  art: string;
  /** the same cover in colour, for the player visor (SoundCloud artwork, resized only) */
  artColor: string;
  /**
   * Which of the five disc colours this set wears (index into the palette in
   * music.css). Four sets, so no colour repeats. Orange and lime both read as
   * yellow, so only one of them is used. The ring: blue, green, orange, purple.
   */
  disc: 0 | 1 | 2 | 3 | 4;
};

/* Newest first. Data read from SoundCloud's widget API on 2026-10-14. */
export const SETS: SetRecord[] = [
  {
    id: "laspalapas",
    title: "Las Palapas",
    source: ACCOUNT,
    url: "https://soundcloud.com/agustina-novoa-758768503/las-palapas-3-10-warm-up-eze",
    minutes: 132,
    year: 2026,
    note: "Warm up — Eze Ramirez · 3/10.",
    art: "/art/laspalapas.webp",
    artColor: "/art/laspalapas-color.webp",
    disc: 0,
  },
  {
    id: "hypnotic",
    title: "Hypnotic & Experimental",
    source: ACCOUNT,
    url: "https://soundcloud.com/agustina-novoa-758768503/hypnotic-techno-opening-victoria-engel-manglar-byjana",
    minutes: 122,
    year: 2024,
    tag: "Techno",
    note: "Opening — Victoria Engel · Manglar.",
    art: "/art/hypnotic.webp",
    artColor: "/art/hypnotic-color.webp",
    disc: 1,
  },
  {
    id: "lun4tica002",
    title: "Lun4tica002",
    source: ACCOUNT,
    url: "https://soundcloud.com/agustina-novoa-758768503/lun4tica",
    minutes: 60,
    year: 2023,
    art: "/art/lun4tica002.webp",
    artColor: "/art/lun4tica002-color.webp",
    disc: 3,
  },
  {
    id: "d3mencial001",
    title: "D3mencial001",
    source: ACCOUNT,
    url: "https://soundcloud.com/agustina-novoa-758768503/d3mencial001",
    minutes: 35,
    year: 2022,
    art: "/art/d3mencial001.webp",
    artColor: "/art/d3mencial001-color.webp",
    disc: 2,
  },
];

/**
 * Published length, to the minute. SoundCloud publishes these rounded, so
 * rendering seconds here would fabricate precision the source does not have —
 * the transport shows the widget's real clock instead.
 */
export function runtime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
