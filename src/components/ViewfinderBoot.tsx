import { PAUSE_KEY } from "@/lib/motion";
import { bootData, makeGeometry, type BootData } from "@/lib/viewfinder";

/**
 * Paints the eyepiece's first frame while the page is still parsing, before
 * React has loaded.
 *
 * The stage stays hidden until the Viewfinder has measured it (see
 * [data-ready] in globals.css), and the Viewfinder is React: on a phone over
 * 4G the hero was downloaded by ~2.9s but hidden until ~5.6s, waiting for the
 * bundle to arrive and hydrate (HALLAZGOS H5). This does the same first
 * measurement with the same code — `makeGeometry` is serialised, not copied —
 * and shows the glass and the sheet at once.
 *
 * The menu is left to React: its markup differs per family (the phone's list
 * is not the desktop row), and the server rendered the desktop one. It shows
 * when the Viewfinder marks the stage ready, as before.
 *
 * Rendered right after the Viewfinder, so the stage is already in the DOM.
 */
export default function ViewfinderBoot() {
  const code = `(${boot.toString()})(${makeGeometry.toString()},${JSON.stringify(bootData())},${JSON.stringify(PAUSE_KEY)})`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

/* Serialised too: nothing from outside its body, only its arguments. */
function boot(make: typeof makeGeometry, d: BootData, pauseKey: string) {
  const stage = document.querySelector<HTMLElement>("[data-bp]");
  if (!stage) return;

  // A stored pause (lib/motion.ts), before the first animation frame.
  try {
    if (localStorage.getItem(pauseKey) === "1") stage.dataset.paused = "";
  } catch {}
  const ground = stage.querySelector<HTMLElement>('[data-early="ground"]');
  const sheet = stage.querySelector<HTMLElement>('[data-early="sheet"]');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!ground || !sheet || !w || !h) return;

  const g = make(d.max, d.squeeze);
  const bp = g.breakpointFor(window.innerWidth, window.innerHeight);
  const shape = d.shape[bp];
  const inset = d.inset[bp];

  // The family first: every section's CSS is keyed on it.
  stage.dataset.bp = bp;
  ground.style.clipPath = `path("${g.eyepiecePath(shape, inset, w, h, 1)}")`;
  sheet.style.clipPath = `path("${g.eyepiecePath(shape, inset, w, h)}")`;

  // The same variables, in the same format, as Viewfinder's paint().
  const box = g.eyepieceBox(shape, inset, w, h);
  const scale = box.w / d.width[bp];
  const s = stage.style;
  s.setProperty("--stage-x", `${box.x.toFixed(2)}px`);
  s.setProperty("--stage-y", `${box.y.toFixed(2)}px`);
  s.setProperty("--stage-scale", scale.toFixed(5));
  s.setProperty("--stage-w", `${d.width[bp]}px`);
  s.setProperty("--stage-h", `${(box.h / scale).toFixed(2)}px`);
  const root = document.documentElement.style;
  const eye: [string, number][] = [
    ["--eye-w", box.w],
    ["--eye-h", box.h],
    ["--eye-x", box.x],
    ["--eye-y", box.y],
  ];
  for (let i = 0; i < eye.length; i++) {
    s.setProperty(eye[i][0], `${eye[i][1]}px`);
    root.setProperty(eye[i][0], `${eye[i][1]}px`);
  }

  stage.dataset.booted = "";
}
