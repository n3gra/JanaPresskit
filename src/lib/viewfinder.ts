/**
 * The eyepiece shape.
 *
 * Every framing in the design, on every screen, is the SAME construction: the
 * **union of two rounded rectangles** — side by side in landscape, stacked in
 * portrait. Only the eight corner radii change. The numbers below are the Figma
 * numbers. Hero is read from its own screens (section `hero`, 352:925) and
 * Música from `MusicArchive` (317:1636). In landscape every framing but Booking
 * shares the hero's window, so leaving one section for another only moves the
 * corners, never the box. Perfil is derived from the hero's window
 * (see RECT_CORNER). Booking keeps the numbers of the retired `visor page`
 * section until its screen is redone.
 *
 * This replaces an earlier model that blended a superellipse with two circles
 * plus a "dee" parameter and sampled 360 points of r(theta). That approximated
 * — with harder maths — something that is exact and simpler. It also drifted:
 * Archivo was drawn with a superellipse exponent where the design asks for true
 * 364/420px circular corners, so it read squarer than designed.
 *
 * Two subpaths wound the same way inside one `path()` ARE their union under the
 * default nonzero fill rule, so the outline is exact and needs no sampling. The
 * morph is then a plain lerp of the rectangles and their radii, and every
 * in-between state is still a valid union of two rounded rects.
 */

/** A ground colour for the glass: red, green, blue, alpha. */
export type Ground = [number, number, number, number];


export type Framing = {
  id: string;
  /** The section's name, as the menu spells it everywhere. */
  label: string;
  /**
   * What the glass is tinted while this framing is in view.
   *
   * The colour belongs to the instrument, not to the section. Painted inside
   * the section it slid behind fixed glass, so mid-scroll a straight seam cut
   * across the eyepiece and the page read as two stacked sheets. On the glass
   * it cannot seam, because there are no longer two surfaces — it crossfades.
   *
   * Only what the camera SEES is tinted: the black surround and the chrome
   * stay as they are.
   */
  ground: Ground;
  /**
   * The glass also carries Contacto's lens (Figma `Contact` 536:541): a grey
   * centre ringed in red, then black, sized to the window as it morphs. Like
   * the ground, it crossfades, and its ring comes into focus as it does.
   */
  lens?: true;
  /**
   * And Perfil's sheen (Figma `Perfil` 514:291): its ground whitening toward
   * the rim and the veil darkening toward the foot (perfil.css, .glass-sheen).
   * On the glass, not in the section: drawn on the sheet, they slid in with
   * a hard edge between sections; here they crossfade like the ground.
   */
  sheen?: true;
};

/**
 * Four framings of one artist, in the order the menu lists them. Tech-Rider
 * was a fifth until 2026-10-13: the rider is a document now, linked from
 * Contacto (lib/channels.ts).
 */
export const FRAMINGS: Framing[] = [
  // Ink under the footage: bare, the light glass showed for half a second as
  // the footage left and before Archivo came, a pale flash (2026-10-13).
  { id: "hero", label: "Inicio", ground: [13, 13, 13, 1] },
  // "Archivo" everywhere: the full "Archivo de música" ran too long in the
  // portrait menu and the dialog (Yamina, 2026-09-28).
  { id: "musica", label: "Archivo", ground: [242, 0, 0, 1] },
  // Figma's frame fill, #d9d9d9; the sheen goes over it.
  { id: "perfil", label: "Perfil", ground: [217, 217, 217, 1], sheen: true },
  // Ink: what shows past the lens's ring (globals.css, .glass-lens).
  { id: "booking", label: "Contacto", ground: [13, 13, 13, 1], lens: true },
];

/** Two grounds mixed, so a crossfade carries both the colour and its strength. */
export function mixGround(a: Ground, b: Ground, t: number): Ground {
  // A bare ground has no colour of its own, so it borrows the other one's and
  // only fades its alpha. Otherwise every fade would travel through black.
  const from: Ground = a[3] === 0 ? [b[0], b[1], b[2], 0] : a;
  const to: Ground = b[3] === 0 ? [a[0], a[1], a[2], 0] : b;
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ];
}

