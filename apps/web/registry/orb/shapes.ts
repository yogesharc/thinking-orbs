// Client, so a Server Component can hand these to <Orb>: they're objects with functions in them.
"use client";

import type { OrbShape } from "./orb-core";

// Extra forms for the orb's `shape` prop: `<Orb shape={cube} />`. Each fits inside the unit sphere and
// is about as tall as it's wide, so every state's effects still land; import only the ones you use.

const TAU = Math.PI * 2;

/** The tetrahedron's base: three corners this far out at height -1/3, its point at the top of the unit sphere. */
const TRI = Math.sqrt(8 / 9);

/**
 * Background · Spiral on a solid: its outline in rings of dots, like contour lines, each ring's dots
 * spaced as closely as the sphere's arms. The cube is upright squares side by side, the first and
 * last tracing its faces; the octahedron, stacked diamonds shrinking to its tips; the tetrahedron,
 * stacked triangles shrinking to its point.
 */
function layers(solid: "cube" | "octahedron" | "tetrahedron", count: number): number[][] {
  const gap = 0.6 * Math.sqrt((4 * Math.PI) / count), n = 6, out: number[][] = [];
  // Dots round a closed outline at height `y`, through `corners` given as [x, z].
  const ring = (y: number, corners: number[][]) =>
    corners.forEach(([ax, az], k) => {
      const [bx, bz] = corners[(k + 1) % corners.length], steps = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / gap));
      for (let q = 0; q < steps; q++) out.push([ax + ((bx - ax) * q) / steps, y, az + ((bz - az) * q) / steps]);
    });
  if (solid === "cube") {
    const h = 1 / Math.sqrt(3);
    for (let i = 0; i < n; i++) ring(h * ((2 * i) / (n - 1) - 1), [[h, h], [-h, h], [-h, -h], [h, -h]]);
    // Stood on edge, side by side across it, so the spin turns them like pages.
    return out.map(([x, y, z]) => [y, x, z]);
  }
  out.push([0, 1, 0]);
  if (solid === "octahedron") {
    out.push([0, -1, 0]);
    for (let i = 1; i <= n; i++) {
      const y = (2 * i) / (n + 1) - 1, w = 1 - Math.abs(y);
      ring(y, [[w, 0], [0, w], [-w, 0], [0, -w]]);
    }
  } else
    for (let i = 0; i < n; i++) {
      const y = -1 / 3 + (4 / 3) * (i / n), w = TRI * (1 - y) * 0.75;
      ring(y, [0, 1, 2].map((k) => [w * Math.cos((k * TAU) / 3), w * Math.sin((k * TAU) / 3)]));
    }
  return out;
}

// The solids use a regular grid with dots on every edge and corner, so even Background's few dots keep
// the outline, and Background · Spiral becomes `layers`. They reach the unit sphere only at their
// corners, so they draw 1.2x larger to look the sphere's size; corners still clear the frame.

/** A cube: n steps along each edge, 6n² + 2 dots. */
export const cube: OrbShape = {
  scale: 1.2,
  points(count, look) {
    if (look === "background-spiral") return layers("cube", count);
    const n = Math.max(1, Math.round(Math.sqrt((count - 2) / 6))), at = (i: number) => (2 * i) / n - 1, out: number[][] = [];
    for (let a = 0; a <= n; a++)
      for (let b = 0; b <= n; b++)
        for (let c = 0; c <= n; c++)
          if (a % n === 0 || b % n === 0 || c % n === 0) out.push([at(a), at(b), at(c)].map((v) => v / Math.sqrt(3)));
    return out;
  },
};

/** An octahedron: every point with |i| + |j| + |k| = n, 4n² + 2 dots. */
export const octahedron: OrbShape = {
  scale: 1.2,
  points(count, look) {
    if (look === "background-spiral") return layers("octahedron", count);
    const n = Math.max(1, Math.round(Math.sqrt((count - 2) / 4))), out: number[][] = [];
    for (let i = -n; i <= n; i++)
      for (let j = Math.abs(i) - n; j <= n - Math.abs(i); j++) {
        const k = n - Math.abs(i) - Math.abs(j);
        out.push([i / n, j / n, k / n]);
        if (k) out.push([i / n, j / n, -k / n]);
      }
    return out;
  },
};

/** A tetrahedron, point up: a triangular grid on each face, n steps to an edge, dots on shared edges kept once. */
export const tetrahedron: OrbShape = {
  scale: 1.2,
  points(count, look) {
    let out: number[][];
    if (look === "background-spiral") out = layers("tetrahedron", count);
    else {
      const top = [0, 1, 0], base = [0, 1, 2].map((k) => [TRI * Math.cos((k * TAU) / 3), -1 / 3, TRI * Math.sin((k * TAU) / 3)]);
      const n = Math.max(1, Math.round(Math.sqrt((count - 2) / 2))), seen = new Map<string, number[]>();
      for (const [A, B, C] of [[top, base[0], base[1]], [top, base[1], base[2]], [top, base[2], base[0]], base])
        for (let i = 0; i <= n; i++)
          for (let j = 0; i + j <= n; j++) {
            const p = A.map((a, k) => a + ((B[k] - a) * i + (C[k] - a) * j) / n);
            seen.set(p.map((v) => Math.round(v * 1e4)).join(), p);
          }
      out = [...seen.values()];
    }
    // Centred on its height rather than its centroid, so it doesn't sit high, and scaled back inside the unit sphere.
    return out.map(([x, y, z]) => [x, y - 1 / 3, z].map((v) => v * Math.sqrt(3 / 4)));
  },
};

/** The torus: its ring's radius and its tube's. */
const RING = 0.65, TUBE = 0.3;

/**
 * A torus lying flat, seen 35° further from above so its hole shows all the way round: the spin
 * carries the dots round the ring rather than turning it edge on. Dots are spread by area, so the
 * inside of the ring isn't crowded. Background · Spiral winds strands round the tube, like a coiled spring.
 */
export const torus: OrbShape = {
  scale: 1.2,
  tip: 35,
  points(count, look) {
    const at = (u: number, v: number) => {
      const w = RING + TUBE * Math.cos(v);
      return [w * Math.cos(u), TUBE * Math.sin(v), w * Math.sin(u)];
    };
    const out: number[][] = [];
    if (look === "background-spiral") {
      const along = 0.6 * Math.sqrt((4 * Math.PI) / count), strands = 6, turns = 3;
      for (let k = 0; k < strands; k++)
        for (let u = 0; u < TAU; ) {
          const v = (k / strands) * TAU + turns * u;
          out.push(at(u, v));
          u += along / Math.hypot(RING + TUBE * Math.cos(v), TUBE * turns);
        }
      return out;
    }
    const gap = Math.sqrt((4 * Math.PI ** 2 * RING * TUBE) / count), nv = Math.max(3, Math.round((TAU * TUBE) / gap));
    for (let j = 0; j < nv; j++) {
      const v = (j / nv) * TAU, nu = Math.max(3, Math.round((TAU * (RING + TUBE * Math.cos(v))) / gap));
      for (let i = 0; i < nu; i++) out.push(at(((i + (j % 2) / 2) / nu) * TAU, v));
    }
    return out;
  },
};
