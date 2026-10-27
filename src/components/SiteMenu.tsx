"use client";

import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FRAMINGS } from "@/lib/viewfinder";
import { heroIntro } from "@/lib/heroIntro";
import JanaMark from "./JanaMark";

type Props = {
  /** index into FRAMINGS of the section in view */
  active: number;
  /** portrait eyepiece (iPad / iPhone drawings) */
  portrait: boolean;
  /**
   * The bar does not fit the safe zone (portrait, and a tablet held
   * landscape): outside the hero the menu is a button over the section's
   * name, and the full list opens as a dialog.
   */
  compact: boolean;
  /** the iPhone drawing, where the active label has to shrink to fit */
  narrow: boolean;
  goTo: (id: string) => void;
  /** the Viewfinder writes --menu-scale here */
  rootRef: RefObject<HTMLDivElement | null>;
};

/** The logo stands for the first framing; the rest are listed by name. */
const SECTIONS = FRAMINGS.slice(1);

/* ---- the opening -----------------------------------------------------------
   Figma's Menu_open prototype: closed (a 32px square) → wait 0.5s → grows along
   the row in 0.5s → wait 0.3s → grows across in 0.63s → wait 0.15s → settles
   in 0.15s. The steps are kept as fractions of one progress value `p`, so the
   same drawing plays on any clock: the intro's (first visit), or a short one
   of its own when the menu closes in one place and reopens in another.
   Portrait runs the steps with the axes swapped, since its list stacks. */
const STEPS = [0.5, 0.5, 0.3, 0.63, 0.15, 0.15];
const TOTAL = STEPS.reduce((a, b) => a + b, 0);
const at = (n: number) => STEPS.slice(0, n).reduce((a, b) => a + b, 0) / TOTAL;
const ALONG = [at(1), at(2)];
const ACROSS = [at(3), at(4)];
const SEED = 32;

/** Closing runs the opening backwards, quicker: it clears the way. */
const CLOSE_MS = 450;
const OPEN_MS = 800;
/** A picked item shows as active this long before the dialog lets go. */
const PICK_MS = 320;
/** The full-screen list opens and closes with the same steps, from the button. */
const DIALOG_OPEN_MS = 700;
const DIALOG_CLOSE_MS = 450;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function reveal(p: number, w: number, h: number, portrait: boolean) {
  const along = easeOut(clamp01((p - ALONG[0]) / (ALONG[1] - ALONG[0])));
  const across = easeInOut(clamp01((p - ACROSS[0]) / (ACROSS[1] - ACROSS[0])));
  const [alongFull, acrossFull] = portrait ? [h, w] : [w, h];
  const a = SEED + (alongFull - SEED) * along;
  const c = SEED + (acrossFull - SEED) * across;
  const [cw, ch] = portrait ? [c, a] : [a, c];
  return { x: Math.max(0, (w - cw) / 2), y: Math.max(0, (h - ch) / 2), seed: 1 - along, logo: across };
}

function Burger() {
  return (
    <svg viewBox="0 0 30 20" width="30" height="20" aria-hidden="true">
      <path d="M0 1h30M0 10h30M0 19h30" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Where the menu sits and what it shows. `mid`: Contacto draws the bar across
    the middle of its glass, as part of the composition. The compact menu's
    name is not part of the layout: a new section only changes the name
    (CompactName), it does not close and reopen the menu. */
type Place = "hero" | "bar" | "mid";
type Layout = { place: Place; portrait: boolean; compact: boolean; active: number };
const CONTACTO = FRAMINGS.findIndex((f) => f.id === "booking");
const placeOf = (active: number, compact: boolean): Place =>
  active === 0 ? "hero" : active === CONTACTO && !compact ? "mid" : "bar";
const keyOf = (l: Layout) => `${l.place}|${l.portrait}|${l.compact}`;

/* ---- the compact menu's name ------------------------------------------------
   Closing and reopening on every section moved too much on the phone
   (feedback, 2026-10-20). Now the chip stays: the old name fades out, the new
   one fades in, and the chip eases to the new word's width. */
const NAME_MS = 400;
const NAME_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function CompactName({ label }: { label: string }) {
  const [now, setNow] = useState(label);
  const [was, setWas] = useState<string | null>(null);
  if (label !== now) {
    setWas(now);
    setNow(label);
  }
  const chipRef = useRef<HTMLParagraphElement | null>(null);
  const wasRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const chip = chipRef.current;
    const old = wasRef.current;
    if (!chip || !old || was === null) return;
    const still = reducedMotion();
    // The old name, still laid out at its own width, is where the chip starts.
    const from = old.offsetWidth;
    const to = chip.offsetWidth;
    if (!still && from !== to) {
      chip.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: NAME_MS, easing: NAME_EASE });
    }
    const t = window.setTimeout(() => setWas(null), still ? 0 : NAME_MS);
    return () => window.clearTimeout(t);
  }, [now, was]);

  return (
    <p
      ref={chipRef}
      className="menu-item"
      data-state="active"
      data-changing={was !== null ? "" : undefined}
      aria-hidden="true"
    >
      <span key={now} className="menu-name__now">
        {now}
      </span>
      {was !== null && (
        <span key={was} ref={wasRef} className="menu-name__was">
          {was}
        </span>
      )}
    </p>
  );
}

