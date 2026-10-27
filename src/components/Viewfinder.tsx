"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Breakpoint,
  FRAMINGS,
  Ground,
  RECT,
  Shape,
  breakpointFor,
  designWidth,
  eyepieceBox,
  eyepiecePath,
  eyepieceRim,
  insetFor,
  mixGround,
  mixShape,
  shapeDistance,
  shapeFor,
} from "@/lib/viewfinder";
import CrtCanvas from "./CrtCanvas";
import ScreenHud, { frameOutline } from "./ScreenHud";
import SiteMenu from "./SiteMenu";
import useActiveFraming from "./useActiveFraming";
import useSheetTravel from "./useSheetTravel";

type Props = {
  children: React.ReactNode;
};

/** How long the eyepiece takes to change shape. Long enough to be watched. */
const MORPH_MS = 900;

/** Contacto's red ring, from the desktop Figma (536:542): its gradient's axes
    at the ring (0.587 of them), in pixels on a 1026x800 window, as [x, y]
    rows. Not a circle, and slightly sheared, which tilts it. Every family
    keeps this shape and only scales it (stretched to a phone's window it was
    a thin oval the rows ran across); see paint(). */
const LENS_RING = [
  [422.6, -17.5],
  [-20.8, 400.9],
];
const LENS_WINDOW = [1026, 800];

/** The rim's shading strokes (.glass-edge__shade), widest first: twelve faint
    steps, so the falloff reads smooth on a light glass (five showed as rings). */
const RIM_SHADES = Array.from({ length: 12 }, (_, i) => 0.05 + 0.95 * Math.pow(1 - i / 11, 1.6));

