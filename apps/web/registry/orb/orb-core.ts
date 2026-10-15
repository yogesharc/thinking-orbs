/** One state per thing an agent does, and the looks each comes in, `default` first. */
export const VARIANTS = {
  idle: ["default", "blink"],
  working: ["default", "gyro"],
  reasoning: ["default", "twins"],
  searching: ["default", "lighthouse"],
  background: ["default", "spiral"],
  retrying: ["default", "surge"],
  compacting: ["default", "squeeze", "fuse"],
  waiting: ["default"],
  using: ["default", "tap", "scroll", "type", "zoom", "snap", "record"],
} as const;

export type OrbState = keyof typeof VARIANTS;
export type OrbVariant<S extends OrbState = OrbState> = (typeof VARIANTS)[S][number];
/** A state and one of its own variants, `default` if left out. With no state it's `idle`. */
export type OrbLook =
  | { state?: undefined; variant?: undefined }
  | { [S in OrbState]: { state: S; variant?: OrbVariant<S> } }[OrbState]
  /** @deprecated `base` is now `idle`. */
  | { state: "base"; variant?: "default" };

/** What the drawing keys on: the state alone for its default look, or state-variant. */
type Look = OrbState | { [S in OrbState]: `${S}-${Exclude<OrbVariant<S>, "default">}` }[OrbState];

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
const dist2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
/**
 * The k points nearest pts[i], nearest first: one pass keeping a short sorted list, not a sort of them all.
 * Plain loops, as it runs once per dot at mount. @internal Shared with `renders.ts`, not part of the API.
 */
export const nearest = (pts: number[][], i: number, k: number) => {
  const idx: number[] = [], d: number[] = [], p = pts[i];
  for (let j = 0; j < pts.length; j++) {
    if (j === i) continue;
    const e = dist2(p, pts[j]);
    let at = idx.length;
    if (at === k) {
      if (e >= d[k - 1]) continue;
      at--;
    }
    while (at > 0 && d[at - 1] > e) {
      idx[at] = idx[at - 1];
      d[at] = d[at - 1];
      at--;
    }
    idx[at] = j;
    d[at] = e;
  }
  return idx;
};

/** Time for one full turn, in ms. Retrying's two set their own pace in `yawOf`. */
const PERIOD: Record<Look, number> = {
  idle: 6500,
  "idle-blink": 13000,
  working: 3000,
  "working-gyro": 3000,
  reasoning: 6500,
  "reasoning-twins": 6500,
  searching: 13000,
  "searching-lighthouse": 13000,
  background: 13000,
  "background-spiral": 13000,
  retrying: 13000,
  "retrying-surge": 13000,
  compacting: 10000,
  "compacting-squeeze": 10000,
  "compacting-fuse": 10000,
  waiting: 13000,
  using: 13000,
  "using-tap": 13000,
  "using-scroll": 13000,
  "using-type": 13000,
  "using-zoom": 13000,
  "using-snap": 13000,
  "using-record": 13000,
};

/**
 * One clock (ms) per look (state and speed), so every orb of it stays in phase. A frame's gap is
 * capped at 100ms, so a tab coming back from the background, or a look nobody had in view, carries
 * on instead of jumping.
 */
const clocks = new Map<string, { t: number; last: number }>();
function tick(look: string, now: number, speed: number) {
  let c = clocks.get(look);
  if (!c) clocks.set(look, (c = { t: 0, last: now }));
  // A frame's timestamp can predate the performance.now() that started the clock, so never step back.
  if (now > c.last) {
    c.t += Math.min(now - c.last, 100) * speed;
    c.last = now;
  }
  return c.t;
}

/**
 * A spring settling from 0 to 1: shoots ~22% past, dips ~5% under, and lands on 1 exactly at
 * x=1. The last term trims the spring's tiny leftover so the next phase starts clean.
 */
const spring = (x: number) => 1 - Math.exp(-4.5 * x) * Math.cos(3 * Math.PI * x) - x * Math.exp(-4.5);

/**
 * Retrying's spin at `t` for speed `w` (rad/ms), every 3.2s: turns 2s, brakes over 0.2s, springs
 * back 60% of what it turned over 0.8s, then speeds up again over 0.2s. Whole cycles stack, so it never jumps.
 */
function rewind(t: number, w: number) {
  const P = 3200, k = Math.floor(t / P), u = t - k * P;
  const back = 0.6 * 2100 * w;
  // Braking and speeding up are each linear over 200ms, so each covers half its span at full speed: 100ms' worth.
  const fwd = (2000 + 100 + 100) * w;
  let a: number;
  if (u < 2000) a = u * w;
  else if (u < 2200) {
    const x = (u - 2000) / 200;
    a = (2000 + 200 * (x - (x * x) / 2)) * w;
  } else if (u < 3000) a = 2100 * w - back * spring((u - 2200) / 800);
  else {
    const x = (u - 3000) / 200;
    a = 2100 * w - back + 100 * x * x * w;
  }
  return k * (fwd - back) + a;
}

