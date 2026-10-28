/** Jana's public channels. Perfil and Contacto both list them. */
export type Channel = { label: string; handle: string; href: string };

export const INSTAGRAM: Channel = {
  label: "Instagram",
  handle: "@janab.lack",
  href: "https://www.instagram.com/janab.lack/",
};
export const YOUTUBE: Channel = {
  label: "YouTube",
  handle: "@JanaBlck",
  href: "https://www.youtube.com/@JanaBlck",
};
/** Her one SoundCloud since 2026-10-14 (she merged janablack into it). */
export const SOUNDCLOUD: Channel = {
  label: "SoundCloud",
  handle: "JanaB•",
  href: "https://soundcloud.com/agustina-novoa-758768503",
};

export const CHANNELS: Channel[] = [INSTAGRAM, SOUNDCLOUD, YOUTUBE];

/** Press kit folder (photos, logos, bio). */
export const PRESS_KIT =
  "https://drive.google.com/drive/folders/1hOL6bTLMNfnXfRCeUR70Ae9g_ALiA9zW?hl=es";

/**
 * The tech rider, as a document: what a booker forwards to the venue. It
 * replaced the Tech-Rider section (2026-10-13).
 */
export const TECH_RIDER = "https://drive.google.com/file/d/1LYDcFIzXB7VtsHmqSoBOcBsTd1h8Kyia/view";

/** Her long bio, which Perfil's short one leaves out (asked 2026-10-28). */
export const BIO =
  "https://drive.google.com/drive/folders/18fOgSj13npbFk3lfmlV1RmGo_1RxxAuN?usp=drive_link";
