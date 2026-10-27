"use client";

import { useEffect, useRef } from "react";

/**
 * The tube's glass for touch screens, drawn once into a canvas at CSS-pixel
 * resolution and stretched by the GPU (globals.css, .crt-canvas).
 *
 * Why a canvas: a CSS layer is rasterized at the screen's device pixels, and
 * on a dense phone (Galaxy S23 Ultra: ~1440x3088) the full-screen texture
 * layers ran the GPU out of tile memory, so sections showed unpainted blocks
 * mid-travel (2026-10-13, measured over adb). A canvas keeps the size it is
 * given: at CSS pixels it is ~14x smaller, one texture, no tiles. The lines
 * and grain are defined in CSS pixels anyway; stretched they only soften, as
 * a tube does.
 *
 * Still: drawn on mount and on resize, never animated. Decoration only.
 */
export default function CrtCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !window.matchMedia("(hover: none)").matches) return;

    const draw = () => {
      const w = Math.ceil(window.innerWidth);
      const h = Math.ceil(window.innerHeight);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // grain: half the specks light, half dark, mostly faint (as noise.webp, at 8%)
      const grain = ctx.createImageData(w, h);
      const px = grain.data;
      for (let i = 0; i < px.length; i += 4) {
        const v = Math.random() > 0.5 ? 255 : 0;
        px[i] = px[i + 1] = px[i + 2] = v;
        px[i + 3] = Math.pow(Math.random(), 2.2) * 255 * 0.08;
      }
      ctx.putImageData(grain, 0, 0);

      // scanlines on top: one dark line every 3px
      ctx.fillStyle = "rgb(0 0 0 / 0.16)";
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return <canvas ref={ref} className="crt-canvas" aria-hidden="true" />;
}
