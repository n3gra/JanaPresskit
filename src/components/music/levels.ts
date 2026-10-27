export const SEGMENTS = 19;
export const BARS = 72;

/**
 * A set's own published peaks, as SoundCloud serves them (1800 samples, one per
 * ~1-4 s depending on the set), fetched from /peaks/<id>.json on demand.
 *  - fine: the 1800 samples on the meter's 0..1 scale (see `stretch`)
 *  - bars: the same, reduced to BARS peaks for the timeline
 */
export type Peaks = { fine: Float32Array; bars: number[] };

const cache = new Map<string, Peaks>();
const inflight = new Map<string, Promise<Peaks | null>>();

export const cachedPeaks = (id: string) => cache.get(id) ?? null;

function quantile(sorted: number[], q: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
}

/**
 * Mastered techno lives near the ceiling: min-max scaling leaves the meter
 * pinned and motionless. This is a monotone display curve that lifts the set's
 * own quantiles onto the meter (10 % -> .25, median -> .6, 90 % -> .9,
 * 99.5 % -> full). It changes the scale, never the order, so every relative
 * peak is preserved and nothing is synthesised.
 */
function stretch(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const xs = [
    sorted[0],
    quantile(sorted, 0.1),
    quantile(sorted, 0.5),
    quantile(sorted, 0.9),
    quantile(sorted, 0.995),
  ];
  const ys = [0, 0.25, 0.6, 0.9, 1];
  for (let i = 1; i < xs.length; i++) if (xs[i] <= xs[i - 1]) xs[i] = xs[i - 1] + 1e-6;

  return Float32Array.from(samples, (v) => {
    if (v >= xs[4]) return 1;
    let i = 1;
    while (v > xs[i]) i++;
    const t = Math.min(Math.max((v - xs[i - 1]) / (xs[i] - xs[i - 1]), 0), 1);
    return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
  });
}

export function loadPeaks(id: string): Promise<Peaks | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(id);
  if (pending) return pending;

  const p = fetch(`/peaks/${id}.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((json: { samples: number[] }) => {
      const fine = stretch(json.samples);
      const size = fine.length / BARS;
      const bars = Array.from({ length: BARS }, (_, i) => {
        let peak = 0;
        for (let j = Math.floor(i * size); j < Math.floor((i + 1) * size); j++) {
          if (fine[j] > peak) peak = fine[j];
        }
        return peak;
      });
      const peaks = { fine, bars };
      cache.set(id, peaks);
      return peaks;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));

  inflight.set(id, p);
  return p;
}

/**
 * Meter level 0..1 for `ms` into a set of `durationMs`, linearly interpolated
 * between the two nearest samples. `offset` reads a few samples ahead, which is
 * how the second channel differs from the first: the data is mono, there is no
 * real stereo to show.
 */
export function levelAt(fine: Float32Array | null, ms: number, durationMs: number, offset = 0) {
  if (!fine || durationMs <= 0) return 0.05;
  const f = Math.min(Math.max(ms / durationMs, 0), 1);
  const x = Math.min(f * (fine.length - 1) + offset, fine.length - 1);
  const i = Math.floor(x);
  const j = Math.min(i + 1, fine.length - 1);
  return 0.05 + 0.95 * (fine[i] + (fine[j] - fine[i]) * (x - i));
}