type Mode =
  | { kind: "intro" }
  | { kind: "close"; start: number; from: number }
  | { kind: "open"; start: number }
  | { kind: "idle" };

/**
 * The site's navigation, as drawn in Figma (Menu_open, Menu_Item, and the
 * menu_section_active / mobile frames of sections `hero` and `MusicArchive`).
 *
 * - Hero: the menu opens over the video with the logo as the active item — a
 *   row in landscape, a list in portrait.
 * - Any other section, landscape: one row at the foot of the eyepiece; the
 *   section in view is the big red item.
 * - Any other section, where the row does not fit (portrait, tablet held
 *   landscape): a menu button and the active section's name — stacked and
 *   centred at the head of the eyepiece in portrait, in one row at the top
 *   left of the safe zone in landscape; the button opens the full list as a
 *   dialog.
 *
 * When the menu has to move (hero ↔ the rest) it never slides across the
 * picture: it closes where it is, and reopens in its new place.
 *
 * Deliberate departures from the Figma prototype, all for feel and access:
 * hover is 200ms (it was 1.02s), every item clicks on one timing (they had two),
 * the hover chip grows on both sides instead of leaving 28px empty on the left,
 * items are spaced by one gap instead of centred in fixed 164px slots, and each
 * one's hit area is 44px tall though the chip still reads 34px.
 */
