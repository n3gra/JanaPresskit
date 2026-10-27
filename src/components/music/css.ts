import type { CSSProperties } from "react";

/** Typed escape hatch for inline CSS custom properties (`--x`, `--p`, …). */
export const vars = (o: Record<string, string | number>) => o as CSSProperties;
