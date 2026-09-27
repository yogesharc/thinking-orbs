"use client";

import { useEffect, useId, useRef } from "react";

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Rings of latitude, each with dots spaced to its width, so the dots line up into meridians. */
function latlong(size: number) {
  const L = Math.min(14, Math.max(5, Math.round(size / 4.5))), D = Math.round(L * 2.6), pts: number[][] = [];
  for (let j = 0; j <= L; j++) {
    const lat = -Math.PI / 2 + (j / L) * Math.PI, cl = Math.cos(lat), n = Math.max(1, Math.round(cl * D));
    for (let f = 0; f < n; f++) pts.push([cl * Math.cos((f / n) * TAU), Math.sin(lat), cl * Math.sin((f / n) * TAU)]);
  }
  return pts;
}

/** Default time for one full turn, in ms. */
export const DURATION = 6500;

/**
 * One clock (ms) per look (kind + state), so every sphere of it stays in phase and a speed
 * change never jumps it. `speeds` holds the playground's demo multiplier for each look.
 */
const clocks = new Map<string, { t: number; last: number }>();
export const speeds = new Map<string, number>();
export const lookOf = (kind: SphereKind = "base", state?: SphereState) => `${kind}|${state ?? ""}`;
function tick(look: string, now: number) {
  let c = clocks.get(look);
  if (!c) clocks.set(look, (c = { t: 0, last: now }));
  if (now !== c.last) c.t += Math.min(now - c.last, 100) * (speeds.get(look) ?? 1);
  c.last = now;
  return c.t;
}

/** `latlong` is set aside for now: nothing draws it, but it's kept to come back to. */
export type SphereKind = "base" | "noise" | "sparse" | "rings" | "meridians" | "band" | "latlong";
/** What the sphere is doing on top of its spin. Grows one state at a time. */
export type SphereState =
  | "base-steps"
  | "working-wave"
  | "working-wave-pull"
  | "working-wave-tilt"
  | "working-wave-steady"
  | "working-wave-easein"
  | "wave-across"
  | "wave-spiral"
  | "working-spin"
  | "working-beat"
  | "working-tick"
  | "working-gyro"
  | "working-gyro-wring"
  | "working-wring"
  | "reasoning-sparks"
  | "reasoning-connect"
  | "reasoning-connect-dim"
  | "reasoning-connect-halo"
  | "reasoning-connect-glow"
  | "reasoning-connect-lines"
  | "reasoning-connect-chain"
  | "reasoning-connect-two"
  | "reasoning-connect-rim"
  | "reasoning-layers"
  | "reasoning-inhale"
  | "searching"
  | "listening"
  | "listening-wobble"
  | "background"
  | "background-behind"
  | "background-breath"
  | "background-lanes"
  | "background-soft"
  | "background-trail"
  | "background-top"
  | "background-calm"
  | "background-rim"
  | "compacting-wind"
  | "compacting-wind-pinch"
  | "compacting-wring"
  | "compacting-wring-pinch"
  | "compacting-towel"
  | "compacting-towel-hands"
  | "compacting-press"
  | "compacting-fold"
  | "compacting-merge"
  | "compacting-drain"
  | "compacting-pack"
  | "compacting-sweep"
  | "compacting-sweep-dim"
  | "compacting-sweep-deep"
  | "compacting-sweep-edge"
  | "compacting-sweep-edge-dim"
  | "compacting-sweep-down"
  | "compacting-sweep-ring"
  | "compacting-sweep-merge"
  | "compacting-sweep-passes"
  | "compacting-sweep-return"
  | "compacting-sweep-surface"
  | "retrying-rewind"
  | "retrying-stall"
  | "retrying-backoff"
  | "retrying-easein"
  | "retrying-easeout"
  | "retrying-scan"
  | "retrying-easeout-scan"
  | "retrying-rewind-fast"
  | "retrying-rewind-back"
  | "retrying-rewind-spring"
  | "retrying-rewind-antic"
  | "retrying-rewind-30";

const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;

/** A steady beat every 2s: swells in 250ms, eases back over 750ms, then rests. */
function beat(t: number) {
  const u = t % 2000;
  return u < 250 ? ease(u / 250) : u < 1000 ? 1 - ease((u - 250) / 750) : 0;
}

/**
 * A spring settling from 0 to 1: shoots ~22% past, dips ~5% under, and lands on 1 exactly at
 * x=1. The last term trims the spring's tiny leftover so the next phase starts clean.
 */
const spring = (x: number) => 1 - Math.exp(-4.5 * x) * Math.cos(3 * Math.PI * x) - x * Math.exp(-4.5);

/**
 * Retrying's spin angle at `t`, for spin speed `w` (rad/ms), where the spin isn't steady.
 * Rewind, every 3.2s: turns 2s, brakes over 0.2s, winds back 60° over 0.6s, holds 0.2s,
 * then speeds up again over 0.2s. Stall, every 3.6s: turns 2s, coasts to a stop over 0.8s,
 * hangs 0.5s, then spins back up over 0.3s. Whole cycles stack, so it never jumps.
 */
