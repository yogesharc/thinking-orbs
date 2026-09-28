"use client";

import { useEffect, useRef } from "react";
import { mountOrb, type OrbOptions, type OrbState } from "./orb-core";

export type { OrbOptions, OrbState };

/**
 * An animated dotted sphere for what an AI agent is doing. It draws in the text color, so
 * `text-*` classes tint it, and every state is tuned to read at 20px. `paused` holds it on its
 * frame. With reduced motion it holds still.
 */
export function Orb({
  state = "base",
  size = 20,
  speed = 1,
  paused = false,
  label,
  className,
}: OrbOptions & { paused?: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const orb = useRef<ReturnType<typeof mountOrb>>(null);
  useEffect(() => {
    const o = (orb.current = mountOrb(ref.current!, { state, size, speed, label }));
    return o.destroy;
  }, [state, size, speed, label]);
  // After the mount above, so a remounted orb comes back paused if it should be.
  useEffect(() => {
    if (paused) orb.current!.pause();
    else orb.current!.play();
  }, [paused, state, size, speed, label]);
  return <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" className={className} />;
}