function yawOf(state: Look, t: number) {
  // The rewind at double time, at half the rate, so it still averages 4.5s a turn.
  if (state === "retrying") return rewind(2 * t, TAU / 9000);
  if (state === "retrying-surge") {
    // Every turn, at 3.25s, starts fast and eases out, then the next launches straight away.
    const turns = t / 3250, u = turns - Math.floor(turns);
    return (Math.floor(turns) + (1 - (1 - u) ** 3)) * TAU;
  }
  // Scroll rolls instead, so it holds still side to side.
  if (state === "using-scroll") return 0.4;
  // Snap turns for most of each beat and stops dead for the rest, as the frame is caught.
  if (state === "using-snap") return ((Math.floor(t / BEAT) * SPIN + Math.min(t % BEAT, SPIN)) / PERIOD[state]) * TAU;
  return (t / PERIOD[state]) * TAU;
}

/** Working's ring axis in view space: tipped 30° toward you, then rolled 10° so its right end rides higher. */
const RING_AXIS = (() => {
  const tip = (30 * Math.PI) / 180, roll = (10 * Math.PI) / 180;
  return [-Math.sin(roll) * Math.cos(tip), Math.cos(roll) * Math.cos(tip), Math.sin(tip)];
})();
/** Gyro and Squeeze: the ends turn up to this far (rad) against the middle, opposite ways. */
const TWIST = 1.4;
/** Lighthouse: its beam leans this far (rad) right, and its trail dies out this far behind it. */
const LEAN = (30 * Math.PI) / 180, TRAIL = Math.PI / 2;

// Searching: a lens hops between spots on the front of the sphere. Each hop is one
// segment: it glides for the first MOVE of it, then lingers on the spot.
const LENS_MS = 1800, MOVE = 0.4;
const LENS = 0.6; // angular radius in radians, a bit under half the sphere's width across
/** The k-th spot, in view space (z toward you). Kept 15–45° off centre, never on the rim. */
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

