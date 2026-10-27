"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const PHOTOS = Array.from({ length: 11 }, (_, i) => String(i + 1).padStart(2, "0"));

/** The blurred column starts mid-feed, so the two never show the same photo side by side. */
const OFFSET = 5;
const BLURRED = [...PHOTOS.slice(OFFSET), ...PHOTOS.slice(0, OFFSET)];

/**
 * Perfil's feed (Figma `carousel_group`, H18): two tilted columns of Jana's
 * photos drifting up along their own slant, one sharp and one that defocuses
 * toward its foot.
 *
 * Each column lists its photos twice and travels exactly one list, so the loop
 * is seamless; the travel is a transform, which the compositor runs without
 * touching layout or paint. The defocus is baked into 144px files stretched to
 * the tile, not a `filter: blur()` re-applied on every frame (H15): a second,
 * defocused copy of the track runs in step over the sharp one, under a mask
 * fixed to the column, so a photo blurs as it travels down it.
 *
 * The drift only runs while Perfil is on screen. Decorative: the photographs
 * are a mood, not content, so the column is hidden from assistive tech.
 *
 * Today the photos are a curated set; synced to Instagram later (H18), only
 * PHOTOS changes.
 */
export default function PerfilCarousel() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.playing = String(entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="pf-feed fx" aria-hidden="true" data-playing="false">
      <div className="pf-feed__col pf-feed__col--sharp">
        <div className="pf-feed__track">
          {[...PHOTOS, ...PHOTOS].map((n, i) => (
            <div key={i} className="pf-feed__tile">
              <Image
                src={`/images/perfil/carousel/carousel-${n}.webp`}
                alt=""
                fill
                sizes="(max-width: 519px) 150px, (max-width: 1279px) 220px, 320px"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="pf-feed__col pf-feed__col--blur">
        <div className="pf-feed__track">
          {[...BLURRED, ...BLURRED].map((n, i) => (
            <div key={i} className="pf-feed__tile">
              <Image
                src={`/images/perfil/carousel/carousel-${n}.webp`}
                alt=""
                fill
                sizes="(max-width: 519px) 150px, (max-width: 1279px) 220px, 320px"
              />
            </div>
          ))}
        </div>
        {/* The same track, defocused, faded in down the column: Figma's
            progressive blur (sharp to a third, full at the foot). */}
        <div className="pf-feed__haze">
          <div className="pf-feed__track">
            {[...BLURRED, ...BLURRED].map((n, i) => (
              <div key={i} className="pf-feed__tile">
                {/* eslint-disable-next-line @next/next/no-img-element -- 144px, already as small as it gets */}
                <img src={`/images/perfil/carousel/carousel-${n}-blur.webp`} alt="" loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