function retrySpin(state: SphereState, t: number, w: number, giveBack?: number[], springy = false, antic = 0) {
  if (state === "retrying-rewind") {
    // Winds back 60°, or, taking turns through `giveBack`, that share of what it turned going
    // forward (2.1s' worth): [0.5, 0.7] gives back half, then 70%, then half again.
    const P = 3200, k = Math.floor(t / P), u = t - k * P;
    const backs = (giveBack ?? []).map((g) => g * 2100 * w), n = backs.length || 1;
    const backOf = (i: number) => (backs.length ? backs[i % n] : Math.PI / 3);
    // Braking and speeding up are each linear over 200ms, so each covers half its span at full speed: 100ms' worth.
    const fwd = (2000 + 100 + 100) * w;
    let before = Math.floor(k / n) * (n * fwd - Array.from({ length: n }, (_, i) => backOf(i)).reduce((s, b) => s + b, 0));
    for (let i = k - (k % n); i < k; i++) before += fwd - backOf(i);
    const back = backOf(k);
    let a: number;
    if (u < 2000) a = u * w;
    else if (u < 2200) {
      const x = (u - 2000) / 200;
      a = (2000 + 200 * (x - (x * x) / 2)) * w;
    } else if (u < 3000 && antic)
      // Anticipation: eases `antic` further forward over 250ms, like a wind-up, then springs
      // back from there to the same mark over the remaining 550ms.
      a =
        u < 2450
          ? 2100 * w + antic * ease((u - 2200) / 250)
          : 2100 * w + antic - (back + antic) * spring((u - 2450) / 550);
    else if (u < 3000)
      // Springy winds back across all 800ms, bouncing to rest; otherwise 600ms eased, then a 200ms hold.
      a = 2100 * w - back * (springy ? spring((u - 2200) / 800) : ease(Math.min(1, (u - 2200) / 600)));
    else {
      const x = (u - 3000) / 200;
      a = 2100 * w - back + 100 * x * x * w;
    }
    return before + a;
  }
  const P = 3600, k = Math.floor(t / P), u = t - k * P;
  const cycle = (2000 + 800 / 3 + 100) * w;
  let a: number;
  if (u < 2000) a = u * w;
  else if (u < 2800) {
    const x = (u - 2000) / 800; // speed falls as (1 − x)², so the angle eases in to rest
    a = 2000 * w + (800 / 3) * (1 - (1 - x) ** 3) * w;
  } else if (u < 3300) a = (2000 + 800 / 3) * w;
  else {
    const x = (u - 3300) / 300; // speed rises as x², back to full by the end of the cycle
    a = (2000 + 800 / 3) * w + (300 / 3) * x ** 3 * w;
  }
  return k * cycle + a;
}
/** Backoff: a quick squeeze at each retry, 0, 1, 3 and 7s into an 8s cycle; 0–1 over 400ms. */
function backoff(t: number) {
  const u = t % 8000, at = [7000, 3000, 1000, 0].find((p) => p <= u)!, x = (u - at) / 400;
  return x < 1 ? Math.sin(Math.PI * x) : 0;
}
/**
 * The compacting squeeze, 0–1, over a `P`ms cycle: tightens for 45% of it, holds 15%,
 * lets go for 25% (fast, then settling), and rests loose for the last 15%.
 */
function squeeze(t: number, P = 2400) {
  const u = (t % P) / P;
  if (u < 0.45) return ease(u / 0.45);
  if (u < 0.6) return 1;
  if (u < 0.85) return (1 - (u - 0.6) / 0.25) ** 3;
  return 0;
}
/** The i-th point of an n-point Fibonacci sphere, for fractional i too; past the end is the bottom pole. */
function fib(i: number, n: number) {
  if (i >= n) return [0, -1, 0];
  const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * GOLDEN;
  return [r * Math.cos(th), y, r * Math.sin(th)];
}
/** Blend two points on the sphere and put the result back on its surface. */
function nlerp(a: number[], b: number[], e: number) {
  const v = a.map((ai, j) => ai + (b[j] - ai) * e), n = Math.hypot(v[0], v[1], v[2]) || 1;
  return v.map((vi) => vi / n);
}

/** Compacting: the ends turn up to this far (rad) against the middle, opposite ways, like wringing. */
const TWIST = 1.4;
/**
 * Working · Tilt's ring axis in view space: tipped 30° toward you, then rolled 10° counter-clockwise
 * on screen, so the ring leans with its right end higher.
 */
const RING_AXIS = (() => {
  const tip = (30 * Math.PI) / 180, roll = (10 * Math.PI) / 180;
  return [-Math.sin(roll) * Math.cos(tip), Math.cos(roll) * Math.cos(tip), Math.sin(tip)];
})();
/**
 * Twist amount over time, −1…1. Wind: tightens over 1.44s, holds 0.3s, then springs back
 * loose with a small overshoot, every 2.4s. Wring: swings one way then the other every 2.6s.
 */
function twist(state: SphereState, t: number) {
  if (!state.startsWith("compacting-wind")) return Math.sin((t / 2600) * TAU);
  const u = (t % 2400) / 2400;
  if (u < 0.6) return (1 - Math.cos((u / 0.6) * Math.PI)) / 2;
  if (u < 0.72) return 1;
  const s = (u - 0.72) / 0.28;
  return Math.exp(-5 * s) * Math.cos(9 * s);
}

/**
 * A state's steady spin period in ms. Working turns at 3s, Ease in and Steady at 4.5s; the
 * other working, wave and reasoning states keep Base's pace (Spin doubles it); the rest turn
 * at half speed, the first background ones at a quarter.
 */
function periodOf(state: SphereState | undefined, duration: number) {
  if (state === "working-spin") return duration / 2;
  if (state === "working-wave-pull" || state === "working-wave-tilt" || state === "working-wring") return 3000;
  if (state === "working-wave-easein" || state === "working-wave-steady") return 4500;
  if (state && !state.startsWith("wave") && !state.startsWith("working") && !state.startsWith("reasoning"))
    return duration * (QUARTER.includes(state) ? 4 : 2);
  return duration;
}

/** How long a state takes per turn at 1×, for showing; stepped and rewinding spins give their running pace. */
export function turnOf(state?: SphereState, duration = DURATION) {
  if (state === "retrying-easein" || state === "retrying-easeout" || state === "retrying-easeout-scan") return duration / 2;
  if (state === "retrying-rewind-fast") return periodOf(state, duration) / 2;
  if (state === "retrying-rewind-back" || state === "retrying-rewind-spring" || state === "retrying-rewind-antic" || state === "retrying-rewind-30")
    return 4500;
  if (state === "working-tick") return 6000;
  if (state === "base-steps") return 6500;
  return periodOf(state, duration);
}

/** Background states that turn at a quarter speed; every other state turns at half. */
const QUARTER: (SphereState | undefined)[] = [
  "background",
  "background-behind",
  "background-breath",
  "background-lanes",
  "background-soft",
  "background-trail",
];
/** Background states drawn at half strength. */
const DIM: (SphereState | undefined)[] = ["background", "background-breath", "background-lanes"];

/** Background lanes' speeds, relative to the spin, bottom band to top. */
const LANES = [0.7, 1, 1.35];
/** Background trail: ghosts per dot, and the angle between them (rad). Five 0.1s make a ~29° tail. */
const GHOSTS = 5, TRAIL_STEP = 0.1;

/**
 * A fake voice level, 0–1: phrases of 1.3–2.2s split by pauses, with ~4Hz syllables inside.
 * Deterministic in `t`, so every sphere hears the same voice.
 */