// Using: a cursor in view space, like the lens, that glides between spots on the front and acts on them.
// PTR is its angular radius, PRESS how wide a click dents, and a click's ripple runs out over RIPPLE_MS.
const PTR = 0.45, PRESS = 0.5, RIPPLE_MS = 600;
/** The cursor's k-th resting spot: the lens's spots, further along so the two don't move alike. */
const mark = (k: number) => spot(k + 57);
const slide = (a: number[], b: number[], e: number) => {
  const v = a.map((ai, j) => ai + (b[j] - ai) * e), n = Math.hypot(v[0], v[1], v[2]);
  return v.map((vi) => vi / n);
};
/** A dot's weight under a soft disc `w` rad wide, from its angle `ang` off the centre. */
const bump = (ang: number, w: number) => (ang < w ? (1 - (ang / w) ** 2) ** 2 : 0);
/** Tap: every TAP ms the cursor glides to the next spot over the first 35%, settles, and clicks halfway. */
const TAP = 1400;
function tapAt(t: number) {
  const k = Math.floor(t / TAP), u = t / TAP - k;
  const at = slide(mark(k), mark(k + 1), u < 0.35 ? ease(u / 0.35) : 1);
  return { at, click: mark(u < 0.5 ? k : k + 1), since: (u < 0.5 ? u + 0.5 : u - 0.5) * TAP };
}
/** How far a click is pressed `s` ms after it: in over 60ms, out over the next 240ms. */
const pressOf = (s: number) => (s < 60 ? s / 60 : Math.max(0, 1 - (s - 60) / 240) ** 2);
/** Using: its cursor, the classic arrow's outline, x right and y down from its tip, scaled to ARROW_H sphere radii tall. */
const ARROW_H = 1;
const ARROW = [[0, 0], [0, 16], [4, 12], [7, 18], [9, 17], [6, 11], [11, 11]].map(([x, y]) => [(x / 18) * ARROW_H, (y / 18) * ARROW_H]);
/** Whether (x, y) falls inside `poly`, by counting the edges a ray from it crosses. */
function inside(poly: number[][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
/** Using's tip for a cursor spot: pulled in and up-left, so the arrow hanging below it stays on the face. */
const HOME = [-0.3, 0.5];
const onFace = (x: number, y: number) => [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
const tipOf = (p: number[]) => onFace(HOME[0] + 0.35 * p[0], HOME[1] + 0.35 * p[1]);
/** Using given a direction: every AIM ms it glides out from its rest that way, clicks, and comes back. */
const AIM = 1800;
function aimAt(t: number, phi: number) {
  const u = (t % AIM) / AIM;
  const e = u < 0.3 ? ease(u / 0.3) : u < 0.6 ? 1 : u < 0.85 ? 1 - ease((u - 0.6) / 0.25) : 0;
  const out = (s: number) => onFace(HOME[0] + 0.3 * s * Math.cos(phi), HOME[1] + 0.3 * s * Math.sin(phi));
  return { at: out(e), click: out(1), since: (u < 0.45 ? u + 0.55 : u - 0.45) * AIM };
}
/** Zoom: every ZOOM ms the face swells toward you over a quarter, holds, and eases back. */
const ZOOM = 2600;
/**
 * Using · Snap and Idle · Blink, on one BEAT. Snap spins for SPIN ms of it, then stops dead for the rest, with a
 * flash as it stops. Blink's lids close from top and bottom over 120ms, meet for 60ms, and part
 * over 250ms; it returns how far from the middle they are.
 */
const BEAT = 2600, SPIN = 2100;
function snapAt(t: number) {
  const u = (t % BEAT) - SPIN;
  return u < 0 ? 0 : Math.exp(-u / 220);
}
function blinkAt(t: number) {
  const u = t % BEAT;
  return u < 120 ? 1.2 * (1 - ease(u / 120)) : u < 180 ? 0 : u < 430 ? 1.2 * ease((u - 180) / 250) : 1.2;
}
/** Record: a recording light's pulse, from 0 (dim and small) to 1 and back every REC ms in straight lines, never resting at either end. */
const REC = 1200;
const recAt = (t: number) => Math.abs(1 - 2 * ((t % REC) / REC));
function zoomAt(t: number) {
  const u = (t % ZOOM) / ZOOM;
  return u < 0.25 ? ease(u / 0.25) : u < 0.5 ? 1 : u < 0.75 ? 1 - ease((u - 0.5) / 0.25) : 0;
}
/** Scroll: the sphere rolls up FLING rad a FLICK at a time, fast at first and coasting to a stop. */
const FLICK = 1500, FLING = 1.1;
function scrollAt(t: number) {
  const k = Math.floor(t / FLICK), x = Math.min(1, (t / FLICK - k) / 0.75);
  return { by: (k + 1 - (1 - x) ** 3) * FLING, pace: (1 - x) ** 2 };
}
/** The ways Scroll goes, as a page scrolls, by their angle on screen in degrees: right 0, up 90. */
const DIRECTIONS = { right: 0, "up-right": 45, up: 90, "up-left": 135, left: 180, "down-left": 225, down: 270, "down-right": 315 };
export type OrbDirection = keyof typeof DIRECTIONS;
/** Scroll without a direction: each flick carries the face its own way on screen: up, down, up-right, left, right, down-left. */
const PAN = [90, 270, 45, 180, 0, 225].map((deg) => (deg * Math.PI) / 180);
/** The 3×3 turn (row-major) by `th` rad that carries the front of the sphere `phi` rad round from right on screen. */
function panTurn(phi: number, th: number) {
  // The axis lies on screen, square to the way the face moves.
  const ax = -Math.sin(phi), ay = Math.cos(phi), s = Math.sin(th), c = Math.cos(th), v = 1 - c;
  return [c + ax * ax * v, ax * ay * v, ay * s, ax * ay * v, c + ay * ay * v, -ax * s, -ay * s, ax * s, c];
}
const times = (m: number[], n: number[]) =>
  m.map((_, i) => m[i - (i % 3)] * n[i % 3] + m[i - (i % 3) + 1] * n[(i % 3) + 3] + m[i - (i % 3) + 2] * n[(i % 3) + 6]);
/**
 * Type: a short paragraph typed onto the face, held, then cleared. TEXT is its lines, "x" a letter
 * and " " a space, so words read as bars with gaps between. Each character is a cell CELL wide from
 * LEFT, and lines sit LEAD apart down from TOP, in sphere radii on screen.
 */
const TEXT = ["xxxx xxx xx", "xxxxx xx xxxx", "xxx xxxxx"];
const CELL = 0.09, LEAD = 0.3, TOP = 0.33, LEFT = -0.5;
/** Every key in order, with when it lands: 70–130ms a letter, longer after a word, longer still at a line's end. */
const KEYS = (() => {
  let at = 0;
  return TEXT.flatMap((line, row) =>
    [...line].map((ch, col) => {
      const key = { row, col, at };
      at += ch === " " ? 200 : col === line.length - 1 ? 350 : 70 + 60 * hash(row * 31 + col);
      return key;
    }),
  );
})();
/** Which key types each cell, by row then column. */
const KEY_OF = TEXT.map((_, row) => KEYS.flatMap((k, i) => (k.row === row ? [i] : [])));
const TYPED = KEYS[KEYS.length - 1].at, PARAGRAPH = TYPED + 1300;
function typeAt(t: number) {
  const c = t % PARAGRAPH;
  let n = 0;
  while (n < KEYS.length && KEYS[n].at <= c) n++;
  const since = n ? c - KEYS[n - 1].at : Infinity;
  // The caret waits where the next key lands, or after the last one; it blinks only while idle.
  const next = KEYS[n] ?? { row: TEXT.length - 1, col: TEXT[TEXT.length - 1].length };
  const blink = since < 300 ? 1 : +(Math.floor(c / 450) % 2 === 0);
  return { n, since, blink, caret: [LEFT + next.col * CELL, TOP - next.row * LEAD], fade: c < TYPED + 900 ? 1 : Math.max(0, 1 - (c - TYPED - 900) / 300) };
}

/**
 * Reasoning's walk: a hop every HOP ms to one of the REACH nearest dots, with the last TAIL lit
 * and fading. WALK dots of each walk are kept.
 */
const HOP = 220, TAIL = 5, REACH = 24, WALK = 16;

/**
 * A form for the dots, from `@yogesharc/thinking-orbs/shapes` or your own. `points` returns [x, y, z] points inside
 * the unit sphere, which fills the orb: it's given the number of dots to aim for and the look, like
 * "working" or "background-spiral", so a look can lay its points out its own way.
 */
export type OrbShape = {
  points: (count: number, look: string) => number[][];
  /** Draws it this many times larger. A solid touches the unit sphere only at its corners, so looks small at 1. */
  scale?: number;
  /** Degrees it's seen from further above, on top of `tilt`. */
  tip?: number;
};

/**
 * How the dots are drawn, from `@yogesharc/thinking-orbs/renders` or your own. `mount` makes its elements with
 * `make`, which appends them to the orb's svg, where they fill in `currentColor`. It returns `dot`,
 * called each frame for every point with where it lands in px, its radius and opacity, and which way
 * the spin carries it on screen; then `frame`, once they're all placed. `radius` is a dot's at rest.
 */
export type OrbRender = {
  mount: (orb: { make: (tag: string) => SVGElement; pts: number[][]; size: number; radius: number }) => {
    dot: (i: number, x: number, y: number, r: number, a: number, dx: number, dy: number) => void;
    frame?: () => void;
  };
  /** Draws a flat picture over the orb rather than dots in space: no tilt, and Working's ring runs straight down. */
  flat?: boolean;
};

/** The orb's own look: a circle per dot. No dot drops below 0.45px, or it renders as a grey haze. */
const DOTS: OrbRender = {
  mount: ({ make, pts }) => {
    const els = pts.map(() => make("circle")), hidden = new Uint8Array(pts.length);
    return {
      dot(i, x, y, r, a) {
        const el = els[i], o = a.toFixed(2);
        // A hidden dot stays hidden wherever it is, so skip it: about a third of a sphere, every frame.
        if (o === "0.00" && hidden[i]) return;
        hidden[i] = +(o === "0.00");
        el.setAttribute("cx", x.toFixed(2));
        el.setAttribute("cy", y.toFixed(2));
        el.setAttribute("r", Math.max(0.45, r).toFixed(2));
        el.setAttribute("fill-opacity", o);
      },
    };
  },
};

/**
 * Background · Spiral's eight arms, wound pole to pole, turning a radian of longitude per radian of
 * latitude. Toward the poles every other arm stops where they'd crowd, then every other of those,
 * so the caps fill without clotting.
 */
function arms(count: number): number[][] {
  const at = (lat: number, lon: number) => [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  const g = Math.sqrt((4 * Math.PI) / count), n = 8, along = 0.6 * g;
  return Array.from({ length: n }, (_, m) => {
    const room = m ? m & -m : n;
    const lim = Math.min((85 * Math.PI) / 180, Math.acos(Math.min(1, (g * n) / (TAU * room))));
    const out: number[][] = [];
    // Each arm starts at its own offset so the dots don't line up into rings across arms.
    for (let lat = -lim + ((m * 0.618) % 1) * along; lat <= lim; lat += along / Math.sqrt(1 + Math.cos(lat) ** 2))
      out.push(at(lat, (m / n) * TAU - lat));
    return out;
  }).flat();
}

/** Where the dots sit: on a unit sphere, a Fibonacci spiral, or for Background · Spiral, eight arms. */
function distribute(state: Look, count: number, shape?: OrbShape): number[][] {
  if (shape) return shape.points(count, state);
  if (state === "background-spiral") return arms(count);
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count, r = Math.sqrt(1 - y * y), th = i * GOLDEN;
    return [r * Math.cos(th), y, r * Math.sin(th)];
  });
}

export type OrbOptions = OrbLook & {
  /** Width and height in px. Every orb is tuned to read at 20. */
  size?: number;
  /** How fast it runs: 1 is as designed, 0.5 half speed, 2 double. Every motion in the orb scales together. */
  speed?: number;
  /** What screen readers announce, like "Thinking". Without one the orb is hidden from them. */
  label?: string;
  /**
   * The form the dots sit on, a sphere without one: a shape from `@yogesharc/thinking-orbs/shapes`, or your own, as
   * an `OrbShape` or just its `points` function. Define it outside your component, or the orb redraws every render.
   */
  shape?: OrbShape | OrbShape["points"];
  /** How the dots are drawn, circles without one: a render from `@yogesharc/thinking-orbs/renders`, or your own. */
  render?: OrbRender;
  /** How many dots, as a multiple of the tuned count. */
  density?: number;
  /** How big each dot is, as a multiple of the tuned size. */
  dotSize?: number;
  /** How far it's seen from above, in degrees: 0 side on, 90 straight down. Tuned to 20. */
  tilt?: number;
  /**
   * Which way Using · Scroll scrolls, as a page does: "down" carries the face up. Using clicks out on
   * that side, like a back button for "left". Without one, Scroll pans every way and Using clicks anywhere.
   */
  direction?: OrbDirection;
};

/**
 * Draws an orb into `svg` and keeps it moving until `destroy()`; `pause()` holds it on its frame
 * and `play()` carries on. The orb draws in `currentColor`, so the svg's CSS `color` tints it.
 * With reduced motion it holds still. Needs a browser: call it once the svg is on the page.
 */
export function mountOrb(
  svg: SVGSVGElement,
  { state: asked, variant, size = 20, speed = 1, label, shape, render = DOTS, density = 1, dotSize = 1, tilt = 20, direction }: OrbOptions = {},
) {
  // A state that doesn't exist (from plain JS, say) falls back to idle, and a variant the state doesn't have to its default.
  // Idle was once called base, so that name still finds it.
  const named = asked === "base" ? "idle" : asked;
  const which: OrbState = named && Object.hasOwn(VARIANTS, named) ? named : "idle";
  const own = variant !== "default" && (VARIANTS[which] as readonly string[]).includes(variant ?? "");
  const state = (own ? `${which}-${variant}` : which) as Look;
  const attrs = { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "currentColor" };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    svg.removeAttribute("aria-hidden");
  } else {
    svg.setAttribute("aria-hidden", "true");
    svg.removeAttribute("role");
    svg.removeAttribute("aria-label");
  }
  // Background's orb has a quarter of the dots, so each comes out twice the size.
  // Using draws its arrow, and Type its text, in the dots: that takes about 1000 of them, finer, however small the orb.
  const dens = state === "background" ? 1 : state === "using" || state === "using-type" ? Math.max(4, 1000 / size) : 4;
  const count = Math.max(8, Math.round(size * dens * density));
  // Dots shrink as they multiply, so the sphere's coverage holds steady.
  const form = typeof shape === "function" ? { points: shape } : shape;
  const c = size / 2, R = c * 0.8 * (form?.scale ?? 1), rs = (size / 64) ** 0.6 * (0.72 * Math.sqrt(4 / dens)) * dotSize;
  const pts = distribute(state, count, form);
  // SVG, not canvas: vectors stay sharp under pinch zoom. One ink blends the same in any order, so no depth sort.
  const make = (tag: string) => svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", tag));
  const drawer = render.mount({ make: make as (tag: string) => SVGElement, pts, size, radius: rs }), flat = !!render.flat;
  // A walk needs somewhere to go: with under two dots, Reasoning just spins.
  const reasoning = (state === "reasoning" || state === "reasoning-twins") && pts.length > 1;
  const compacting = state === "compacting" || state === "compacting-fuse";
  // Reasoning: each dot's REACH nearest neighbours for the walk to hop between, and each walker's walk so far (head last).
  const near = reasoning
    ? pts.map((_, i) => nearest(pts, i, REACH))
    : [];
  const walks: number[][] = Array.from({ length: state === "reasoning-twins" ? 2 : 1 }, () => []);
  let hops = 0;
  // Scroll's whole flicks so far when it pans, so each frame stacks only the new ones.
  let panned = { k: 0, m: [1, 0, 0, 0, 1, 0, 0, 0, 1] };

  const draw = (t: number) => {
    const period = PERIOD[state], yaw = yawOf(state, t);
    const scroll = state === "using-scroll" ? scrollAt(t) : null;
    const way = direction && DIRECTIONS[direction];
    let pan: number[] | null = null;
    if (scroll && way !== undefined) {
      // Given a direction, Scroll keeps to it, and the face moves against it, as a page's content does.
      pan = panTurn((way * Math.PI) / 180 + Math.PI, scroll.by);
    } else if (scroll) {
      // Without one it pans: the flicks so far, stacked up once each, then the one under way on top.
      const k = Math.floor(t / FLICK);
      if (k < panned.k) panned = { k: 0, m: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
      for (; panned.k < k; panned.k++) panned.m = times(panTurn(PAN[panned.k % PAN.length], FLING), panned.m);
      pan = times(panTurn(PAN[k % PAN.length], scroll.by - k * FLING), panned.m);
    }
    // Working · Gyro's axis circles every 5s like a spinning top's, tipping ±10° toward you and leaning ±12° side to side.
    const gyro = state === "working-gyro" ? (t / 5000) * TAU : null;
    const pitch = (((flat ? 0 : tilt) + (form?.tip ?? 0) + (gyro === null ? 0 : 10 * Math.cos(gyro))) * Math.PI) / 180;
    const roll = gyro === null ? 0 : ((12 * Math.sin(gyro)) * Math.PI) / 180, sr = Math.sin(roll), cr = Math.cos(roll);
    const sy = Math.sin(yaw), cy = Math.cos(yaw), st = Math.sin(pitch), ct = Math.cos(pitch);
    // How far a dot faces you right now, which the walk steers by.
    const facing = (k: number) => pts[k][1] * st + (-pts[k][0] * sy + pts[k][2] * cy) * ct;
    // Reasoning: how lit each dot on the walk's tail is, the head brightest.
    const lit = new Map<number, number>();
    if (reasoning) {
      const s = t / HOP, n = Math.floor(s), f = s - n;
      if (!walks[0].length) {
        // The first walker starts at the dot facing you most; a second, at a front dot well away from it.
        const first = [...pts.keys()].reduce((b, k) => (facing(k) > facing(b) ? k : b), 0);
        const apart = (k: number) => facing(k) + dist2(pts[k], pts[first]);
        walks.forEach((walk, w) => walk.push(w ? [...pts.keys()].reduce((b, k) => (apart(k) > apart(b) ? k : b), 0) : first));
      }
      hops = Math.max(hops, n - WALK);
      for (; hops < n; hops++) {
        walks.forEach((walk, w) => {
          // Hop to the neighbour that faces you most, with a little chance mixed in so it wanders.
          const recent = walk.slice(-8), from = walk[walk.length - 1];
          let best = -1, score = -Infinity;
          // With two walkers, each also pushes away from the other's head, up to ~45° apart.
          const other = state === "reasoning-twins" ? walks[1 - w].at(-1) : undefined;
          near[from].forEach((k, j) => {
            const apart = other === undefined ? 0 : 1.2 * Math.min(Math.sqrt(dist2(pts[k], pts[other])), 0.8);
            const sc = facing(k) + 0.35 * hash(hops * 31 + j + w * 977) + apart;
            if (!recent.includes(k) && sc > score) {
              score = sc;
              best = k;
            }
          });
          // With only a handful of dots every neighbour can be recent, so it hops back to the nearest.
          walk.push(best < 0 ? near[from][0] : best);
          if (walk.length > WALK) walk.shift();
        });
      }
      const light = (k: number | undefined, v: number) => k !== undefined && lit.set(k, Math.max(lit.get(k) ?? 0, v));
      for (const walk of walks)
        for (let j = TAIL - 1; j >= 0; j--) light(walk[walk.length - 1 - j], j === 0 ? ease(Math.min(1, f * 2)) : 1 - (j - 1 + f) / TAIL);
    }
    // Waiting: a comet's head runs round a lap every 2s on screen, spiralling from 70° north to
    // 70° south every 6s. `ahead` is how fast it moves over the sphere's own surface, in rad/ms.
    const head = (t / 2000) * TAU + yaw, ahead = TAU / 2000 + TAU / period;
    const headLat = (tt: number) => ((70 * Math.PI) / 180) * (1 - 2 * ((tt % 6000) / 6000));
    // It fades in and out over the first and last ~10% of each descent, so the jump back to the top doesn't show.
    const glow = Math.min(1, 3 * Math.sin(Math.PI * ((t % 6000) / 6000)));
    // The lens lives in view space, so it searches the face you see while the sphere turns under it.
    const lens = state === "searching" ? lensAt(t) : null;
    // Gyro and Squeeze twist back and forth every 2.6s, Gyro at half the twist.
    const tw = state === "working-gyro" ? 0.5 * Math.sin((t / 2600) * TAU) : state === "compacting-squeeze" ? Math.sin((t / 2600) * TAU) : 0;
    // Compacting: a line crosses left to right over 2s, packing what it's passed, then all lets go
    // over 0.8s. Compacting springs back past loose; Fuse burns out like a firework, with no bounce.
    let sweep: { at: number; hold: number } | null = null;
    if (compacting) {
      const u = (t % 2800) / 2800, s = (u - 0.7) / 0.3;
      const release =
        state === "compacting-fuse"
          ? (1 - s) ** 3
          : s < 0.45
            ? 1 - 1.25 * ease(s / 0.45)
            : s < 0.7
              ? -0.25 * (1 - (s - 0.45) / 0.25) ** 2
              : 0;
      sweep = { at: -1.15 + 2.3 * Math.min(1, u / 0.7), hold: u < 0.7 ? 1 : release };
    }

    let tap: ReturnType<typeof tapAt> | null = null;
    if (state === "using-tap") tap = tapAt(t);
    // Using's cursor is an arrow drawn in the dots under it.
    const outline = state === "using";
    if (outline) {
      // Given a direction it keeps clicking that side; without one it wanders the face.
      const p = way === undefined ? tapAt(t) : null;
      tap = p ? { ...p, at: tipOf(p.at), click: tipOf(p.click) } : aimAt(t, ((way ?? 0) * Math.PI) / 180);
    }
    // The arrow shrinks toward its tip as a click presses.
    const k = outline && tap ? 1 - 0.15 * pressOf(tap.since) : 1;
    const type = state === "using-type" ? typeAt(t) : null;
    const zoom = state === "using-zoom" ? zoomAt(t) : null;
    const flash = state === "using-snap" ? snapAt(t) : null;
    const lids = state === "idle-blink" ? blinkAt(t) : null;
    const rec = state === "using-record" ? recAt(t) : null;
    pts.forEach(([x, y, z], i) => {
      // Twist turns each dot by an angle that grows with its height: top and bottom opposite ways.
      const turn = yaw + TWIST * tw * y;
      const [ly, lc] = tw ? [Math.sin(turn), Math.cos(turn)] : [sy, cy];
      const z1 = -x * ly + z * lc;
      let vx = x * lc + z * ly, vy = y * ct - z1 * st;
      // Which way the spin carries this dot across the screen, for renders that draw along it.
      const sx = z1, sy2 = vx * st;
      let vz = y * st + z1 * ct;
      if (pan) [vx, vy, vz] = [0, 3, 6].map((j) => pan[j] * vx + pan[j + 1] * vy + pan[j + 2] * vz);
      const d = (vz + 1) / 2;
      let r = (0.5 + 1.4 * d) * rs;
      // Opacity ramps from 0 just behind the rim to 1 at the front, so the back fades instead of leaving a haze.
      let a = Math.max(0, (d - 0.3) / 0.7);
      if (lens) {
        // By direction, not position: a solid's dots sit at different distances from the centre.
        const ang = Math.acos(Math.min(1, (vx * lens[0] + vy * lens[1] + vz * lens[2]) / Math.hypot(vx, vy, vz)));
        const w = ang < LENS ? (1 - (ang / LENS) ** 2) ** 2 : 0;
        // Dim what's outside the lens. At 24px and under, dots are ~1px and growth alone barely reads, so it enlarges harder.
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
      if (sweep) {
        // Packed dots pull in and shrink, fully once the line is 0.2 past them: Compacting by 30%
        // and 45%, Fuse by 20% and 30%, fading them to half as well.
        const q = vx, w = Math.min(1, Math.max(0, (sweep.at - q) / 0.2)) * sweep.hold;
        const k = state === "compacting" ? 1.5 : 1;
        vx *= 1 - 0.2 * k * w;
        vy *= 1 - 0.2 * k * w;
        r *= 1 - 0.3 * k * w;
        if (state === "compacting-fuse") {
          a *= 1 - 0.5 * w;
          // Fuse's line burns on the near half only, dots at it growing and lighting up.
          const g = Math.exp(-(((q - sweep.at) / 0.08) ** 2)) * Math.max(0, sweep.hold) * Math.min(1, d / 0.5);
          r *= 1 + 0.8 * g;
          a += (1 - a) * g;
        }
      }
      if (state === "working") {
        // Every 1.7s a ring of light runs down the sphere over 1.2s, through the back as well as the
        // front. What it's passed pulls in 8% and shrinks 15%, then lets go over 0.5s.
        const u = t % 1700, at = 1.3 - 2.6 * ease(Math.min(1, u / 1200));
        // Halftone and Lines are flat pictures, so there the ring runs straight down rather than leaning into depth.
        const q = flat ? vy : vx * RING_AXIS[0] + vy * RING_AXIS[1] + vz * RING_AXIS[2];
        const g = u < 1200 ? Math.exp(-(((q - at) / 0.2) ** 2)) : 0;
        r *= 1 + 0.6 * g;
        a += (1 - a) * g;
        const w = Math.min(1, Math.max(0, (q - at) / 0.2)) * (u < 1200 ? 1 : 1 - Math.min(1, 1.6 * ((u - 1200) / 800)));
        vx *= 1 - 0.08 * w;
        vy *= 1 - 0.08 * w;
        r *= 1 - 0.15 * w;
      }
      if (state === "searching-lighthouse") {
        // A beam leaning 30° right circles the axis, a lap every 2.5s, crossing the face left to
        // right, with a trail dying out 90° behind it. It's full on the near half and a quarter
        // behind, over a sphere resting at 50%.
        a *= 0.5;
        const lr = Math.sin(LEAN), lc = Math.cos(LEAN);
        const across = vx * lc - vy * lr, toward = -st * (vx * lr + vy * lc) + ct * vz;
        const off = Math.atan2(across, toward) - (((t / 2500) % 1) * TAU - Math.PI);
        const dphi = ((((off + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
        const beam = dphi < 0 ? Math.max(0, 1 + dphi / TRAIL) : Math.exp(-((dphi / 0.45) ** 2));
        const g = beam * (0.25 + 0.75 * Math.min(1, Math.max(0, (d - 0.4) / 0.3)));
        r *= 1 + 0.6 * g;
        a += (1 - a) * g;
      }
      if (reasoning) {
        // The sphere rests at 50%, so only the walk reaches full.
        const spark = lit.get(i) ?? 0;
        a *= 0.5;
        if (spark) {
          r *= 1 + 0.8 * spark;
          a += (1 - a) * spark;
        }
      }
      if (state === "waiting") {
        // A sharp head and a long fading tail, lit round the back too, over a sphere at 50%.
        // Its width is measured along the surface, so it keeps its size away from the equator.
        const lat = Math.asin(y / (Math.hypot(x, y, z) || 1)), lon = Math.atan2(z, x);
        const off = Math.atan2(Math.sin(lon - head), Math.cos(lon - head)), along = off * Math.cos(lat);
        const g =
          Math.exp(-(((lat - headLat(t + off / ahead)) / 0.28) ** 2)) * Math.exp(-((along / (off * ahead > 0 ? 0.12 : 1)) ** 2));
        const w = glow * g ** 0.6;
        a = a * 0.5 + (1 - a * 0.5) * w;
        r *= 1 + 1.1 * w;
      }
      if (tap) {
        // The angle off a view-space direction, by direction like the lens.
        const n = Math.hypot(vx, vy, vz) || 1;
        const off = (p: number[]) => Math.acos(Math.min(1, Math.max(-1, (vx * p[0] + vy * p[1] + vz * p[2]) / n)));
        // Using rests darker, so the arrow stands out where its dots crowd together at small sizes.
        a *= outline ? 0.25 : 0.5;
        // A click dents what's under it for 300ms, and a ring runs out from it, fading.
        const s = tap.since, ptr = outline ? 0 : bump(off(tap.at), PTR), ak = off(tap.click);
        const press = pressOf(s), pw = press * bump(ak, PRESS);
        const run = Math.min(1, s / RIPPLE_MS);
        const ring = Math.exp(-(((ak - (0.15 + 1.3 * (1 - (1 - run) ** 2))) / 0.18) ** 2)) * (1 - run) ** 2;
        vx *= 1 - 0.14 * pw;
        vy *= 1 - 0.14 * pw;
        r *= (1 - 0.35 * pw) * (1 + 0.7 * Math.max(ring, ptr * (1 - press)));
        a += (1 - a) * Math.max(ptr, ring);
        if (outline && inside(ARROW, (vx - tap.at[0]) / k, (tap.at[1] - vy) / k)) {
          // The dots inside the arrow light up, on the near side only. They barely grow, or they'd blur its edge.
          const lit = Math.min(1, Math.max(0, (d - 0.5) / 0.2));
          r *= 1 + 0.15 * lit;
          a += (1 - a) * lit;
        }
      }
      if (type) {
        // The paragraph lights cell by cell as it's typed, the newest letter brightest, spaces left
        // dark. The caret is an upright bar where the next key lands. The rest sits dark, like Using.
        a *= 0.25;
        const row = Math.round((TOP - vy) / LEAD), col = Math.floor((vx - LEFT) / CELL), key = KEY_OF[row]?.[col];
        let g = 0;
        if (key !== undefined && key < type.n && TEXT[row][col] === "x" && Math.abs(TOP - row * LEAD - vy) < 0.085)
          g = 0.75 + (key === type.n - 1 ? 0.25 * Math.exp(-type.since / 120) : 0);
        const [cx, cy] = type.caret;
        if (Math.abs(vy - cy) < 0.1) g = Math.max(g, type.blink * Math.exp(-(((vx - cx) / 0.04) ** 2)));
        a += (1 - a) * g * type.fade * Math.min(1, Math.max(0, (d - 0.5) / 0.2));
      }
      if (zoom) {
        // The front swells out toward the rim and its dots grow, as if you'd moved closer. Past the rim they fade.
        const w = zoom * Math.max(0, vz);
        vx *= 1 + 0.45 * w;
        vy *= 1 + 0.45 * w;
        r *= 1 + 0.8 * w;
        a *= Math.min(1, Math.max(0, (1.05 - Math.hypot(vx, vy)) / 0.1));
      }
      // Scroll brightens with its pace, so a flick reads as a burst and the coast as settling.
      if (scroll) a *= 0.55 + 0.45 * scroll.pace;
      if (flash !== null) {
        // A sphere at 55% lights up as it stops, and dims back while it holds.
        a *= 0.55;
        r *= 1 + 0.25 * flash;
        a += (1 - a) * flash;
      }
      if (lids !== null) {
        // Shut beyond the lids, with their edges lit as they close and part.
        const edge = Math.exp(-(((Math.abs(vy) - lids) / 0.06) ** 2)) * (lids < 1.2 ? 1 : 0);
        a *= Math.min(1, Math.max(0, (lids - Math.abs(vy)) / 0.08));
        r *= 1 + 0.4 * edge;
        a += (1 - a) * edge * Math.min(1, Math.max(0, (d - 0.4) / 0.3));
      }
      if (rec !== null) {
        // The whole orb pulses like a recording light, dropping to a third and 8% smaller at its low.
        vx *= 0.92 + 0.08 * rec;
        vy *= 0.92 + 0.08 * rec;
        a *= 0.3 + 0.7 * rec;
      }
      if (roll) [vx, vy] = [vx * cr - vy * sr, vx * sr + vy * cr];
      drawer.dot(i, c + vx * R, c - vy * R, r, a, sx, -sy2);
    });
    drawer.frame?.();
  };

  const look = `${state}@${speed}`;
  draw(tick(look, performance.now(), speed));
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Only orbs on screen redraw, and only they move their look's clock on. So an orb starts from its
  // first frame when it first comes into view, rather than partway through, and picks up where it
  // left off when it comes back. The observer reports at once, so it starts out unseen.
  let visible = false, raf = 0, dead = false;
  const io = new IntersectionObserver((es) => (visible = es[es.length - 1].isIntersecting));
  io.observe(svg);
  function frame(now: number) {
    if (visible) draw(tick(look, now, speed));
    raf = requestAnimationFrame(frame);
  }
  // Paused, it stops ticking too: alone it picks up where it stopped, and beside others of its look it rejoins them in step.
  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const play = () => {
    if (!raf && !still && !dead) raf = requestAnimationFrame(frame);
  };
  play();
  return {
    pause,
    play,
    destroy() {
      dead = true;
      pause();
      io.disconnect();
      svg.replaceChildren();
    },
  };
}