/* ---- the design, in Figma pixels ----------------------------------------- */

/** Corner radii, clockwise from top-left. 999 means "fully round this end". */
type Radii = [number, number, number, number];

type DesignRect = { x: number; y: number; w: number; h: number; r: Radii };

/** One framing's eyepiece as drawn: the window, and the two rects unioned in it. */
type Design = { win: [number, number]; rects: [DesignRect, DesignRect] };

/** A device the eyepiece was drawn for. `tablet` is a tablet held landscape. */
export type Breakpoint = "desktop" | "surface" | "tablet" | "ipad" | "iphone";

/**
 * The margin the eyepiece leaves around itself, as a fraction of the stage.
 * Fitting each window's ratio inside these reproduces all the drawn windows
 * exactly — including Booking on iPhone, the only one constrained by width
 * rather than height.
 *
 * `tall` is the ratio of the tallest portrait window. Phones come far taller
 * than the drawn 402x874, and keeping the drawn ratio there left the eyepiece
 * floating in black; so on a screen taller than the drawing, every portrait
 * window is stretched by the same factor until the tallest one reaches the
 * margins. Radii are measured against the short side, so the ends stay true
 * semicircles however far the rects stretch.
 */
export type Inset = { x: number; y: number; tall?: number };

const INSET: Record<Breakpoint, Inset> = {
  desktop: { x: 100 / 1920, y: 48 / 1080 },
  surface: { x: 72 / 1440, y: 44 / 960 },
  // Figma draws the window at 56.6 of 1133; rounded with the window to 1020.
  // No framing is drawn taller than 620 here, so y is Surface's margin in
  // proportion, which is what Booking (derived below) needs.
  tablet: { x: 56.5 / 1133, y: 34 / 744 },
  ipad: { x: 40 / 744, y: 64 / 1133, tall: 664 / 1005 },
  iphone: { x: 24 / 402, y: 36 / 874, tall: 354 / 802 },
};

/* Landscape: the two rects sit side by side. Portrait: they stack.
   Perfil has no entry here: it is derived below (RECT_CORNER). */