function voice(t: number) {
  const P = 2600, k = Math.floor(t / P), u = t / P - k;
  const talk = 0.5 + 0.35 * hash(k + 7.3);
  const env = u < talk ? Math.sin((Math.PI * u) / talk) ** 0.6 : 0;
  return env * (0.6 + 0.4 * Math.sin(t * 0.027 + Math.sin(t * 0.011) * 2));
}

// Searching: a lens hops between spots on the front of the sphere. Each hop is one
// segment: it glides for the first MOVE of it, then lingers on the spot.
const LENS_MS = 1800, MOVE = 0.4;
const LENS = 0.6; // angular radius in radians, a bit under half the sphere's width across
const dist2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
/**
 * Connect's walk: a hop every HOP ms to one of the REACH nearest dots, with the last TAIL lit
 * and fading. REACH is wide enough (~15° at 64px) for the walk to outpace the spin and stay in front.
 */
const HOP = 220, TAIL = 5, REACH = 24;
/** How many dots of each walk are kept; Chain lights CHAIN hops before letting go. */
const WALK = 16, CHAIN = 7;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
/** The k-th spot, in view space (z toward you). Kept 15–45° off centre, never on the rim; each hop swings 55–225° around it. */
function spot(k: number) {
  const phi = k * 2.45 + hash(k) * 1.5, theta = ((15 + 30 * hash(k + 0.5)) * Math.PI) / 180;
  return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
}
function lensAt(t: number) {
  const k = Math.floor(t / LENS_MS), u = t / LENS_MS - k;
  const e = u < MOVE ? (1 - Math.cos((u / MOVE) * Math.PI)) / 2 : 1;
  const a = spot(k), b = spot(k + 1);
  const v = a.map((ai, j) => ai + (b[j] - ai) * e), n = Math.hypot(v[0], v[1], v[2]);
  return v.map((vi) => vi / n);
}

/**
 * Where the dots sit, on a unit sphere. `step` is the gap between neighbours along a line
 * (rings, meridians), in unit-sphere terms, so lines stay evenly dotted at any size.
 */
