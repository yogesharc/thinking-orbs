"use client";

import { useState } from "react";
import { ThemeSwitch } from "@/components/theme-switch";
import { Sphere, type SphereKind, type SphereState } from "@/components/sphere";

/** `rough` marks an orb that works as an idea but isn't tuned to match the rest yet. */
type Item = { name: string; note: string; kind?: SphereKind; state?: SphereState; rough?: boolean };
const items: Item[] = [
  { name: "Base", note: "The resting sphere every state is built on." },
  { name: "Working", note: "The agent is at work. Its axis circles like a spinning top while it wrings back and forth.", state: "working-wring" },
  { name: "Subagent", note: "A helper agent at work. Ripples swell out from the front.", state: "subagent", rough: true },
  { name: "Reasoning", note: "The agent is thinking it through. On a dimmed sphere, a lit dot hops from neighbour to neighbour, trailing a fading path.", state: "reasoning-connect-dim" },
  { name: "Compacting", note: "Making room in context. A line crosses and packs the dots, then they spring back.", state: "compacting-sweep-deep" },
  { name: "Searching", note: "Looking through files or the web. A lens wanders the surface.", state: "searching" },
  { name: "Background Tasks", note: "Work running out of view. Fewer, larger dots at half speed.", kind: "sparse", state: "background-calm" },
  { name: "Retrying", note: "A request failed and is being tried again. It spins, then springs back.", state: "retrying-rewind-spring" },
];
/** Other takes on the same states, to mix and match so no two apps have to look alike. */
const variations: Item[] = [
  { name: "Working · Wave", note: "A leaning ring of light eases down, drawing the dots in as it passes.", state: "working-wave-tilt" },
  { name: "Reasoning · Two", note: "Two walkers at once, each keeping to its own patch of the front.", state: "reasoning-connect-two" },
  { name: "Compacting · Wring", note: "Twists one way, then the other, like wringing out a towel.", state: "compacting-wring" },
  { name: "Compacting · Fuse", note: "A lit line burns across and leaves ash behind, like a match.", state: "compacting-sweep-edge-dim", rough: true },
  { name: "Background Tasks · Meridians", note: "Eight lines pole to pole, like a beach ball, at half speed.", kind: "meridians", state: "background-calm" },
  { name: "Retrying · Ease out", note: "Each turn launches fast and slows to a near stop, then launches again.", state: "retrying-easeout" },
];

function Grid({ items }: { items: Item[] }) {
  return (
    <ul className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.name} className="flex flex-col rounded-3xl bg-foreground/[0.07] p-6">
          <div className="flex aspect-[4/3] items-center justify-center">
            <Sphere size={96} kind={item.kind} state={item.state} />
          </div>
          <h2 className="mt-4 flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em]">
            {item.name}
            {item.rough && (
              <span className="rounded-full bg-foreground/[0.08] px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                Needs work
              </span>
            )}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{item.note}</p>
        </li>
      ))}
    </ul>
  );
}

/** Every finished orb in a card of its own, then the variations. */
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

      <div className="mt-16 flex w-full flex-col items-center">
        <Grid items={items} />
      </div>

      <section className="mt-24 flex w-full flex-col items-center gap-8">
        <header className="flex max-w-md flex-col gap-2 text-center">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Variations</h2>
          <p className="text-balance text-muted-foreground">Other takes on the same states, to mix into your own set.</p>
        </header>
        <Grid items={variations} />
      </section>
    </div>
  );
}
