"use client";

import { useEffect, useState } from "react";
import { cachedPeaks, loadPeaks, type Peaks } from "./levels";

/** Peaks for a set, or null until they arrive (or if they never do). Shared cache. */
export function usePeaks(id: string): Peaks | null {
  const [state, setState] = useState<{ id: string; peaks: Peaks | null }>(() => ({
    id,
    peaks: cachedPeaks(id),
  }));

  useEffect(() => {
    let alive = true;
    loadPeaks(id).then((peaks) => {
      if (alive) setState({ id, peaks });
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return state.id === id ? state.peaks : cachedPeaks(id);
}
