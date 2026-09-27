"use client";

import { useState } from "react";
import { ThemeSwitch } from "@/components/theme-switch";
import { Sphere, type SphereKind, type SphereState } from "@/components/sphere";

type Item = { name: string; note: string; kind?: SphereKind; state?: SphereState };
const items: Item[] = [
  { name: "Base", note: "The resting sphere every state is built on." },
  { name: "Working", note: "The agent is at work. Its axis circles like a spinning top while it wrings back and forth.", state: "working-wring" },
  { name: "Reasoning", note: "The agent is thinking it through. On a dimmed sphere, a lit dot hops from neighbour to neighbour, trailing a fading path.", state: "reasoning-connect-dim" },
  { name: "Compacting", note: "Making room in context. A line crosses and packs the dots, then they spring back.", state: "compacting-sweep-deep" },
  { name: "Searching", note: "Looking through files or the web. A lens wanders the surface.", state: "searching" },
  { name: "Background Tasks", note: "Work running out of view. Fewer, larger dots at half speed.", kind: "sparse", state: "background-calm" },
  { name: "Retrying", note: "A request failed and is being tried again. It spins, then springs back.", state: "retrying-rewind-spring" },
];

/** Every finished orb in a card of its own. */
export function Orbs() {
  const [mode, setMode] = useState<"dark" | "light">("dark");

  return (
    <div data-mode={mode} className={`pg flex flex-1 flex-col items-center ${mode === "dark" ? "bg-black" : "bg-page"} px-4 pt-24 pb-24 sm:px-8`}>
      <div className="fixed top-6 right-6 z-10 rounded-full bg-page/70 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl">
        <ThemeSwitch mode={mode} onChange={setMode} />
      </div>

      <header className="flex max-w-md flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Orbs</h1>
        <p className="text-balance text-muted-foreground">
          One dotted sphere, a state for each thing an agent does.
        </p>
      </header>

      <ul className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.name} className="flex flex-col rounded-3xl bg-foreground/[0.07] p-6">
            <div className="flex aspect-[4/3] items-center justify-center">
              <Sphere size={96} kind={item.kind} state={item.state} />
            </div>
            <h2 className="mt-4 text-[15px] font-medium tracking-[-0.01em]">{item.name}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{item.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