const DESIGNS: Record<Breakpoint, Record<string, Design>> = {
  // Desktop, frame 1920x1080 (hero: Desktop - 6, 387:301)
  desktop: {
    hero: {
      win: [1720, 864],
      rects: [
        { x: 0, y: 0, w: 1080, h: 864, r: [999, 0, 0, 999] },
        { x: 640, y: 0, w: 1080, h: 864, r: [0, 999, 999, 0] },
      ],
    },
    // music_archive (453:2377)
    musica: {
      win: [1720, 864],
      rects: [
        { x: 0, y: 0, w: 1080, h: 864, r: [80, 0, 0, 80] },
        { x: 640, y: 0, w: 1080, h: 864, r: [0, 999, 999, 0] },
      ],
    },
    booking: {
      win: [1256, 984],
      rects: [
        { x: 0, y: 0, w: 640, h: 984, r: [999, 0, 0, 999] },
        { x: 616, y: 0, w: 640, h: 984, r: [0, 999, 999, 0] },
      ],
    },
  },

  // Surface Pro 8, frame 1440x960 (hero: Surface Pro 8 - 5, 352:2015)
  surface: {
    hero: {
      win: [1296, 800],
      rects: [
        { x: 0, y: 0, w: 840, h: 800, r: [999, 0, 0, 999] },
        { x: 456, y: 0, w: 840, h: 800, r: [0, 999, 999, 0] },
      ],
    },
    // desktop_1440 (306:677)
    musica: {
      win: [1296, 800],
      rects: [
        { x: 0, y: 0, w: 840, h: 800, r: [80, 0, 0, 80] },
        { x: 456, y: 0, w: 840, h: 800, r: [0, 999, 999, 0] },
      ],
    },
    booking: {
      win: [1056, 872],
      rects: [
        { x: 0, y: 0, w: 600, h: 872, r: [999, 0, 0, 999] },
        { x: 456, y: 0, w: 600, h: 872, r: [0, 999, 999, 0] },
      ],
    },
  },

  // Tablet landscape, frame 1133x744. Only Música is drawn (tablet_h, 447:1619:
  // 1019.7x620, rounded). The rest is derived: hero shares Música's window like
  // everywhere else, Perfil scales Surface's 320 by width (1020/1296), and
  // Booking is Surface's drawing at the height ratio (676/872).
  tablet: {
    hero: {
      win: [1020, 620],
      rects: [
        { x: 0, y: 0, w: 661, h: 620, r: [999, 0, 0, 999] },
        { x: 359, y: 0, w: 661, h: 620, r: [0, 999, 999, 0] },
      ],
    },
    musica: {
      win: [1020, 620],
      rects: [
        { x: 0, y: 0, w: 661, h: 620, r: [80, 0, 0, 80] },
        { x: 359, y: 0, w: 661, h: 620, r: [0, 999, 999, 0] },
      ],
    },
    booking: {
      win: [818, 676],
      rects: [
        { x: 0, y: 0, w: 465, h: 676, r: [999, 0, 0, 999] },
        { x: 353, y: 0, w: 465, h: 676, r: [0, 999, 999, 0] },
      ],
    },
  },

  // iPad mini 8.3, frame 744x1133 (hero: iPad mini 8.3 - 5, 352:2206).
  // Portrait rects span the whole window's width: Figma's 663 at 0 and at 1
  // (and 353 over 354 on the iPhone) are rounding, and left a 1px step in the
  // glass's vertical edges (design, 2026-10-13).
  ipad: {
    hero: {
      // Figma draws these 603.2 tall; rounded like the other iPad framings.
      win: [664, 1005],
      rects: [
        { x: 0, y: 0, w: 664, h: 603, r: [999, 999, 0, 0] },
        { x: 0, y: 402, w: 664, h: 603, r: [0, 0, 999, 999] },
      ],
    },
    musica: {
      win: [664, 1005],
      rects: [
        { x: 0, y: 0, w: 664, h: 603, r: [999, 999, 0, 0] },
        { x: 0, y: 402, w: 664, h: 603, r: [0, 0, 80, 80] },
      ],
    },
    booking: {
      win: [664, 866],
      rects: [
        { x: 0, y: 0, w: 664, h: 464, r: [999, 999, 0, 0] },
        { x: 0, y: 402, w: 664, h: 464, r: [0, 0, 999, 999] },
      ],
    },
  },

  // iPhone 17, frame 402x874 (hero: iPhone 17 - 5, 352:1996)
  iphone: {
    hero: {
      win: [354, 802],
      rects: [
        { x: 0, y: 0, w: 354, h: 472, r: [999, 999, 0, 0] },
        { x: 0, y: 330, w: 354, h: 472, r: [0, 0, 999, 999] },
      ],
    },
    musica: {
      win: [354, 802],
      rects: [
        { x: 0, y: 0, w: 354, h: 484, r: [999, 999, 0, 0] },
        { x: 0, y: 318, w: 354, h: 484, r: [0, 0, 80, 80] },
      ],
    },
    booking: {
      win: [354, 482],
      rects: [
        { x: 0, y: 0, w: 354, h: 280, r: [999, 999, 0, 0] },
        { x: 0, y: 202, w: 354, h: 280, r: [0, 0, 999, 999] },
      ],
    },
  },
};

/**
 * Perfil's outline: the hero's window as a plain rounded rectangle (it was
 * Tech-Rider's too, until that section left). It is drawn once (perfil
 * 453:2251, desktop: 240 on a 864 short side) and kept as that proportion, so every
 * family derives its corner from the same number instead of a hand-set one.
 * Yamina, 2026-09-28 (it replaced a 364 from the retired Archivo drawing).
 */
const RECT_CORNER = 240 / 864;
const SHARES_PERFILS_OUTLINE = "perfil";

function roundedRect({ win, rects: [a, b] }: Design): Design {
  const r = Math.round(Math.min(...win) * RECT_CORNER);
  const landscape = win[0] >= win[1];
  return {
    win,
    rects: landscape
      ? [{ ...a, r: [r, 0, 0, r] }, { ...b, r: [0, r, r, 0] }]
      : [{ ...a, r: [r, r, 0, 0] }, { ...b, r: [0, 0, r, r] }],
  };
}

