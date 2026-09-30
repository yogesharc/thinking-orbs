import { nearest, type OrbRender } from "./orb-core";

// Extra ways to draw the orb for its `render` prop: `<Orb render={halftone} />`. Import only the ones you use.

const set = (el: Element, attrs: Record<string, number | string>) => {
  for (const k in attrs) el.setAttribute(k, typeof attrs[k] === "number" ? (attrs[k] as number).toFixed(2) : String(attrs[k]));
};
/** No mark drops below 0.45px, or it renders as a grey haze. */
const min = (r: number) => Math.max(0.45, r);
const stroked = (el: SVGElement) => {
  set(el, { stroke: "currentColor", "stroke-linecap": "round" });
  return el;
};

/** Each dot a short stroke along the way the spin carries it. */
export const dashes: OrbRender = {
  mount: ({ make, pts }) => {
    const els = pts.map(() => stroked(make("line")));
    return {
      dot(i, x, y, r, a, dx, dy) {
        const rr = min(r), len = Math.hypot(dx, dy) || 1, ux = (dx / len) * rr * 1.8, uy = (dy / len) * rr * 1.8;
        set(els[i], { x1: x - ux, y1: y - uy, x2: x + ux, y2: y + uy, "stroke-width": Math.max(0.5, rr * 0.9), "stroke-opacity": a });
      },
    };
  },
};

/** Each dot a square. */
export const squares: OrbRender = {
  mount: ({ make, pts }) => {
    const els = pts.map(() => make("rect"));
    return {
      dot(i, x, y, r, a) {
        const h = min(r) * 0.9;
        set(els[i], { x: x - h, y: y - h, width: 2 * h, height: 2 * h, "fill-opacity": a });
      },
    };
  },
};

/** Each dot a small + mark. */
export const crosses: OrbRender = {
  mount: ({ make, pts }) => {
    const els = pts.map(() => stroked(make("path")));
    return {
      dot(i, x, y, r, a) {
        const rr = min(r), h = rr * 1.4, [cx, cy, l, t, rt, b] = [x, y, x - h, y - h, x + h, y + h].map((v) => v.toFixed(2));
        set(els[i], { d: `M${l} ${cy}H${rt}M${cx} ${t}V${b}`, "stroke-width": Math.max(0.5, rr * 0.7), "stroke-opacity": a });
      },
    };
  },
};

/** Each dot joined to its 3 nearest, every pair once, with small dots at the joints. */
export const mesh: OrbRender = {
  mount: ({ make, pts, radius }) => {
    const pairs: [number, number][] = [], seen = new Set<number>();
    pts.forEach((_, i) =>
      nearest(pts, i, 3).forEach((j) => {
        const key = Math.min(i, j) * pts.length + Math.max(i, j);
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([i, j]);
        }
      }),
    );
    // Edges first, so they sit under the dots.
    const edges = pairs.map(() => {
      const el = make("line");
      set(el, { stroke: "currentColor", "stroke-width": Math.max(0.35, radius * 0.6) });
      return el;
    });
    const els = pts.map(() => make("circle")), at = pts.map(() => [0, 0, 0]);
    return {
      dot(i, x, y, r, a) {
        at[i] = [x, y, a];
        set(els[i], { cx: x, cy: y, r: min(r) * 0.4, "fill-opacity": a });
      },
      frame() {
        pairs.forEach(([i, j], e) => {
          const [x1, y1, a1] = at[i], [x2, y2, a2] = at[j];
          set(edges[e], { x1, y1, x2, y2, "stroke-opacity": 0.85 * Math.min(a1, a2) });
        });
      },
    };
  },
};

/**
 * A fixed g × g screen over the orb, each cell toned by the dots landing on it, each dot split between
 * its four nearest cells so one moving between them fades from one to the next.
 */
function screen(size: number, count: number, radius: number) {
  const g = Math.max(6, Math.round(Math.sqrt(count) * 0.9)), cell = size / g;
  // Per cell: the brightness of what lands on it, and how much visibly lands.
  const ink = new Float32Array(g * g), hits = new Float32Array(g * g);
  return {
    g,
    cell,
    add(x: number, y: number, r: number, a: number) {
      const fx = x / cell - 0.5, fy = y / cell - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      for (const [ox, oy, f] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]]) {
        const gx = ix + ox, gy = iy + oy;
        if (gx < 0 || gy < 0 || gx >= g || gy >= g) continue;
        // Weighted by opacity, so the hidden back, landing on the same cells, doesn't water the front down;
        // brightness is the dot's size, which grows toward you and with every highlight, shaded a little by
        // opacity so a sphere still rounds off at its rim without a solid's slanted faces going dim.
        ink[gy * g + gx] += (a * r * f * (0.4 + 0.6 * a)) / radius;
        hits[gy * g + gx] += a * f;
      }
    },
    /**
     * A cell's size, as a radius: its average dot, times how covered it is. Grid spacing puts ~0.6 of a
     * dot on each cell of a face, so under 0.3 it's an edge thinning out. A front dot at rest fills most of the cell; highlights fill it.
     */
    tone: (k: number) => hits[k] && 0.5 * cell * Math.min(1, ((ink[k] / hits[k]) * Math.min(1, hits[k] / 0.3)) / 2.2),
    clear() {
      ink.fill(0);
      hits.fill(0);
    },
  };
}

/** A fixed grid of dots over the orb, each sized by how much of it lies beneath, like print. */
export const halftone: OrbRender = {
  flat: true,
  mount: ({ make, pts, size, radius }) => {
    const s = screen(size, pts.length, radius);
    const els = Array.from({ length: s.g * s.g }, (_, k) => {
      const el = make("circle");
      set(el, { cx: ((k % s.g) + 0.5) * s.cell, cy: (Math.floor(k / s.g) + 0.5) * s.cell });
      return el;
    });
    return {
      dot: (_, x, y, r, a) => s.add(x, y, r, a),
      frame() {
        els.forEach((el, k) => {
          const r = s.tone(k);
          el.setAttribute("r", (r < 0.3 ? 0 : r).toFixed(2));
        });
        s.clear();
      },
    };
  },
};

/**
 * Lines across the orb, like an engraving, each swelling where the orb lies beneath: every line runs
 * edge to edge through a row of the screen, pushed apart by 80% of each cell's tone so lines never touch.
 */
const striped = (vertical: boolean): OrbRender => ({
  flat: true,
  mount: ({ make, pts, size, radius }) => {
    const s = screen(size, pts.length, radius), els = Array.from({ length: s.g }, () => make("path"));
    // A point `u` along the line and `v` across it.
    const pt = (u: number, v: number) => (vertical ? `${v.toFixed(2)} ${u.toFixed(2)}` : `${u.toFixed(2)} ${v.toFixed(2)}`);
    return {
      dot: (_, x, y, r, a) => s.add(x, y, r, a),
      frame() {
        els.forEach((el, j) => {
          const v = (j + 0.5) * s.cell, along = Array.from({ length: s.g }, (_, k) => [(k + 0.5) * s.cell, 0.8 * s.tone(vertical ? k * s.g + j : j * s.g + k)]);
          const edge = (sign: number) => along.map(([u, h]) => pt(u, v + sign * h));
          el.setAttribute("d", `M${pt(0, v)}L${edge(-1).join("L")}L${pt(size, v)}L${edge(1).reverse().join("L")}Z`);
        });
        s.clear();
      },
    };
  },
});

/** Horizontal lines. */
export const lines = striped(false);
/** Vertical lines. */
export const verticalLines = striped(true);