/** Slow in, slow out: the movement reads as deliberate rather than snapped. */
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function Viewfinder({ children }: Props) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuScale = useRef(0);
  const stageKey = useRef("");
  const groundRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const shapeRef = useRef<Shape>(shapeFor("desktop", 0));
  const targetRef = useRef<Shape>(shapeFor("desktop", 0));
  const fromShape = useRef<Shape>(shapeFor("desktop", 0));
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const kickRef = useRef<(() => void) | null>(null);
  const firstTarget = useRef(true);

  /* The colour the glass is tinted, on the same clock as the shape. */
  const tintRef = useRef<HTMLDivElement | null>(null);
  const groundNow = useRef<Ground>(FRAMINGS[0].ground);
  const groundTarget = useRef<Ground>(FRAMINGS[0].ground);
  const fromGround = useRef<Ground>(FRAMINGS[0].ground);
  /* Contacto's lens (FRAMINGS[].lens): how much of it shows, same clock. */
  const lensRef = useRef<HTMLDivElement | null>(null);
  const lensNow = useRef(0);
  const lensTarget = useRef(0);
  const fromLens = useRef(0);
  /* Perfil's sheen (FRAMINGS[].sheen): the same, on the same clock. */
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const sheenNow = useRef(0);
  const sheenTarget = useRef(0);
  const fromSheen = useRef(0);

  const bpRef = useRef<Breakpoint>("desktop");
  const [bp, setBp] = useState<Breakpoint>("desktop");
  /* The family React has actually rendered. data-bp can't tell any more:
     ViewfinderBoot writes it before React is here. */
  const renderedBp = useRef<Breakpoint | null>(null);
  const [still, setStill] = useState(false);

  const { active } = useActiveFraming(scrollRef);
  /* The sheet travels on its own clock; the wheel, the keyboard, a swipe and
     the menu all go through the same movement. */
  const { goTo } = useSheetTravel(scrollRef);
  /* The rim's curve (.glass-edge): the outline it draws, and its scale. */
  const edgeRef = useRef<SVGSVGElement | null>(null);
  const edgePathRef = useRef<SVGPathElement | null>(null);
  /* The HUD's frame (ScreenHud): its outline follows the glass on screen. */
  const hudOutlineRef = useRef<SVGSVGElement | null>(null);
  const hudOutlineKey = useRef("");

  /* ---- which drawings apply, and reduced motion -------------------------- */
  useEffect(() => {
    const mqStill = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const next = breakpointFor(window.innerWidth, window.innerHeight);
      bpRef.current = next;
      setBp(next);
      setStill(mqStill.matches);
    };
    sync();
    window.addEventListener("resize", sync);
    mqStill.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      mqStill.removeEventListener("change", sync);
    };
  }, []);

  /* What depends on the stage may show (see [data-ready] in globals.css) once
     both are true: its box is measured, and the DOM is already rendered for
     the measured family — otherwise the menu showed as the desktop row for a
     frame and then jumped into the phone's list. */
  const markReady = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || stage.dataset.ready !== undefined || !stageKey.current) return;
    if (renderedBp.current === bpRef.current) stage.dataset.ready = "";
  }, []);

  /* ---- paint the eyepiece ------------------------------------------------ */
  const paint = useCallback((shape: Shape) => {
    const stage = stageRef.current;
    if (!stage) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;

    const inset = insetFor(bpRef.current);
    if (groundRef.current)
      groundRef.current.style.clipPath = `path("${eyepiecePath(shape, inset, w, h, 1)}")`;
    const outline = eyepiecePath(shape, inset, w, h);
    if (scrollRef.current) scrollRef.current.style.clipPath = `path("${outline}")`;
    // The rim's curve: the same window as one outline (the clip's two
    // subpaths would draw their overlap as seams); widths scale in CSS.
    edgePathRef.current?.setAttribute("d", eyepieceRim(shape, inset, w, h));

    if (tintRef.current) {
      const [r, g, bl, a] = groundNow.current;
      const tint = tintRef.current.style;
      tint.backgroundColor = `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(bl)})`;
      tint.opacity = a.toFixed(3);
    }
    const box = eyepieceBox(shape, inset, w, h);
    if (sheenRef.current) sheenRef.current.style.opacity = sheenNow.current.toFixed(3);
    if (lensRef.current) {
      const l = lensNow.current;
      const lens = lensRef.current.style;
      lens.opacity = l.toFixed(3);
      if (l > 0) {
        // The ring of 100 (globals.css) to the window, centred on it, scaled
        // by whichever side asks more. On desktop the width wins and the ring
        // is Figma's. On a phone the height does, at 0.89 of it (Figma's phone,
        // 536:618): the ring shows above and below and runs past the sides;
        // at the full height it hid under the glass's own edge.
        const [[xx, xy], [yx, yy]] = LENS_RING;
        const s = Math.max(box.w / LENS_WINDOW[0], (0.89 * box.h) / LENS_WINDOW[1]) / 100;
        const m = [xx, yx, xy, yy].map((v) => (v * s).toFixed(4)).join(",");
        lens.setProperty(
          "--lens-m",
          `translate(${(box.x + box.w / 2).toFixed(1)}px, ${(box.y + box.h / 2).toFixed(1)}px) ` +
            `matrix(${m},0,0) translate(-150px, -150px)`,
        );
        lens.setProperty("--lens-soft", (0.05 + 0.3 * (1 - l)).toFixed(3));
      }
    }

    /* The stage: the hero's window, which every framing but Booking shares.
       Sections lay out at Figma size inside it (SectionStage) and it is fitted
       to the eyepiece with one transform, so a morph never re-lays them out.
       Its box only changes with the viewport, so it is written only then.
       The menu scales with the same window, not the current shape's, so it
       keeps one size across sections (Booking's narrower glass would shrink it). */
    const stageBox = eyepieceBox(shapeFor(bpRef.current, 0), inset, w, h);
    const scale = stageBox.w / designWidth(bpRef.current);
    if (menuRef.current && Math.abs(scale - menuScale.current) > 0.0005) {
      menuScale.current = scale;
      menuRef.current.style.setProperty("--menu-scale", scale.toFixed(4));
    }
    /* The hull: the gap from the screen's edge to the nearest glass of any
       section. Booking's lens is taller than the stage on landscape screens
       (Figma: 984 on a 864 stage), so the HUD's frame (globals.css,
       .hud__frame) halves this gap, not the stage's, and no glass reaches it. */
    const hull = FRAMINGS.reduce(
      (m, _, i) => {
        const b = eyepieceBox(shapeFor(bpRef.current, i), inset, w, h);
        return { x: Math.min(m.x, b.x), y: Math.min(m.y, b.y) };
      },
      { x: stageBox.x, y: stageBox.y },
    );
    const stageVars = [
      `${stageBox.x.toFixed(2)}px`,
      `${stageBox.y.toFixed(2)}px`,
      scale.toFixed(5),
      `${designWidth(bpRef.current)}px`,
      // Portrait screens taller than the drawing stretch the window, so the
      // stage grows in design pixels too rather than leaving the extra empty.
      `${(stageBox.h / scale).toFixed(2)}px`,
      `${Math.max(0, hull.x).toFixed(2)}px`,
      `${Math.max(0, hull.y).toFixed(2)}px`,
    ];
    if (stageVars.join() !== stageKey.current) {
      stageKey.current = stageVars.join();
      const s = stage.style;
      s.setProperty("--stage-x", stageVars[0]);
      s.setProperty("--stage-y", stageVars[1]);
      s.setProperty("--stage-scale", stageVars[2]);
      s.setProperty("--stage-w", stageVars[3]);
      s.setProperty("--stage-h", stageVars[4]);
      s.setProperty("--hull-x", stageVars[5]);
      s.setProperty("--hull-y", stageVars[6]);
    }
    // The frame's outline, written only when it changes (a morph or a resize).
    const svg = hudOutlineRef.current;
    if (svg) {
      const frameHull = { x: Math.max(0, hull.x), y: Math.max(0, hull.y) };
      const d = frameOutline(w, h, frameHull, box.x);
      if (d !== hudOutlineKey.current) {
        hudOutlineKey.current = d;
        svg.setAttribute("viewBox", `0 0 ${(w - frameHull.x).toFixed(1)} ${(h - frameHull.y).toFixed(1)}`);
        svg.firstElementChild?.setAttribute("d", d);
      }
    }
    markReady();

    edgeRef.current?.style.setProperty("--short", `${Math.min(box.w, box.h).toFixed(1)}px`);
    const root = stage.style;
    root.setProperty("--eye-w", `${box.w}px`);
    root.setProperty("--eye-h", `${box.h}px`);
    root.setProperty("--eye-x", `${box.x}px`);
    root.setProperty("--eye-y", `${box.y}px`);
    document.documentElement.style.setProperty("--eye-w", `${box.w}px`);
    document.documentElement.style.setProperty("--eye-h", `${box.h}px`);
    document.documentElement.style.setProperty("--eye-x", `${box.x}px`);
    document.documentElement.style.setProperty("--eye-y", `${box.y}px`);
  }, [markReady]);

  // The family's render has landed in the DOM: maybe ready now.
  useEffect(() => {
    renderedBp.current = bp;
    markReady();
  }, [bp, markReady]);

  /* ---- the morph loop ----------------------------------------------------
     The morph runs on a clock, not on a per-frame fraction. The old version
     eased 11% of the remaining distance per frame, so a 120Hz screen morphed
     at twice the speed of a 60Hz one, and an exponential approach lurches at
     the start and then crawls invisibly at the end. A duration and a curve
     make the change identical everywhere, and slow enough to read. */
  useEffect(() => {
    const tick = () => {
      const tgt = targetRef.current;
      const t = still
        ? 1
        : Math.min(1, (performance.now() - startRef.current) / MORPH_MS);
      const e = easeInOut(t);

      shapeRef.current = mixShape(fromShape.current, tgt, e);
      groundNow.current = mixGround(fromGround.current, groundTarget.current, e);
      lensNow.current = fromLens.current + (lensTarget.current - fromLens.current) * e;
      sheenNow.current = fromSheen.current + (sheenTarget.current - fromSheen.current) * e;
      paint(shapeRef.current);

      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };

    const kick = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
    };

    kickRef.current = kick;
    kick();

    /* No polling timer here on purpose: every paint writes --eye-* on :root
       (still read by the sections not yet on the stage) and re-clips the glass
       and the content, which repaints them. Nothing to spend on while idle, so
       the loop is woken only by a new target or a resize. */
    const onResize = () => {
      paint(shapeRef.current);
      kick();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [paint, still]);

  /* ---- target shape follows the framing in view --------------------------
     Portrait is not a special case any more: it is the same two rectangles,
     stacked instead of side by side, drawn at that breakpoint.

     The morph restarts from wherever the shape currently is, so interrupting
     one mid-flight carries its position forward instead of snapping. */
  useEffect(() => {
    /* bpRef, not the `bp` state: the viewport is measured before this runs, but
       the state catches up one render later. Reading the state, the first
       target on a phone was the desktop outline, and the phone then morphed to
       its own on load. `bp` stays a dependency so a resize re-targets. */
    const shape = shapeFor(bpRef.current, active);
    const next = still ? { ...RECT, ratio: shape.ratio } : shape;
    /* Two framings may share one outline, so comparing shapes alone would skip
       a colour change between them. Nothing to do only if BOTH are unchanged. */
    const ground = FRAMINGS[active].ground;
    const lens = FRAMINGS[active].lens ? 1 : 0;
    const sheen = FRAMINGS[active].sheen ? 1 : 0;
    const sameShape = shapeDistance(next, targetRef.current) < 0.0001;
    const sameGround =
      ground.every((v, i) => v === groundTarget.current[i]) &&
      lens === lensTarget.current &&
      sheen === sheenTarget.current;

    /* The first target is whatever this viewport actually is, so it is taken
       rather than travelled to — otherwise a phone would open on the desktop
       outline and spend 900ms crawling to its own. It is used up here, before
       the early return: on desktop the first target already equals the default,
       and the unused flag used to snap the first real morph (hero -> Música). */
    const first = firstTarget.current;
    firstTarget.current = false;
    if (sameShape && sameGround) return;

    fromShape.current = first ? next : shapeRef.current;
    fromGround.current = first ? ground : groundNow.current;
    targetRef.current = next;
    groundTarget.current = ground;
    fromLens.current = first ? lens : lensNow.current;
    lensTarget.current = lens;
    fromSheen.current = first ? sheen : sheenNow.current;
    sheenTarget.current = sheen;
    startRef.current = first ? 0 : performance.now();
    kickRef.current?.();
  }, [active, bp, still]);

  return (
    /* suppressHydrationWarning: ViewfinderBoot has already set data-bp (and
       the stage's variables) to the real family before React hydrates. */
    <div
      ref={stageRef}
      data-bp={bp}
      suppressHydrationWarning
      className="fixed inset-0 overflow-hidden bg-black"
    >
      {/* the focusing screen ------------------------------------------------
          Glass and content start fully clipped (`inset(50%)`): the real outline
          needs the viewport, so it is only known once paint() runs, and until
          then the page used to show edge to edge. The inline path overrides it. */}
      <div
        ref={groundRef}
        data-early="ground"
        suppressHydrationWarning /* ViewfinderBoot's clip-path */
        className="absolute inset-0 mat-screen will-change-[clip-path] [clip-path:inset(50%)]"
      >
        {/* Halftone and grain overlays removed (H15): the textures get defined
            with the final design pass, ideally baked into the ground image.
            The engraved focusing-screen circles went too (design, 2026-10-13):
            stretched with the glass, they showed as warped rings mid-travel. */}

        {/* The glass takes the colour of what it is looking at.
            Last inside the ground on purpose: it covers the screen texture,
            the reticle and the grain, which is exactly how the red read when
            it was painted inside the Música section. When the LensFX overlay
            is finally exported, the grain moves back on top of this. */}
        <div ref={tintRef} className="absolute inset-0 opacity-0" aria-hidden="true" />
        <div ref={lensRef} className="glass-lens absolute opacity-0" aria-hidden="true" />
        <div ref={sheenRef} className="glass-sheen opacity-0" aria-hidden="true">
          <div className="glass-sheen__veil" />
        </div>
      </div>

      {/* --- the menu --------------------------------------------------------
          It precedes the content in the DOM so the section nav, and Contacto in
          it, are the first things a keyboard or screen reader reaches: on a
          press kit, the way to book must never sit behind six sets of tab stops. */}
      <SiteMenu
        active={active}
        portrait={bp === "ipad" || bp === "iphone"}
        compact={bp === "ipad" || bp === "iphone" || bp === "tablet"}
        narrow={bp === "iphone"}
        goTo={goTo}
        rootRef={menuRef}
      />

      {/* the content, seen through the eyepiece ------------------------------ */}
      <main
        ref={scrollRef}
        data-early="sheet"
        suppressHydrationWarning /* ViewfinderBoot's clip-path */
        /* overflow-anchor: the SoundCloud iframe resizes late, and scroll
           anchoring would shunt the framing out of the eyepiece when it does */
        className="sheet absolute inset-0 h-full overflow-y-auto overflow-x-hidden [overflow-anchor:none] will-change-[clip-path] [clip-path:inset(50%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </main>

      {/* the tube's curve at the eyepiece's rim (globals.css, .glass-edge):
          shading, a colour fringe and a highlight drawn from the same outline
          as the clip, so they follow the morph. Over the content, under the
          menu. Redrawn only when the outline changes (paint). */}
      <svg ref={edgeRef} className="glass-edge" aria-hidden="true" focusable="false">
        <defs>
          <path ref={edgePathRef} id="eye-outline" />
          <clipPath id="eye-inside">
            <use href="#eye-outline" />
          </clipPath>
          <linearGradient id="eye-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g clipPath="url(#eye-inside)" fill="none">
          {/* shading: wide and faint to narrow and darker, adding up to a
              falloff toward the rim, with no blur */}
          {RIM_SHADES.map((k) => (
            <use key={k} href="#eye-outline" className="glass-edge__shade" style={{ "--k": k } as React.CSSProperties} />
          ))}
          {/* the fringe: red and blue, pulled apart sideways */}
          <use href="#eye-outline" className="glass-edge__fringe glass-edge__fringe--r" />
          <use href="#eye-outline" className="glass-edge__fringe glass-edge__fringe--b" />
          {/* the highlight along the top of the bulge */}
          <use href="#eye-outline" className="glass-edge__sheen" />
        </g>
      </svg>

      {/* the VCR's on-screen display in the black around the glass */}
      <ScreenHud outlineRef={hudOutlineRef} />

      {/* touch screens: the same glass as one low-resolution canvas */}
      <CrtCanvas />

      {/* the monitor's glass over the whole screen, menu and surround too:
          scanlines, grain, tracking lines and a slow roll (globals.css, .crt).
          Decoration only: it never takes a click. */}
      <div className="crt" aria-hidden="true">
        <div className="crt__lines" />
        <div className="crt__grain" />
        <div className="crt__roll" />
        <div className="crt__track" />
      </div>
    </div>
  );
}
