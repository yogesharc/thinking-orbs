"use client";

import { useEffect, useRef } from "react";
import { mountOrb, type OrbLook, type OrbOptions, type OrbRender, type OrbShape, type OrbState, type OrbVariant } from "./orb-core";

export type { OrbLook, OrbOptions, OrbRender, OrbShape, OrbState, OrbVariant };

/**
 * An animated dotted sphere for what an AI agent is doing: a `state`, and optionally one of that
 * state's `variant`s. It draws in the text color, so `text-*` classes tint it, and every orb is
 * tuned to read at 20px. `shape`, `render`, `density`, `dotSize` and `tilt` change how it's drawn.
 * `paused` holds it on its frame. With reduced motion it holds still.
 */
export function Orb({
  state,
  variant,
  size = 20,
  speed = 1,
  paused = false,
  label,
  shape,
  render,
  density,
  dotSize,
  tilt,
  className,
}: OrbOptions & { paused?: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const orb = useRef<ReturnType<typeof mountOrb>>(null);
  useEffect(() => {
    // Destructuring split state from variant, so TypeScript no longer sees they belong together.
    const o = (orb.current = mountOrb(ref.current!, { state, variant, size, speed, label, shape, render, density, dotSize, tilt } as OrbOptions));
    return o.destroy;
  }, [state, variant, size, speed, label, shape, render, density, dotSize, tilt]);
  // After the mount above, so a remounted orb comes back paused if it should be.
  useEffect(() => {
    if (paused) orb.current!.pause();
    else orb.current!.play();
  }, [paused, state, variant, size, speed, label, shape, render, density, dotSize, tilt]);
  return <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" className={className} />;
}