for (const bp of Object.keys(DESIGNS) as Breakpoint[]) {
  DESIGNS[bp].perfil = roundedRect(DESIGNS[bp].hero);
}

/* ---- the geometry ------------------------------------------------------------
   Everything that turns a viewport into an eyepiece, in one self-contained
   function. It is called here for the app, AND serialised as-is into the boot
   script (ViewfinderBoot.tsx), which paints the first frame before React has
   loaded — so both are the same code, never a copy.
   Because it is serialised, its body must not reach outside itself: no
   imports, no module names, nothing a bundler would lift into a helper
   (spread, destructuring). Its inputs come in as arguments. */

type Box = { w: number; h: number; x: number; y: number };

export function makeGeometry(max: { w: number; h: number }, squeeze: number) {
  /**
   * Radii that fit their rectangle, the way Figma (and CSS border-radius) fit
   * them: if two neighbouring corners add up to more than their side, every
   * corner shrinks by the same factor. A 999 on one side of a 640x984 rect is
   * then a full semicircle of 492, as Contacto draws it; capping each corner at
   * half the short side (320) squared its ends off.
   */
  function fitRadii(w: number, h: number, r: Radii): Radii {
    const room = (side: number, a: number, b: number) => (a + b > side ? side / (a + b) : 1);
    const f = Math.min(room(w, r[0], r[1]), room(w, r[3], r[2]), room(h, r[0], r[3]), room(h, r[1], r[2]));
    return [r[0] * f, r[1] * f, r[2] * f, r[3] * f];
  }

  /**
   * Which set of drawings a viewport belongs to.
   *
   * Landscape is chosen by proportion first: a design scales uniformly inside its
   * family, so what matters is the shape of the screen, not its width. 1366x768
   * is 1920x1080 at 0.71 and belongs with it (by width it used to fall into
   * Surface and sat in wide black margins); a phone held landscape lands there
   * too. 1.64 sits between 16:9 (1.78) and Surface's 3:2. Among the 3:2-ish
   * screens, a tablet is too small for the menu bar to read, so it gets its own
   * drawing with the compact menu.
   */
  function breakpointFor(w: number, h: number): Breakpoint {
    if (w < h) return w < 520 ? "iphone" : "ipad";
    if (w / h >= 1.64) return "desktop";
    return w < 1280 ? "tablet" : "surface";
  }

  /** The eyepiece box inside a stage of `w` x `h`, keeping the drawn margins. */
  function eyepieceBox(shape: Shape, inset: Inset, w: number, h: number): Box {
    const maxW = Math.min(w, max.w) * (1 - inset.x * 2);
    const maxH = Math.min(h, max.h) * (1 - inset.y * 2);
    let bw = maxW;
    let bh = bw / shape.ratio;
    if (bh > maxH) {
      bh = maxH;
      /* A portrait screen shorter than the drawing (a phone under its browser
         bars) used to narrow every tall window to keep its ratio: ~44px side
         margins where Figma draws 24, while short Booking kept the 24. Keep
         the drawn margins and give up height instead, up to `squeeze` times
         wider than drawn, so a near-square portrait screen still reads true. */
      bw = inset.tall ? Math.min(maxW, bh * shape.ratio * squeeze) : bh * shape.ratio;
    }
    // A portrait screen taller than the drawing: stretch, never squeeze.
    if (inset.tall) bh = Math.min(maxH, bh * Math.max(1, (maxH * inset.tall) / maxW));
    return { w: bw, h: bh, x: (w - bw) / 2, y: (h - bh) / 2 };
  }

  /** One rounded rectangle, wound clockwise. */
  function rectPath(x: number, y: number, w: number, h: number, radii: Radii) {
    const r = fitRadii(w, h, radii.map((v) => Math.max(0, v)) as Radii);
    const tl = r[0];
    const tr = r[1];
    const br = r[2];
    const bl = r[3];
    const n = (v: number) => v.toFixed(1);
    return (
      `M${n(x + tl)} ${n(y)}` +
      `H${n(x + w - tr)}` +
      (tr ? `A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}` : "") +
      `V${n(y + h - br)}` +
      (br ? `A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}` : "") +
      `H${n(x + bl)}` +
      (bl ? `A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}` : "") +
      `V${n(y + tl)}` +
      (tl ? `A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}` : "") +
      "Z"
    );
  }

  /**
   * An SVG path in the element's own pixel space, for `clip-path: path()`.
   *
   * Both rectangles are wound the same way, so under the default nonzero fill
   * rule the two subpaths read as their union — no sampling, no seam.
   *
   * `shrink` pulls the outline in by that many pixels. The focusing screen sits
   * under the content with the same clip, so both anti-aliased edges landed on
   * the same pixels and the light glass bled through as a hairline; drawing the
   * glass a pixel inside leaves the content's edge over black.
   */
  function eyepiecePath(shape: Shape, inset: Inset, w: number, h: number, shrink = 0) {
    const box = eyepieceBox(shape, inset, w, h);
    const short = Math.min(box.w, box.h);
    return shape.rects
      .map((d) =>
        rectPath(
          box.x + d.x * box.w + shrink,
          box.y + d.y * box.h + shrink,
          d.w * box.w - shrink * 2,
          d.h * box.h - shrink * 2,
          d.r.map((v) => Math.max(0, v * short - shrink)) as Radii,
        ),
      )
      .join("");
  }

  /**
   * The eyepiece's rim as ONE outline, for stroking (Viewfinder's glass edge).
   * eyepiecePath is two overlapping subpaths, fine for a clip but stroked it
   * also drew the edges where they overlap, as seams across the glass. Every
   * drawing pairs two rects sharing either their height (side by side) or
   * their width (stacked), so their union is one rounded rectangle: the
   * bounding box, each corner rounded as the rect that owns it. Any other
   * pairing falls back to the two subpaths.
   */
  function eyepieceRim(shape: Shape, inset: Inset, w: number, h: number) {
    const box = eyepieceBox(shape, inset, w, h);
    const short = Math.min(box.w, box.h);
    const rs = shape.rects.map((d) => ({
      x: box.x + d.x * box.w,
      y: box.y + d.y * box.h,
      w: d.w * box.w,
      h: d.h * box.h,
      r: d.r.map((v) => Math.max(0, v * short)),
    }));
    const left = Math.min(...rs.map((r) => r.x));
    const top = Math.min(...rs.map((r) => r.y));
    const right = Math.max(...rs.map((r) => r.x + r.w));
    const bottom = Math.max(...rs.map((r) => r.y + r.h));
    const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
    const corner = (i: number, cx: number, cy: number) => {
      const own = rs.filter(
        (r) =>
          near(i === 0 || i === 3 ? r.x : r.x + r.w, cx) &&
          near(i < 2 ? r.y : r.y + r.h, cy),
      );
      return own.length ? Math.max(...own.map((r) => r.r[i])) : -1;
    };
    const radii = [
      corner(0, left, top),
      corner(1, right, top),
      corner(2, right, bottom),
      corner(3, left, bottom),
    ];
    if (radii.some((r) => r < 0)) return eyepiecePath(shape, inset, w, h);
    return rectPath(left, top, right - left, bottom - top, radii as Radii);
  }

  return { fitRadii, breakpointFor, eyepieceBox, eyepiecePath, eyepieceRim };
}