export default function SiteMenu({ active, portrait, compact, narrow, goTo, rootRef }: Props) {
  const target: Layout = { place: placeOf(active, compact), portrait, compact, active };
  const targetKey = keyOf(target);

  // What is on screen. It trails the target by one close/open.
  const [shown, setShown] = useState<Layout>(target);
  const shownKey = keyOf(shown);
  // Between moves the shown layout follows the live section (a landscape row
  // just restyles its items), so only a real move goes through close/open.
  const view: Layout = shownKey === targetKey ? target : shown;

  const revealRef = useRef<HTMLDivElement | null>(null);
  const seedRef = useRef<HTMLSpanElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const dialogRaf = useRef(0);

  const targetRef = useRef(target);
  const shownKeyRef = useRef(shownKey);
  const wakeRef = useRef<() => void>(() => {});

  /* ---- the reveal driver ----------------------------------------------------
     One rAF loop, woken by the intro's clock, a new target or a resize, and
     asleep whenever the menu is simply open and in place. */
  useEffect(() => {
    let raf = 0;
    let p = 0;
    let size = { w: 0, h: 0 };
    let observed: Element | null = null;
    let mode: Mode =
      targetRef.current.place === "hero" && !heroIntro.isDone() ? { kind: "intro" } : { kind: "idle" };

    const ro = new ResizeObserver(([entry]) => {
      size = { w: entry.contentRect.width, h: entry.contentRect.height };
      wake();
    });

    const apply = () => {
      const el = revealRef.current;
      if (!el) return;
      if (el !== observed) {
        if (observed) ro.unobserve(observed);
        ro.observe(el);
        observed = el;
        size = { w: el.offsetWidth, h: el.offsetHeight };
      }
      if (p >= 1) {
        el.style.clipPath = "none";
        if (seedRef.current) seedRef.current.style.opacity = "0";
        if (logoRef.current) logoRef.current.style.opacity = "";
        return;
      }
      const r = reveal(p, size.w, size.h, targetRef.current.portrait);
      el.style.clipPath = `inset(${r.y}px ${r.x}px ${r.y}px ${r.x}px round 4px)`;
      if (seedRef.current) seedRef.current.style.opacity = r.seed.toFixed(3);
      if (logoRef.current) logoRef.current.style.opacity = r.logo.toFixed(3);
    };

    const tick = () => {
      raf = 0;
      const now = performance.now();
      const moved = keyOf(targetRef.current) !== shownKeyRef.current;
      const still = reducedMotion();

      if (mode.kind === "intro") {
        p = heroIntro.progress(now);
        if (moved) mode = { kind: "close", start: now, from: p };
        else if (p >= 1) mode = { kind: "idle" };
      } else if (mode.kind === "idle") {
        p = 1;
        if (moved) mode = { kind: "close", start: now, from: 1 };
      }
      if (mode.kind === "close") {
        p = still ? 0 : mode.from * (1 - clamp01((now - mode.start) / CLOSE_MS));
        if (p <= 0) {
          // Closed down to the seed: move, and open again from there.
          shownKeyRef.current = keyOf(targetRef.current);
          setShown(targetRef.current);
          mode = { kind: "open", start: now };
        }
      } else if (mode.kind === "open") {
        p = still ? 1 : clamp01((now - mode.start) / OPEN_MS);
        if (moved) mode = { kind: "close", start: now, from: p };
        else if (p >= 1) mode = { kind: "idle" };
      }

      apply();
      if (mode.kind !== "idle") raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;
    const unsubscribe = heroIntro.subscribe(wake);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubscribe();
    };
  }, []);

  // Hand the driver each new target.
  useEffect(() => {
    targetRef.current = { place: placeOf(active, compact), portrait, compact, active };
    wakeRef.current();
  }, [active, portrait, compact]);

  // A new layout element mounted: paint its first frame before anything shows.
  useEffect(() => {
    wakeRef.current();
  }, [shownKey]);

  useEffect(() => {
    const pending = timers.current;
    const raf = dialogRaf;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf.current);
    };
  }, []);

  /* ---- the dialog (compact) ------------------------------------------------- */
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, reducedMotion() ? 0 : ms));
  };

  /* The full-screen list speaks the menu's one language: it is born as the
     32px square on the menu button, grows along (down the screen) and then
     across, and closes back into the button the same way. The items come in
     only once it is open. */
  const animateDialog = (dir: "open" | "close", done?: () => void) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    cancelAnimationFrame(dialogRaf.current);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const b = toggleRef.current?.getBoundingClientRect();
    const cx = b ? b.left + b.width / 2 : W / 2;
    const cy = b ? b.top + b.height / 2 : SEED;
    const dur = reducedMotion() ? 0 : dir === "open" ? DIALOG_OPEN_MS : DIALOG_CLOSE_MS;
    const start = performance.now();
    if (dir === "close") delete dialog.dataset.revealed;

    const frame = () => {
      const k = dur ? clamp01((performance.now() - start) / dur) : 1;
      const p = dir === "open" ? k : 1 - k;
      const along = easeOut(clamp01((p - ALONG[0]) / (ALONG[1] - ALONG[0])));
      const across = easeInOut(clamp01((p - ACROSS[0]) / (ACROSS[1] - ACROSS[0])));
      const top = (cy - SEED / 2) * (1 - along);
      const bottom = (H - cy - SEED / 2) * (1 - along);
      const left = (cx - SEED / 2) * (1 - across);
      const right = (W - cx - SEED / 2) * (1 - across);
      dialog.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round 4px)`;
      if (dir === "open" && p >= ACROSS[1]) dialog.dataset.revealed = "";
      if (k < 1) {
        dialogRaf.current = requestAnimationFrame(frame);
      } else {
        if (dir === "open") dialog.style.clipPath = "none";
        done?.();
      }
    };
    frame();
  };

  const openDialog = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setPicked(null);
    dialog.style.clipPath = "inset(50%)";
    dialog.showModal();
    setOpen(true);
    animateDialog("open");
  };

  const closeDialog = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open || dialog.dataset.closing !== undefined) return;
    dialog.dataset.closing = "";
    animateDialog("close", () => {
      delete dialog.dataset.closing;
      dialog.close();
      dialog.style.clipPath = "";
    });
  };

  // A dialog left open across a resize to a roomy screen has no button to close it.
  useEffect(() => {
    if (!compact) dialogRef.current?.close();
  }, [compact]);

  /* A tap in the list: the item takes the active style first, so the choice
     reads; then the list lets go while the sheet travels, and the compact menu
     reopens on the new section's name. */
  const pick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (picked) return;
    // the channel already on air: nothing to tune, just close
    if (id === FRAMINGS[active].id) {
      closeDialog();
      return;
    }
    setPicked(id);
    later(() => {
      closeDialog();
      goTo(id);
    }, PICK_MS);
  };

  const follow = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    goTo(id);
  };

  const compactBar = view.compact && view.place === "bar";

  return (
    <div ref={rootRef} className="contents">
      <nav
        aria-label="Secciones"
        className="site-menu"
        data-place={view.place}
        data-orient={view.portrait ? "portrait" : "landscape"}
        data-compact={compactBar ? "" : undefined}
        data-narrow={narrow ? "" : undefined}
      >
        {/* Keyed by place only: in the compact menu a new section only
            changes the name (CompactName); the button and the chip stay put. */}
        <div key={`${view.place}|${view.portrait}|${view.compact}`} className="site-menu__scale">
          {compactBar ? (
            <div className="site-menu__compact">
              <button
                ref={toggleRef}
                type="button"
                className="menu-toggle"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="site-menu-dialog"
                onClick={openDialog}
              >
                <Burger />
                <span className="sr-only">Menú — estás en {FRAMINGS[view.active].label}</span>
              </button>
              <div key={shownKey} ref={revealRef} className="site-menu__reveal">
                <span ref={seedRef} className="site-menu__seed" aria-hidden="true" />
                <CompactName label={FRAMINGS[view.active].label} />
              </div>
            </div>
          ) : (
            <div ref={revealRef} className="site-menu__reveal">
              <span ref={seedRef} className="site-menu__seed" aria-hidden="true" />
              <ul className="site-menu__list">
                <li>
                  <a
                    ref={logoRef}
                    href="#hero"
                    onClick={(e) => follow(e, "hero")}
                    aria-current={view.active === 0 ? "page" : undefined}
                    data-state={view.place === "hero" ? "active" : "enable"}
                    className="menu-item menu-logo"
                  >
                    <JanaMark variant="bold" label="Jana — inicio" />
                  </a>
                </li>
                {SECTIONS.map((f, k) => (
                  <li key={f.id}>
                    <a
                      href={`#${f.id}`}
                      onClick={(e) => follow(e, f.id)}
                      aria-current={k + 1 === view.active ? "page" : undefined}
                      data-state={k + 1 === view.active ? "active" : "enable"}
                      className="menu-item"
                    >
                      {f.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </nav>

      {compact && (
        <dialog
          id="site-menu-dialog"
          ref={dialogRef}
          aria-label="Menú"
          className="menu-dialog"
          onCancel={(e) => {
            // Esc: leave the same way the close button does.
            e.preventDefault();
            closeDialog();
          }}
          onClose={(e) => {
            delete e.currentTarget.dataset.revealed;
            setOpen(false);
            setPicked(null);
          }}
        >
          {/* A TV's channel selector (design, 2026-10-13): numbered channels
              on the grid's margin, the one on air in red behind a cursor,
              the set's readout at head and foot, and the same tube glass as
              the rest of the screen (the dialog sits in the top layer, above
              the page's .crt, so it carries its own). */}
          <div className="menu-dialog__inner">
            <div className="menu-dialog__head">
              <button type="button" className="menu-toggle" onClick={closeDialog}>
                <Cross />
                <span className="sr-only">Cerrar menú</span>
              </button>
            </div>
            <div className="menu-dialog__body">
            {/* the mark leads the channels, big, and takes you home */}
            <a href="#hero" onClick={(e) => pick(e, "hero")} className="menu-dialog__mark">
              <JanaMark variant="bold" label="Jana — inicio" />
            </a>
            <ul className="menu-dialog__list">
              {FRAMINGS.map((f, k) => {
                const onAir = picked ? picked === f.id : k === active;
                return (
                  <li key={f.id} style={{ "--i": k } as React.CSSProperties}>
                    <a
                      href={`#${f.id}`}
                      onClick={(e) => pick(e, f.id)}
                      aria-current={k === active ? "page" : undefined}
                      data-on-air={onAir ? "" : undefined}
                      className="channel"
                    >
                      <span className="channel__cursor" aria-hidden="true">
                        ▶
                      </span>
                      <span className="channel__name">{f.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            </div>
            <p className="menu-dialog__foot" aria-hidden="true">
              <span>PLAY ▶</span>
              <span>{picked ? FRAMINGS.find((f) => f.id === picked)?.label : FRAMINGS[active].label}</span>
            </p>
          </div>
          <div className="crt menu-dialog__crt" aria-hidden="true">
            <div className="crt__lines" />
            <div className="crt__grain" />
          </div>
        </dialog>
      )}
    </div>
  );
}