function distribute(kind: SphereKind, size: number, count: number, step: number): number[][] {
  const at = (lat: number, lon: number) => [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  const spiral = (n: number, band = 1) =>
    Array.from({ length: n }, (_, i) => {
      const y = band * (1 - (2 * (i + 0.5)) / n), r = Math.sqrt(1 - y * y), th = i * GOLDEN;
      return [r * Math.cos(th), y, r * Math.sin(th)];
    });
  switch (kind) {
    case "latlong":
      return latlong(size);
    case "noise":
      // Uniform random on the sphere (random height, random angle), seeded so it's the same every load.
      return Array.from({ length: count }, (_, i) => {
        const y = 1 - 2 * hash(i + 0.31), r = Math.sqrt(1 - y * y), th = hash(i + 0.77) * TAU;
        return [r * Math.cos(th), y, r * Math.sin(th)];
      });
    case "rings": {
      // Three circles of latitude, one per task, dotted evenly around.
      return [-35, 0, 35].flatMap((deg) => {
        const lat = (deg * Math.PI) / 180, n = Math.round((TAU * Math.cos(lat)) / step);
        return Array.from({ length: n }, (_, f) => at(lat, (f / n) * TAU));
      });
    }
    case "meridians": {
      // Eight lines of longitude, pole to pole but stopping short so the poles don't clot.
      const lim = (80 * Math.PI) / 180, n = Math.round((2 * lim) / step) + 1;
      return Array.from({ length: 8 }, (_, m) =>
        Array.from({ length: n }, (_, j) => at(-lim + (2 * lim * j) / (n - 1), (m / 8) * TAU)),
      ).flat();
    }
    case "band": {
      // A belt ±20° around the equator at Base's density: the band is sin(20°) ≈ 34% of the surface.
      const B = Math.sin((20 * Math.PI) / 180);
      return spiral(Math.round(count * B), B);
    }
    default:
      return spiral(count);
  }
}

/** Default dots per px of size. */
export const DENSITY = 4;
/** Default axis tilt toward the viewer, in degrees. */
export const TILT = 20;

/**
 * A dotted sphere turning slowly. `base` spreads `size × density` dots evenly on a
 * Fibonacci spiral, with no lines; the back half fades out instead of leaving sub-pixel
 * dots as a grey haze, and no dot drops below 0.45px. `noise` renders the same way but
 * scatters the dots at random, so they clump and gap. `sparse` has a quarter of the dots at
 * twice the size; `rings` dots three circles of latitude, `meridians` eight lines of
 * longitude, `band` only a belt around the equator. `latlong` lines them up on rings
 * and meridians like a globe, and ignores `density`. `duration` is the ms for one full
 * turn. `tilt` leans the axis toward you, in degrees: 0 spins edge-on, 90 looks straight
 * down the pole. `state` layers a behaviour on the spin: `searching` sends a magnifying
 * lens wandering over the front, swelling and enlarging the dots under it. `listening`
 * sends ripples out from the front with a simulated voice; `listening-wobble` undulates
 * the whole surface with it instead. `background` is Base dimmed to half and slowed to a
 * quarter; `-behind` shows the far side instead of the near one, `-breath` swells slowly,
 * `-lanes` splits it into three bands turning at their own pace, `-soft` keeps full strength
 * with 70% dots and a 7s breath, `-trail` drags a fading tail behind every dot, `-top` is
 * undimmed Base seen from straight above, `-calm` is only the half-speed spin (for pairing
 * with a distribution), `-rim` shows only the dots along the outline. `compacting-wind`
 * wrings the sphere tight and springs it loose; `-wring` twists it back and forth; `-pinch`
 * on either narrows the waist as it twists. `compacting-towel` wrings with a tight cinch at
 * the middle; `-hands` turns each half as a block, opposite ways, so the twist bunches in
 * the cinch. `compacting-press` squashes it flat, `-fold` slides the poles into a belt,
 * `-merge` fuses neighbours in pairs, `-drain` spirals every dot down into the bottom pole,
 * `-pack` shrinks it while the dots keep their size, `-sweep` packs what a passing line has
 * crossed; each lets go and repeats. Sweep's variations: `-dim` fades what's packed, `-edge`
 * lights the line, `-down` and `-ring` change its direction, `-merge` fuses dots as it
 * passes, `-passes` packs in three rounds, `-return` unpacks on the way back, `-surface`
 * carries the line around with the spin. `retrying-rewind` halts and winds back 60° before
 * going on, `-stall` coasts to a stop and hangs before spinning up, `-backoff` squeezes at
 * growing gaps like retries backing off, `-easein` / `-easeout` ease every turn at twice
 * Base's speed, `-scan` runs a lit line across with nothing packing behind it,
 * `-easeout-scan` does both, `-rewind-back` spins at 4.5s a turn and rewinds twice in
 * turn: giving back half of one try, then 70% of the next; `-rewind-spring` gives back 60%
 * on a spring that bounces to rest, `-rewind-antic` the same after a 14° wind-up forward,
 * `-rewind-30` that with only 30% given back. `working-wave` is Base with a band of light
 * running down it every 2s, `-pull` packing what it's passed, shallower than Compacting,
 * `-tilt` the same with the ring tipped toward you and leaning right-end-up, `-steady` running it
 * evenly with no rest and a pull that rides with it, `-easein` letting go of the pull
 * slow-then-fast; `wave-across` runs it left to right every 1.5s;
 * `wave-spiral` lights the spiral arms in turn, a lap every 1.5s. `working-spin` is Base at
 * twice the speed, `-beat` swells 12% on a steady 2s beat, `-tick` steps round like a
 * clock's second hand, `-gyro` circles its axis like a spinning top, `-gyro-wring` also
 * wrings back and forth at half Compacting's twist; `working-wring` is that at 3s a turn.
 * `reasoning-sparks` flashes scattered dots in turn, `-connect` walks a lit dot from
 * neighbour to neighbour, `-layers` turns the top half faster than the bottom, `-inhale`
 * draws the dots toward the centre and back; all at Base's pace. Other states spin at half speed.
 */
export function Sphere({
  size = 24,
  kind = "base",
  state,
  density = DENSITY,
  duration = DURATION,
  tilt = TILT,
}: {
  size?: number;
  kind?: SphereKind;
  state?: SphereState;
  density?: number;
  duration?: number;
  tilt?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  // useId's colons and guillemets don't survive a url(#…) reference, so keep only the safe part.
  const id = "s" + useId().replace(/[^\w-]/g, "");

  useEffect(() => {
    const svg = ref.current!;
    // Sparse is Base at a quarter of the density, so each dot comes out twice the size.
    const dens = kind === "sparse" ? density / 4 : density;
    const count = Math.round(size * dens);
    // Dots shrink as they multiply, so the sphere's coverage holds steady across densities.
    const crisp = kind !== "latlong";
    const c = size / 2, R = c * 0.8, rs = (size / 64) ** 0.6 * (kind === "latlong" ? 1 : 0.72 * Math.sqrt(DENSITY / dens));
    // Lines of dots sit ~2.2px apart on screen, whatever the size.
    const pts = distribute(kind, size, count, 2.2 / R);
    // SVG, not canvas: vectors re-rasterize under pinch zoom, where a canvas bitmap gets upscaled blurry.
    // No depth sort needed: one ink under source-over blends the same in any order.
    const circle = () => svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "circle"));
    // Trail: each dot drags GHOSTS copies of itself at earlier angles, fading and shrinking behind it.
    // Halo: a soft light behind the sphere, strongest at its middle and gone by the box's edge.
    if (state === "reasoning-connect-halo") {
      svg.innerHTML =
        `<defs><radialGradient id="${id}-halo"><stop offset="0" stop-color="currentColor" stop-opacity="0.22"/>` +
        `<stop offset="0.6" stop-color="currentColor" stop-opacity="0.1"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>` +
        `<circle cx="${c}" cy="${c}" r="${c}" fill="url(#${id}-halo)"/>`;
    }
    // Glow: a soft halo behind each dot, shown only on the walk's lit dots.
    if (state === "reasoning-connect-glow") {
      svg.innerHTML =
        `<defs><radialGradient id="${id}-glow"><stop offset="0" stop-color="currentColor" stop-opacity="0.25"/>` +
        `<stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>`;
    }
    const halos =
      state === "reasoning-connect-glow"
        ? pts.map(() => {
            const h = circle();
            h.setAttribute("fill", `url(#${id}-glow)`);
            h.setAttribute("fill-opacity", "0");
            return h;
          })
        : null;
    const ghosts = state === "background-trail" ? Array.from({ length: GHOSTS }, () => pts.map(circle)) : [];
    const dots = pts.map(circle);
    // Merge: pair each dot with its nearest free neighbour, once; they meet at the pair's midpoint.
    const mids: number[][] = [];
    if (state === "compacting-merge" || state === "compacting-sweep-merge") {
      const free = new Set(pts.keys());
      for (const i of pts.keys()) {
        if (!free.delete(i)) continue;
        let best = -1, bd = Infinity;
        for (const j of free) {
          const dd = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2 + (pts[i][2] - pts[j][2]) ** 2;
          if (dd < bd) {
            bd = dd;
            best = j;
          }
        }
        const m = best < 0 ? pts[i] : nlerp(pts[i], pts[best], 0.5);
        mids[i] = m;
        if (best >= 0) {
          free.delete(best);
          mids[best] = m;
        }
      }
    }
    // Drain: dots walk down one of the spiral's visible arms, `arm` indices a step, into the bottom pole.
    const arm = count < 120 ? 8 : count < 400 ? 13 : 21, steps = Math.ceil(count / arm);
    // Connect: each dot's REACH nearest neighbours, for the walk to hop between.
    const near =
      state?.startsWith("reasoning-connect")
        ? pts.map((p, i) =>
            [...pts.keys()]
              .filter((j) => j !== i)
              .sort((a, b) => dist2(p, pts[a]) - dist2(p, pts[b]))
              .slice(0, REACH),
          )
        : [];
    // Each walker's walk so far (head last), and how many hops they've made. Two runs a pair.
    const walks: number[][] = Array.from(
      { length: state === "reasoning-connect-two" || state === "reasoning-connect-rim" ? 2 : 1 },
      () => [],
    );
    let hops = 0;
    // Lines: a stroke joining each hop of the tail to the next, under the dots.
    const lines =
      state === "reasoning-connect-lines"
        ? Array.from({ length: TAIL - 1 }, () => {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute("stroke", "currentColor");
            l.setAttribute("stroke-linecap", "round");
            l.setAttribute("stroke-width", Math.max(0.35, 0.6 * rs).toFixed(2));
            l.setAttribute("stroke-opacity", "0");
            return svg.insertBefore(l, dots[0]);
          })
        : [];

    const draw = (t: number) => {
      // States spin at half speed, so what they do on top reads first; the first background
      // ones at a quarter, to stay out of the way. Top looks straight down the pole, turning
      // in place like a record.
      const top = state === "background-top";
      const period = periodOf(state, duration);
      // Ease in / out: each turn, at twice Base's speed, starts slow and speeds up (or the reverse),
      // then the next turn starts over, so the spin keeps catching and re-launching.
      const eased = state === "retrying-easein" || state === "retrying-easeout" || state === "retrying-easeout-scan";
      const turns = t / (duration / 2), u = turns - Math.floor(turns);
      // Rewind, fast: the same rewind with time running double, so every phase takes half as long.
      const yaw = eased
        ? (Math.floor(turns) + (state === "retrying-easein" ? u ** 3 : 1 - (1 - u) ** 3)) * TAU
        : state === "retrying-rewind-fast"
          ? retrySpin("retrying-rewind", 2 * t, TAU / period)
          : state === "retrying-rewind-back"
            ? retrySpin("retrying-rewind", t, TAU / 4500, [0.5, 0.7])
            : state === "retrying-rewind-spring"
              ? // The whole cycle at double time (1.6s, spinning 1s), at half the rate so it still turns 4.5s a turn.
                retrySpin("retrying-rewind", 2 * t, TAU / 9000, [0.6], true)
              : state === "retrying-rewind-antic" || state === "retrying-rewind-30"
                ? retrySpin("retrying-rewind", t, TAU / 4500, [state === "retrying-rewind-30" ? 0.3 : 0.6], true, (14 * Math.PI) / 180)
          : state === "retrying-rewind" || state === "retrying-stall"
            ? retrySpin(state, t, TAU / period)
            : state === "working-tick"
              ? // A clock's second hand: every 500ms it steps a twelfth of a turn in 250ms, then holds.
                (Math.floor(t / 500) + ease(Math.min(1, (t % 500) / 250))) * (TAU / 12)
              : state === "base-steps"
                ? // Base in steps: a thirteenth of a turn every 500ms, eased over 250ms, so still 6.5s a turn.
                  (Math.floor(t / 500) + ease(Math.min(1, (t % 500) / 250))) * (TAU / 13)
                : (t / period) * TAU;
      const scan = state === "retrying-scan" || state === "retrying-easeout-scan";
      // Gyro: the axis circles every 5s like a spinning top's, tipping ±10° toward you and
      // leaning ±12° side to side, a quarter turn out of step.
      const gyro = state?.startsWith("working-gyro") || state === "working-wring" ? (t / 5000) * TAU : null;
      const pitch = ((top ? 90 : tilt + (gyro === null ? 0 : 10 * Math.cos(gyro))) * Math.PI) / 180;
      const roll = gyro === null ? 0 : ((12 * Math.sin(gyro)) * Math.PI) / 180, sr = Math.sin(roll), cr = Math.cos(roll);
      const lv = state === "listening-wobble" ? voice(t) : 0;
      const sy = Math.sin(yaw), cy = Math.cos(yaw), st = Math.sin(pitch), ct = Math.cos(pitch);
      // Lanes: three bands of latitude, one per task, each turning at its own pace.
      // Layers is two lanes: the top half at 1.5× the spin, the bottom at 0.5×, so they slide against each other.
      const lanes =
        state === "background-lanes"
          ? LANES.map((k) => [Math.sin(yaw * k), Math.cos(yaw * k)])
          : state === "reasoning-layers"
            ? [0.5, 1.5].map((k) => [Math.sin(yaw * k), Math.cos(yaw * k)])
            : null;
      // Connect: how lit each dot on the walk's tail is, the head brightest.
      const lit = new Map<number, number>();
      if (near.length) {
        // How far a dot faces you right now (spin and tilt only), which the walk steers by.
        const facing = (k: number) => pts[k][1] * st + (-pts[k][0] * sy + pts[k][2] * cy) * ct;
        const s = t / HOP, n = Math.floor(s), f = s - n;
        // Rim's second walker keeps to the edge: it scores dots by how close they sit to facing
        // 0.25, just inside the rim, where they're still big enough to read when lit.
        const rim = state === "reasoning-connect-rim";
        const onRim = (k: number) => -3 * Math.abs(facing(k) - 0.25);
        if (!walks[0].length) {
          // The first walker starts at the dot facing you most; a second, at a front dot well away from it.
          // With Rim, the second starts on the rim instead.
          const first = [...pts.keys()].reduce((b, k) => (facing(k) > facing(b) ? k : b), 0);
          const apart = (k: number) => (rim ? onRim(k) : facing(k) + dist2(pts[k], pts[first]));
          walks.forEach((walk, w) => walk.push(w ? [...pts.keys()].reduce((b, k) => (apart(k) > apart(b) ? k : b), 0) : first));
        }
        hops = Math.max(hops, n - WALK);
        for (; hops < n; hops++) {
          walks.forEach((walk, w) => {
            // Hop to the neighbour that faces you most, with a little chance mixed in so it wanders.
            const recent = walk.slice(-8), from = walk[walk.length - 1];
            let best = -1, score = -Infinity;
            // With two walkers, each also pushes away from the other's head, up to ~45° apart,
            // so they keep to their own patches of the front.
            const other = state === "reasoning-connect-two" ? walks[1 - w].at(-1) : undefined;
            near[from].forEach((k, j) => {
              const apart = other === undefined ? 0 : 1.2 * Math.min(Math.sqrt(dist2(pts[k], pts[other])), 0.8);
              const sc = (rim && w ? onRim(k) : facing(k)) + 0.35 * hash(hops * 31 + j + w * 977) + apart;
              if (!recent.includes(k) && sc > score) {
                score = sc;
                best = k;
              }
            });
            walk.push(best);
            if (walk.length > WALK) walk.shift();
          });
        }
        const light = (k: number | undefined, v: number) => k !== undefined && lit.set(k, Math.max(lit.get(k) ?? 0, v));
        for (const walk of walks) {
          if (state === "reasoning-connect-chain") {
            // Chain: the walk lights CHAIN hops that stay lit. As it finishes, the next chain starts
            // straight from its end while the finished one fades whole over the next three hops.
            const k = n % CHAIN, start = walk.length - 1 - k, fade = Math.max(0, 1 - (k + f) / 3);
            for (let j = 0; j <= CHAIN; j++) light(walk[start - CHAIN + j], fade);
            for (let j = 0; j <= k; j++) light(walk[start + j], j === k ? ease(Math.min(1, f * 2)) : 1);
          } else
            for (let j = TAIL - 1; j >= 0; j--)
              light(walk[walk.length - 1 - j], j === 0 ? ease(Math.min(1, f * 2)) : 1 - (j - 1 + f) / TAIL);
        }
      }
      // Inhale: every 6s the dots draw 20% toward the centre and back, keeping their size.
      const inhale = state === "reasoning-inhale" ? 0.2 * ease(1 - Math.abs((2 * (t % 6000)) / 6000 - 1)) : 0;
      // Breath: the whole sphere swells ±5%, over 4.5s, or 7s for Soft.
      const soft = state === "background-soft";
      // Backoff squeezes the whole sphere to 82% at each retry.
      const breath =
        state === "background-breath" || soft
          ? 1 + 0.05 * Math.sin((t / (soft ? 7000 : 4500)) * TAU)
          : state === "retrying-backoff"
            ? 1 - 0.18 * backoff(t)
            : state === "working-beat"
              ? 1 + 0.12 * beat(t)
              : 1;
      // The lens lives in view space, so it searches the face you see while the sphere turns under it.
      const lens = state === "searching" ? lensAt(t) : null;
      // Gyro + wring wrings at half Compacting's twist, so it stays calm enough for reasoning.
      const tw =
        state === "working-gyro-wring" || state === "working-wring"
          ? 0.5 * twist(state, t)
          : state && /^compacting-(wind|wring|towel)/.test(state)
            ? twist(state, t)
            : 0;
      // The other compactings squeeze and let go: the drain on a longer 3.2s cycle, the rest on 2.4s.
      const e = state === "compacting-drain" ? squeeze(t, 3200) : state && /^compacting-(press|fold|merge|pack)/.test(state) ? squeeze(t) : 0;
      // Sweep: a line crosses a dot's progress coordinate q (−1…1) from −1.15 to 1.15, packing
      // what it's passed; then all lets go. `base + depth × passed` is how packed a dot is, so
      // Passes can stack three rounds of a third each.
      let sweep: { at: number; hold: number; base: number; depth: number } | null = null;
      if (state === "compacting-sweep-passes") {
        // Three crossings of 1.25s, each packing a third deeper, then one release.
        const u = (t % 5000) / 5000, n = Math.min(2, Math.floor(u / 0.25));
        sweep =
          u < 0.75
            ? { at: -1.15 + 2.3 * ((u - n * 0.25) / 0.25), hold: 1, base: n / 3, depth: 1 / 3 }
            : { at: 1.15, hold: (1 - (u - 0.75) / 0.25) ** 3, base: 2 / 3, depth: 1 / 3 };
      } else if (state === "compacting-sweep-return") {
        // Packs going right, holds, then unpacks coming back left: no snap at the end.
        const u = (t % 3200) / 3200;
        const at = u < 0.45 ? -1.15 + 2.3 * ease(u / 0.45) : u < 0.55 ? 1.15 : 1.15 - 2.3 * ease((u - 0.55) / 0.45);
        sweep = { at, hold: 1, base: 0, depth: 1 };
      } else if (state?.startsWith("compacting-sweep") || scan) {
        // Crosses over 2s, then everything lets go over 0.8s. Deep springs back past loose:
        // swells 25% of its squeeze the other way over ~380ms, snaps back in ~210ms, then rests.
        const u = (t % 2800) / 2800, s = (u - 0.7) / 0.3;
        const release =
          state !== "compacting-sweep-deep"
            ? (1 - s) ** 3
            : s < 0.45
              ? 1 - 1.25 * ease(s / 0.45)
              : s < 0.7
                ? -0.25 * (1 - (s - 0.45) / 0.25) ** 2
                : 0;
        sweep = { at: -1.15 + 2.3 * Math.min(1, u / 0.7), hold: u < 0.7 ? 1 : release, base: 0, depth: 1 };
      }
      // How packed a dot at q is: fully once the line is 0.2 past it.
      const packed = (q: number) =>
        sweep ? (sweep.base + sweep.depth * Math.min(1, Math.max(0, (sweep.at - q) / 0.2))) * sweep.hold : 0;
      // The waist narrows in step with how far it's twisted: up to 30% as a broad hourglass,
      // or 45% as a towel's tight cinch at the middle.
      const towel = state?.startsWith("compacting-towel") ?? false;
      const hands = state === "compacting-towel-hands";
      const pinch = state?.endsWith("-pinch") ? 0.3 * Math.abs(tw) : towel ? 0.45 * Math.abs(tw) : 0;
      ghosts.forEach((row, g) => {
        const back = yaw - (g + 1) * TRAIL_STEP, gs = Math.sin(back), gc = Math.cos(back);
        const fade = 1 - (g + 1) / (GHOSTS + 1);
        pts.forEach(([x, y, z], i) => {
          const z1 = -x * gs + z * gc, d = (y * st + z1 * ct + 1) / 2;
          const el = row[i];
          el.setAttribute("cx", (c + (x * gc + z * gs) * R).toFixed(2));
          el.setAttribute("cy", (c - (y * ct - z1 * st) * R).toFixed(2));
          el.setAttribute("r", Math.max(0.3, (0.5 + 1.4 * d) * rs * (1 - 0.12 * (g + 1))).toFixed(2));
          el.setAttribute("fill-opacity", (Math.max(0, (d - 0.3) / 0.7) * fade * 0.7).toFixed(2));
        });
      });
      pts.forEach((p0, i) => {
        let p = p0;
        // Sweep + Merge fuses pairs as the line passes, so it needs the dot's place before it moves.
        const mw = state === "compacting-sweep-merge" ? packed(p0[0] * cy + p0[2] * sy) : 0;
        if (mw) p = nlerp(p0, mids[i], mw);
        else if (e && state === "compacting-fold") {
          // Every latitude slides 80% of the way to the equator: the poles fold into a belt.
          const lat = Math.asin(p[1]), l2 = lat * (1 - 0.8 * e), s = Math.cos(l2) / Math.max(1e-6, Math.cos(lat));
          p = [p[0] * s, Math.sin(l2), p[2] * s];
        } else if (e && state === "compacting-merge") p = nlerp(p, mids[i], e);
        else if (e && state === "compacting-drain") {
          const s = e * steps, k = Math.floor(s);
          p = nlerp(fib(i + k * arm, count), fib(i + (k + 1) * arm, count), s - k);
        }
        const [ox, y, oz] = p;
        // Twist turns each dot by an angle that grows with its height: top and bottom opposite ways.
        // Two hands hold each half rigid instead, so all the twisting bunches up in the middle.
        const turn = yaw + TWIST * tw * (hands ? Math.tanh(y / 0.25) : y);
        const band = lanes?.length === 2 ? (y < 0 ? 0 : 1) : y < -1 / 3 ? 0 : y < 1 / 3 ? 1 : 2;
        const [ly, lc] = lanes ? lanes[band] : tw ? [Math.sin(turn), Math.cos(turn)] : [sy, cy];
        // Pinch draws the waist in: an hourglass fading out toward the poles, or a towel's narrow cinch.
        const k = 1 - pinch * (towel ? Math.exp(-((y / 0.3) ** 2)) : 1 - y * y), x = ox * k, z = oz * k;
        const z1 = -x * ly + z * lc;
        let vx = x * lc + z * ly, vy = y * ct - z1 * st;
        const vz = y * st + z1 * ct, d = (vz + 1) / 2;
        const dot = dots[i];
        let r = (0.5 + 1.4 * d) * rs;
        // Crisp: opacity ramps from 0 at d=0.3 (just behind the rim) to 1 at the front, so the rim still reads.
        // Behind flips it: the back half shows and the front fades, as if seen from the far side.
        // Rim keeps only a band around the outline (d=0.5), so the middle reads empty.
        let a =
          state === "background-behind"
            ? Math.max(0, (0.7 - d) / 0.7)
            : state === "background-rim"
              ? Math.max(0, 1 - Math.abs(d - 0.5) / 0.18)
              : crisp
                ? Math.max(0, (d - 0.3) / 0.7)
                : 0.2 + 0.8 * d;
        // A thin empty seam between lanes, so the bands read even before they drift apart.
        if (lanes && Math.abs(Math.abs(y) - (lanes.length === 3 ? 1 / 3 : 0)) < 0.05) a = 0;
        if (lens) {
          const ang = Math.acos(Math.min(1, vx * lens[0] + vy * lens[1] + vz * lens[2]));
          const w = ang < LENS ? (1 - (ang / LENS) ** 2) ** 2 : 0;
          // Dim what's outside the lens. At 24px and under, dots are ~1px and growth alone barely
          // reads, so the lens enlarges harder there too.
          a *= 1 - 0.55 * (1 - w);
          if (size <= 24) r *= 1 + 0.5 * w;
          if (w) {
            // Swell out of the surface, then spread away from the lens centre like a magnifier, and enlarge.
            vx *= 1 + 0.12 * w;
            vy *= 1 + 0.12 * w;
            vx += (vx - lens[0]) * 0.35 * w;
            vy += (vy - lens[1]) * 0.35 * w;
            r *= 1 + 0.9 * w;
            a += (1 - a) * w;
          }
        }
        // Listening deforms the surface: each dot moves along its own radius by `disp`.
        let disp = 0;
        if (state === "listening") {
          // Rings travel from the point facing you (u=0) to the rim (u=1) in about a second,
          // each carrying the voice level from when it left, so bursts ride outward.
          const u = Math.acos(Math.max(-1, Math.min(1, vz))) / (Math.PI / 2);
          disp = 0.1 * (0.15 + 0.85 * voice(t - u * 1000)) * Math.sin(u * 12 - t * 0.012);
        } else if (state === "listening-wobble") {
          // Two slow waves crossing the surface; the voice swells them, a floor keeps it breathing in pauses.
          const n = Math.sin(2.1 * vx + 1.3 * vy + t * 0.0021) * Math.sin(1.7 * vy - 1.1 * vz + t * 0.0017 + 1);
          // Peaks at 0.22 of the radius, about as far as the box allows (0.8 × 1.22 ≈ 0.98 of half the size).
          disp = (0.05 + 0.17 * lv) * ((n + 0.5 * Math.sin(2.9 * vz + t * 0.0033 + 2)) / 1.5);
        }
        if (disp) {
          // Straight toward you is invisible in this projection, so crests also grow and brighten, troughs shrink and dim.
          vx *= 1 + disp;
          vy *= 1 + disp;
          r *= 1 + 3 * disp;
          a = Math.min(1, a * (1 + 3 * disp));
        }
        if (e && state === "compacting-press") {
          // Flattened top to bottom into a disc, spreading a little sideways as it gives.
          vy *= 1 - 0.65 * e;
          vx *= 1 + 0.15 * e;
        } else if (e && state === "compacting-pack") {
          // Shrinks to 65% but keeps every dot at full size, so it packs nearly solid.
          vx *= 1 - 0.35 * e;
          vy *= 1 - 0.35 * e;
        } else if (e && state === "compacting-merge") r *= 1 + 0.41 * e; // two dots' worth of area in one
        if (sweep) {
          // Where the line is, in this dot's terms: across the view left to right by default,
          // top to bottom for Down, out from the centre for Ring, and around the sphere's own
          // longitude for Surface, so the line turns with it.
          const q =
            state === "compacting-sweep-down"
              ? -vy
              : state === "compacting-sweep-ring"
                ? (Math.acos(Math.max(-1, Math.min(1, vz))) / (Math.PI / 2)) * 2 - 1
                : state === "compacting-sweep-surface"
                  ? Math.atan2(p0[2], p0[0]) / Math.PI
                  : vx;
          // Packed dots pull in 20% and shrink 30%; Deep and Passes (by its third round) go half
          // as deep again: pull 30%, shrink 45%.
          // Scan only lights the line: nothing behind it packs.
          const w = scan ? 0 : mw || packed(q);
          const k = state === "compacting-sweep-deep" || state === "compacting-sweep-passes" ? 1.5 : 1;
          vx *= 1 - 0.2 * k * w;
          vy *= 1 - 0.2 * k * w;
          // Merge's compaction is the fusing itself: fused dots take two dots' worth of area.
          r *= mw ? 1 + 0.41 * mw : 1 - 0.3 * k * w;
          if (state === "compacting-sweep-dim" || state === "compacting-sweep-edge-dim") a *= 1 - 0.5 * w;
          if (state?.startsWith("compacting-sweep-edge") || scan) {
            // The line itself: dots right at it grow and light up, like a scanner beam.
            const g = Math.exp(-(((q - sweep.at) / 0.08) ** 2)) * sweep.hold;
            r *= 1 + 0.8 * g;
            a += (1 - a) * g;
          }
        }
        if (state?.startsWith("working-wave") || state?.startsWith("wave")) {
          // Every 2s a band of latitude eases down the sphere over 1.2s, then it rests. Base's
          // front is already at full, so the light shows by lighting what Base hides: the band
          // reaches round the back too, a ring of light running through the globe. Across runs
          // an upright band left to right on screen instead, every 1.5s.
          // Spiral follows Fibonacci's own lines instead: dots `arm` apart sit on one spiral arm,
          // and the light steps round from arm to arm, a lap every 1.5s.
          // Steady runs its ring at an even speed with no rest, a new one leaving as the last goes.
          // Working (Tilt) runs every 1.7s: 1.2s ring, 0.5s release, straight into the next ring with no hold.
          const across = state === "wave-across", steady = state === "working-wave-steady";
          const P = across ? 1500 : state === "working-wave-tilt" ? 1700 : 2000;
          const u = t % P, at = steady ? 1.15 - 2.3 * (u / P) : 1.3 - 2.6 * ease(Math.min(1, u / 1200));
          const off = Math.abs((i % arm) - ((t / 1500) % 1) * arm), gap = Math.min(off, arm - off);
          // Where the ring is, in this dot's terms: its height on the sphere (y is vy·cos 20° +
          // vz·sin 20°), or for Tilt its height along RING_AXIS, so its front arc bows down and its right end rides up.
          const q =
            across ? -vx : state === "working-wave-tilt" ? vx * RING_AXIS[0] + vy * RING_AXIS[1] + vz * RING_AXIS[2] : y;
          const g =
            state === "wave-spiral"
              ? Math.exp(-((gap / 0.7) ** 2))
              : steady || u < 1200
                ? Math.exp(-(((q - at) / 0.2) ** 2))
                : 0;
          const working = state?.startsWith("working-wave");
          r *= 1 + 0.6 * g;
          a += (1 - a) * (working ? 1 : 0.8) * g;
          if (state === "working-wave-pull" || state === "working-wave-easein" || state === "working-wave-tilt") {
            // Shallower than Compacting's sweep: what the ring has passed pulls in 8% and
            // shrinks 15%, then all lets go evenly over 500ms. Ease in lets go slowly over the whole
            // 800ms rest and speeds up instead, landing at full speed into the next ring.
            const x = (u - 1200) / 800;
            const release = state === "working-wave-easein" ? 1 - x * x : 1 - Math.min(1, 1.6 * x);
            const w = Math.min(1, Math.max(0, (q - at) / 0.2)) * (u < 1200 ? 1 : release);
            vx *= 1 - 0.08 * w;
            vy *= 1 - 0.08 * w;
            r *= 1 - 0.15 * w;
          } else if (steady) {
            // The pull rides with the ring: dots draw in 15% as it arrives and ease back out over
            // the next ~0.4s behind it, so the sphere never shrinks whole and has nothing to release.
            const d = y - at, w = Math.exp(-((d / (d > 0 ? 0.5 : 0.1)) ** 2));
            vx *= 1 - 0.15 * w;
            vy *= 1 - 0.15 * w;
            r *= 1 - 0.15 * w;
          }
        }
        // Sparks: each dot flashes for 0.4s once every 8s at its own moment, so ~5% glow at a time.
        // Connect lights the walk's tail. Either reaches round the back, like the wave did.
        let spark = 0;
        if (state === "reasoning-sparks") {
          const s = (t / 8000 + hash(i + 1)) % 1;
          spark = s < 0.05 ? Math.sin((s / 0.05) * Math.PI) : 0;
        } else spark = lit.get(i) ?? 0;
        // Dim rests the sphere at 50%, so only the walk's dots reach full.
        if (state?.startsWith("reasoning-connect-")) a *= 0.5;
        if (spark) {
          r *= 1 + 0.8 * spark;
          a += (1 - a) * spark;
        }
        if (inhale) {
          vx *= 1 - inhale;
          vy *= 1 - inhale;
        }
        // Background work stays out of the way: everything at half strength. Soft keeps full
        // strength and goes quiet through smaller dots instead; Behind's fading front is quiet enough.
        if (soft) r *= 0.7;
        else if (DIM.includes(state)) a *= 0.5;
        if (roll) [vx, vy] = [vx * cr - vy * sr, vx * sr + vy * cr];
        dot.setAttribute("cx", (c + vx * R * breath).toFixed(2));
        dot.setAttribute("cy", (c - vy * R * breath).toFixed(2));
        dot.setAttribute("r", (crisp ? Math.max(0.45, r) : r).toFixed(2));
        dot.setAttribute("fill-opacity", a.toFixed(2));
        if (halos && (spark || halos[i].getAttribute("fill-opacity") !== "0")) {
          // A halo four times the dot's size, fading with it along the tail.
          const h = halos[i];
          h.setAttribute("cx", dot.getAttribute("cx")!);
          h.setAttribute("cy", dot.getAttribute("cy")!);
          h.setAttribute("r", (4 * r).toFixed(2));
          h.setAttribute("fill-opacity", spark ? spark.toFixed(2) : "0");
        }
      });
      // Lines join each tail dot to the next, as bright as the dimmer of the two.
      const walk = walks[0];
      lines.forEach((l, j) => {
        const a = walk[walk.length - 2 - j], b = walk[walk.length - 1 - j];
        if (a === undefined) return;
        l.setAttribute("x1", dots[a].getAttribute("cx")!);
        l.setAttribute("y1", dots[a].getAttribute("cy")!);
        l.setAttribute("x2", dots[b].getAttribute("cx")!);
        l.setAttribute("y2", dots[b].getAttribute("cy")!);
        l.setAttribute("stroke-opacity", (0.7 * Math.min(lit.get(a) ?? 0, lit.get(b) ?? 0)).toFixed(2));
      });
    };

    const look = lookOf(kind, state);
    draw(tick(look, performance.now()));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => svg.replaceChildren();
    // Only spheres on screen redraw; a page of them off screen would otherwise cost every frame.
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(svg);
    let raf = requestAnimationFrame(function frame(now) {
      const t = tick(look, now);
      if (visible) draw(t);
      raf = requestAnimationFrame(frame);
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      svg.replaceChildren();
    };
  }, [size, kind, state, density, duration, tilt, id]);

  return <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" aria-hidden />;
}