/**
 * The largest screen the eyepiece is fitted to, in CSS pixels. Past it the
 * glass stops growing and floats centred in black: on a 1920 desktop it is
 * the drawn 1720, and a 2560 or 4K monitor gets the same window instead of
 * one blown up 1.3x-2x — which also bounds how large any image must be.
 * Laptops (1728x1117 included) are under it and fit as before.
 * Mirrored in CSS as --stage-max-w/h (globals.css); keep both equal.
 */
export const STAGE_MAX = { w: 1920, h: 1200 };

/** How much wider than drawn a portrait window may get on a short screen. */
export const SQUEEZE = 1.25;

const geometry = makeGeometry(STAGE_MAX, SQUEEZE);
const fitRadii = geometry.fitRadii;
export const breakpointFor = geometry.breakpointFor;
export const eyepieceBox = geometry.eyepieceBox;
export const eyepiecePath = geometry.eyepiecePath;
export const eyepieceRim = geometry.eyepieceRim;

/* ---- the normalised shape, which is what morphs ---------------------------- */

/** x/y/w/h are fractions of the eyepiece box; radii are fractions of its short side. */
type Rect = { x: number; y: number; w: number; h: number; r: Radii };

export type Shape = { ratio: number; rects: [Rect, Rect] };

function normalise({ win, rects }: Design): Shape {
  const [W, H] = win;
  const short = Math.min(W, H);
  // 999 is resolved to the radius it actually paints here, not left for
  // rectPath to fit. Otherwise a lerp 240 -> 999 hits the limit partway in
  // and sits still for the rest of the morph.
  const scaleRect = (d: DesignRect): Rect => ({
    x: d.x / W,
    y: d.y / H,
    w: d.w / W,
    h: d.h / H,
    r: fitRadii(d.w, d.h, d.r).map((v) => v / short) as Radii,
  });
  return { ratio: W / H, rects: [scaleRect(rects[0]), scaleRect(rects[1])] };
}

