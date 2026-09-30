import { ImageResponse } from "next/og";
import { mountOrb, type OrbOptions } from "@/registry/orb/orb-core";

export const alt = "Thinking Orbs: well-crafted status indicators for AI interfaces";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Geist at 500, the site's heading weight. Without a user agent Google serves TTF, which the renderer needs. */
async function geistMedium() {
  const css = await (await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@500")).text();
  const url = css.match(/src: url\((.+?)\) format\('truetype'\)/)?.[1];
  if (!url) throw new Error("Geist Medium: no TTF in Google Fonts' CSS");
  return (await fetch(url)).arrayBuffer();
}

/** Each look at a moment its own effect shows: the ring mid-run, the lens at rest, Fuse's line halfway across. */
const LOOKS: [OrbOptions, number][] = [
  [{ state: "working" }, 700],
  [{ state: "searching" }, 2800],
  [{ state: "compacting", variant: "fuse" }, 980],
  [{ state: "background", variant: "spiral" }, 0],
];
const ORB = 120;

type Dot = { x: number; y: number; r: number; a: number };

/**
 * One drawing of a real orb, with no DOM: a render that records its dots, and for the two browser globals
 * mountOrb touches, reduced motion (so no animation loop) and an observer that does nothing. They exist
 * only while it runs, which is synchronous, so nothing else on the server ever sees them.
 */
function draw(look: OrbOptions, speed: number) {
  const dots: Dot[] = [];
  const svg = { setAttribute() {}, removeAttribute() {}, replaceChildren() {} } as unknown as SVGSVGElement;
  const render = { mount: () => ({ dot: (_: number, x: number, y: number, r: number, a: number) => void dots.push({ x, y, r, a }) }) };
  const g = globalThis as Record<string, unknown>;
  g.matchMedia = () => ({ matches: true });
  g.IntersectionObserver = class { observe() {} disconnect() {} };
  try {
    mountOrb(svg, { ...look, size: ORB, speed, render });
  } finally {
    delete g.matchMedia;
    delete g.IntersectionObserver;
  }
  return dots;
}

/**
 * Each look at its moment `t`. An orb's first drawing is at t=0 on a clock shared by its state and speed,
 * which later drawings advance by the time since, capped at 100ms and times the speed. So one drawing,
 * a wait past the cap, and a second at speed t/100 lands exactly on t. Each call nudges the speed by a
 * random hair, so it gets clocks of its own rather than carrying on from an earlier call's, even across
 * a reload of this file that keeps orb-core's clocks. The hair moves t by under a thousandth of a ms.
 */
async function stills() {
  const nudge = Math.random() * 1e-6, speed = (t: number) => (t / 100 || 1) + nudge;
  for (const [look, t] of LOOKS) draw(look, speed(t));
  await new Promise((done) => setTimeout(done, 120));
  return LOOKS.map(([look, t]) => draw(look, speed(t)));
}

export default async function Image() {
  const [orbs, font] = await Promise.all([stills(), geistMedium()]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#000", fontFamily: "Geist" }}>
        <div style={{ display: "flex", gap: 32 }}>
          {orbs.map((dots, k) => (
            <svg key={k} width={ORB} height={ORB} viewBox={`0 0 ${ORB} ${ORB}`}>
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={Math.max(0.45, d.r)} fill="#fafafa" fillOpacity={d.a} />
              ))}
            </svg>
          ))}
        </div>
        {/* The tagline's lines are set by hand, so it never wraps to a third. */}
        <div style={{ display: "flex", fontSize: 48, lineHeight: 1.25 }}>
          <div style={{ width: 380, color: "#fafafa" }}>Thinking Orbs</div>
          <div style={{ display: "flex", flexDirection: "column", color: "#a1a1a1" }}>
            <div>Well-crafted status indicators</div>
            <div>for AI interfaces.</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: font, weight: 500 }] },
  );
}
