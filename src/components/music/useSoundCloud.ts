"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { SETS } from "@/lib/sets";

type Widget = {
  bind: (event: string, handler: (payload?: { currentPosition: number }) => void) => void;
  load: (url: string, options: Record<string, unknown>) => void;
  play: () => void;
  pause: () => void;
  isPaused: (cb: (paused: boolean) => void) => void;
  seekTo: (ms: number) => void;
  setVolume: (volume: number) => void;
  getDuration: (cb: (ms: number) => void) => void;
};

declare global {
  interface Window {
    SC?: {
      Widget: ((el: HTMLIFrameElement) => Widget) & {
        Events: Record<string, string>;
      };
    };
  }
}

const COLOR = "#cf2417";

export const WIDGET_SRC = (url: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}` +
  "&color=%23cf2417&auto_play=false&hide_related=true&show_comments=false" +
  "&show_user=false&show_reposts=false&show_teaser=false&visual=false";

/** How long the key may show what was asked for before the widget confirms it. */
const INTENT_MS = 5000;

/**
 * How long a play may wait for the widget before it is given up (a dead link,
 * no network). On a phone over wifi it took 0.5-2.5 s (2026-10-14).
 */
const PENDING_MS = 15000;

/**
 * Drives the hidden SoundCloud widget. The widget's own chrome is never shown:
 * it only plays audio and reports position. Everything the visitor sees is the
 * authored player.
 *
 * The widget answers a click through the network and an iframe, ~150ms and
 * more. Two consequences, both handled here:
 * - The key shows what was asked for at once (`intent`), and the widget's
 *   events confirm it. Waiting for them, the key sprang back up for that
 *   moment and then sank again: a flicker. If the widget never confirms, the
 *   intent lapses and the key shows the truth again.
 * - Changing set stops playback: the new set loads paused and the visitor
 *   presses play. Every load is numbered, so a late answer from an earlier
 *   load, or an event from the set being replaced, cannot overwrite the state.
 *   Play or pause pressed while a set is loading is only remembered: the
 *   load's callback calls play() once the set is there. Never `auto_play`,
 *   which phones ignore. A paused load ends by asking the widget whether it
 *   plays, rather than assuming.
 *
 * The caller owns the iframe ref and passes it in, so the returned object holds
 * only values and callbacks (nothing ref-shaped to trip react-hooks/refs).
 * `armed` says the iframe is mounted (see useWidgetArming); until then there is
 * nothing to attach to, and the API script is not fetched either.
 */
export function useSoundCloud(iframeRef: RefObject<HTMLIFrameElement | null>, armed: boolean) {
  const [index, setIndex] = useState(0);
  /** What the widget reports. */
  const [playing, setPlaying] = useState(false);
  /** What the visitor just asked for, until the widget confirms it. */
  const [intent, setIntent] = useState<boolean | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [volume, setVolumeState] = useState(100);
  /** Play was asked for and the widget has not confirmed it yet. */
  const [pending, setPending] = useState(false);
  /** The last play was given up: the widget never confirmed it. */
  const [stalled, setStalled] = useState(false);

  const widgetRef = useRef<Widget | null>(null);
  const volumeRef = useRef(100);
  /** Last position the widget reported, so the meter can interpolate between reports. */
  const clockRef = useRef({ ms: 0, at: 0, running: false });
  /** The current load's number, and whether it is still on its way. */
  const loadRef = useRef({ id: 0, loading: false });
  /**
   * Whether the visitor last asked for sound. The widget may only play then:
   * after a change of set it sometimes still reported the replaced set as
   * playing (late, or answering isPaused), and the key lit up over silence.
   */
  const wantRef = useRef(false);
  const intentTimer = useRef(0);
  const pendingTimer = useRef(0);

  /** Waiting on a play, or done waiting (confirmed, cancelled, given up). */
  const wait = useCallback((on: boolean) => {
    window.clearTimeout(pendingTimer.current);
    setPending(on);
    if (on) setStalled(false);
    if (!on) return;
    pendingTimer.current = window.setTimeout(() => {
      // Given up: a late answer must not start the sound behind the visitor's back.
      wantRef.current = false;
      widgetRef.current?.pause();
      setPending(false);
      setStalled(true);
      setIntent(null);
    }, PENDING_MS);
  }, []);

  const ask = useCallback((want: boolean | null) => {
    window.clearTimeout(intentTimer.current);
    setIntent(want);
    if (want !== null) intentTimer.current = window.setTimeout(() => setIntent(null), INTENT_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(intentTimer.current);
      window.clearTimeout(pendingTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!armed) return;
    let cancelled = false;

    const attach = () => {
      if (cancelled || !iframeRef.current || !window.SC) return;
      const w = window.SC.Widget(iframeRef.current);
      const E = window.SC.Widget.Events;
      widgetRef.current = w;

      w.bind(E.READY, () => {
        if (cancelled) return;
        setReady(true);
        w.getDuration((ms) => setDuration(ms));
      });
      // While a set loads, what still arrives belongs to the one being replaced.
      w.bind(E.PLAY, () => {
        if (loadRef.current.loading) return;
        // Nobody asked for sound: an echo of the set that was replaced.
        if (!wantRef.current) {
          w.pause();
          return;
        }
        clockRef.current = { ...clockRef.current, at: performance.now(), running: true };
        setPlaying(true);
        setIntent((i) => (i === true ? null : i));
        wait(false);
      });
      w.bind(E.PAUSE, () => {
        const c = clockRef.current;
        const ms = c.running ? c.ms + (performance.now() - c.at) : c.ms;
        clockRef.current = { ms, at: performance.now(), running: false };
        setPlaying(false);
        setIntent((i) => (i === false ? null : i));
      });
      w.bind(E.FINISH, () => {
        wantRef.current = false;
        wait(false);
        clockRef.current = { ms: 0, at: performance.now(), running: false };
        setPlaying(false);
        setIntent(null);
        setPosition(0);
      });
      w.bind(E.PLAY_PROGRESS, (payload) => {
        if (!payload || loadRef.current.loading) return;
        clockRef.current = { ms: payload.currentPosition, at: performance.now(), running: true };
        setPosition(payload.currentPosition);
      });
    };

    if (window.SC) {
      attach();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = attach;
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [iframeRef, armed, wait]);

  /** Loads a set, paused; the latest load always wins. */
  const load = useCallback(
    (at: number) => {
      wantRef.current = false;
      setIndex(at);
      setPosition(0);
      setDuration(0);
      setPlaying(false);
      ask(null);
      wait(false);
      setStalled(false);
      clockRef.current = { ms: 0, at: performance.now(), running: false };

      const w = widgetRef.current;
      if (!w) return;
      const id = loadRef.current.id + 1;
      loadRef.current = { id, loading: true };
      w.pause();
      // Never auto_play: phones ignore it (no gesture inside the iframe), and
      // the key lit up over silence. The callback calls play() instead.
      w.load(SETS[at].url, {
        auto_play: false,
        show_user: false,
        show_comments: false,
        visual: false,
        color: COLOR,
        callback: () => {
          // A later load has started since: this answer is stale.
          if (loadRef.current.id !== id) return;
          loadRef.current = { id, loading: false };
          w.setVolume(volumeRef.current);
          w.getDuration((ms) => setDuration(ms));
          setReady(true);
          // Play asked for while it loaded: ask now. Its PLAY event confirms it.
          if (wantRef.current) {
            w.play();
            return;
          }
          // Ask, don't assume: events from the load may have been skipped.
          w.isPaused((paused) => {
            if (loadRef.current.id !== id) return;
            // Loaded paused but reported playing: that is the old set talking.
            if (!paused && !wantRef.current) {
              w.pause();
              setPlaying(false);
              return;
            }
            if (!paused) clockRef.current = { ...clockRef.current, at: performance.now(), running: true };
            setPlaying(!paused);
            setIntent((i) => (i === !paused ? null : i));
          });
        },
      });
    },
    [ask, wait],
  );

  /** Changing set stops playback: the new one loads paused (see above). */
  const select = useCallback(
    (next: number) => load((next + SETS.length) % SETS.length),
    [load],
  );

  const toggle = useCallback(() => {
    const w = widgetRef.current;
    if (!w) return;
    // Waiting on a play: the key holds still (more presses would pause it).
    if (pending) return;
    const want = !(intent ?? playing);
    wantRef.current = want;
    ask(want);
    wait(want);
    // Pressed while the set is still loading: the load's callback acts on it.
    // (It used to reload with auto_play, which phones ignore: 2026-10-14,
    // measured on a Galaxy S23 over adb.)
    if (loadRef.current.loading) return;
    if (want) w.play();
    else w.pause();
  }, [intent, playing, pending, ask, wait]);

  const step = useCallback((delta: number) => select(index + delta), [select, index]);

  /** Jump inside the current set. The clock is reset so the meter follows at once. */
  const seek = useCallback((ms: number) => {
    const w = widgetRef.current;
    if (!w) return;
    const target = Math.max(0, ms);
    w.seekTo(target);
    clockRef.current = { ms: target, at: performance.now(), running: clockRef.current.running };
    setPosition(target);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(Math.max(Math.round(v), 0), 100);
    volumeRef.current = clamped;
    setVolumeState(clamped);
    widgetRef.current?.setVolume(clamped);
  }, []);

  const getPosition = useCallback(() => {
    const c = clockRef.current;
    return c.running ? c.ms + (performance.now() - c.at) : c.ms;
  }, []);

  return {
    index,
    current: SETS[index],
    /** What the key and the disc show: the visitor's request until confirmed. */
    playing: pending || (intent ?? playing),
    /** Play asked for, not yet sounding: the LCD says so and the key holds still. */
    pending,
    /** The last play never started (dead link, no network). */
    stalled,
    position,
    duration,
    ready,
    volume,
    select,
    toggle,
    step,
    seek,
    setVolume,
    getPosition,
  };
}