const SHAPES: Record<Breakpoint, Shape[]> = Object.fromEntries(
  (Object.keys(DESIGNS) as Breakpoint[]).map((bp) => [
    bp,
    FRAMINGS.map((f) =>
      normalise(DESIGNS[bp][f.id] ?? DESIGNS[bp][SHARES_PERFILS_OUTLINE]),
    ),
  ]),
) as Record<Breakpoint, Shape[]>;

export function shapeFor(bp: Breakpoint, index: number): Shape {
  const set = SHAPES[bp];
  return set[Math.max(0, Math.min(index, set.length - 1))];
}

export function insetFor(bp: Breakpoint) {
  return INSET[bp];
}

/**
 * The width of the drawn hero window on each device. Chrome drawn at Figma
 * size (the menu) scales by eyepiece width over this, so it keeps its
 * proportion to the glass: "if it has to shrink, it shrinks".
 */
export function designWidth(bp: Breakpoint) {
  return DESIGNS[bp].hero.win[0];
}

/** Reduced motion parks the eyepiece on a plain rounded rectangle. */
export const RECT: Shape = normalise(DESIGNS.desktop.perfil);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mixRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    r: [
      lerp(a.r[0], b.r[0], t),
      lerp(a.r[1], b.r[1], t),
      lerp(a.r[2], b.r[2], t),
      lerp(a.r[3], b.r[3], t),
    ],
  };
}

export function mixShape(a: Shape, b: Shape, t: number): Shape {
  return {
    ratio: lerp(a.ratio, b.ratio, t),
    rects: [mixRect(a.rects[0], b.rects[0], t), mixRect(a.rects[1], b.rects[1], t)],
  };
}

/** How far apart two shapes are, for deciding when a morph has settled. */
export function shapeDistance(a: Shape, b: Shape): number {
  let d = Math.abs(a.ratio - b.ratio);
  for (let i = 0; i < 2; i++) {
    const p = a.rects[i];
    const q = b.rects[i];
    d += Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + Math.abs(p.w - q.w) + Math.abs(p.h - q.h);
    for (let k = 0; k < 4; k++) d += Math.abs(p.r[k] - q.r[k]);
  }
  return d;
}

/* ---- the boot script's inputs --------------------------------------------- */

/**
 * What the boot script needs to paint the first frame (the hero) for any
 * viewport: the hero's shape, margins and drawn width for every family, and
 * the two limits `makeGeometry` takes. Plain data, so it goes into the page as
 * JSON beside the serialised geometry.
 */
export function bootData() {
  const bps = Object.keys(DESIGNS) as Breakpoint[];
  const pick = <T,>(f: (bp: Breakpoint) => T) =>
    Object.fromEntries(bps.map((bp) => [bp, f(bp)])) as Record<Breakpoint, T>;
  return {
    max: STAGE_MAX,
    squeeze: SQUEEZE,
    shape: pick((bp) => shapeFor(bp, 0)),
    inset: pick(insetFor),
    width: pick(designWidth),
  };
}

export type BootData = ReturnType<typeof bootData>;
