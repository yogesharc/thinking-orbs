"use client";

import { DialRoot, useDialKitController } from "dialkit";
import "dialkit/styles.css";
import "./playground.css";
import { useEffect, useState } from "react";
import { SiteHeader } from "../orbs";
import { orbs, theme, type Mode } from "../orbs-data";
import { Orb, type OrbOptions, type OrbRender, type OrbShape } from "@/registry/orb/orb";
import { VARIANTS } from "@/registry/orb/orb-core";
import * as RENDERS from "@/registry/orb/renders";
import * as SHAPES from "@/registry/orb/shapes";

/** Every state and variant, as `state` or `state-variant`, in the order VARIANTS lists them. */
const LOOKS = Object.entries(VARIANTS).flatMap(([s, vs]) => vs.map((v) => (v === "default" ? s : `${s}-${v}`)));
const title = (id: string) => id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" · ");
/** An export's name as a menu label: verticalLines, Vertical Lines. */
const label = (id: string) => id.replace(/[A-Z]/g, " $&").replace(/^./, (c) => c.toUpperCase());

/** The extras by name, beside the orb's own sphere and dots, which have none. */
const shapes: Record<string, OrbShape> = SHAPES, renders: Record<string, OrbRender> = RENDERS;

/** The orb's default colour in each theme: the page's text colour, so it reads on either. */
const INK: Record<Mode, string> = { dark: "#ffffff", light: "#171717" };

const range = (initial: number, min: number, max: number, step: number): [number, number, number, number] => [initial, min, max, step];
const choose = (ids: readonly string[], initial: string) => ({
  type: "select" as const,
  options: ids.map((value) => ({ value, label: label(value) })),
  default: initial,
});
/** The panel: DialKit draws a control per key and hands back the values. Flat, so there are no folders to collapse. */
const CONFIG = {
  shape: choose(["sphere", ...Object.keys(shapes)], "sphere"),
  render: choose(["dots", ...Object.keys(renders)], "dots"),
  color: { type: "color" as const, default: INK.dark },
  size: range(320, 16, 480, 1),
  speed: range(1, 0.05, 3, 0.05),
  density: range(1, 0.25, 3, 0.05),
  dotSize: range(1, 0.25, 3, 0.05),
  tilt: range(20, -90, 90, 1),
};
/** Flat renders like Halftone ignore tilt, so their panel drops it. */
const UNTILTED = Object.fromEntries(Object.entries(CONFIG).filter(([k]) => k !== "tilt")) as Omit<typeof CONFIG, "tilt">;

/** Each look's line from the homepage's chat, to read the orb beside as it would sit in one. */
const LABEL = Object.fromEntries(orbs.map(({ orb, label }) => [orb.variant ? `${orb.state}-${orb.variant}` : orb.state, label]));

/** `<Orb>`'s own defaults, so Copy only writes what's been changed. The playground's size and colour aren't them. */
const ORB_DEFAULTS: Record<string, string | number> = { variant: "default", size: 20, speed: 1, density: 1, dotSize: 1, tilt: 20 };

/** The settings as JSX, leaving out any at its default, with the imports a shape or render needs. */
const jsx = (props: Record<string, string | number | undefined>, shape: string, render: string, color?: string) => {
  const attrs = Object.entries(props)
    .filter(([k, val]) => val !== undefined && val !== ORB_DEFAULTS[k])
    .map(([k, val]) => (typeof val === "string" ? `${k}="${val}"` : `${k}={${val}}`));
  const imports = ['import { Orb } from "thinkingorbs";'];
  if (shape !== "sphere") {
    attrs.push(`shape={${shape}}`);
    imports.push(`import { ${shape} } from "thinkingorbs/shapes";`);
  }
  if (render !== "dots") {
    attrs.push(`render={${render}}`);
    imports.push(`import { ${render} } from "thinkingorbs/renders";`);
  }
  if (color) attrs.push(`className="text-[${color}]"`);
  return `${imports.join("\n")}\n\n<Orb ${attrs.join(" ")} />`;
};

/**
 * The orb playground: the states down the left (↑ ↓ steps through them), one orb big in the middle
 * with the same orb at 24px below it beside its chat line, the size it has to read at, and the DialKit panel
 * on the right for its shape, render and tuning, with Copy and Reset under it.
 */
export function Playground({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");
  const [look, setLook] = useState(LOOKS[1]);
  const [flat, setFlat] = useState(false);
  const dial = useDialKitController("Orb playground", (flat ? UNTILTED : CONFIG) as typeof CONFIG);
  const v = dial.values;
  if (!!renders[v.render]?.flat !== flat) setFlat(!flat);
  const [state, variant] = look.split("-");
  const props = { state, variant, speed: v.speed, density: v.density, dotSize: v.dotSize, tilt: flat ? undefined : v.tilt };
  const orb = { ...props, shape: shapes[v.shape], render: renders[v.render] } as OrbOptions;

  // Switching theme swaps the colour too, unless it's been set to something of your own.
  const toggle = (next: Mode) => {
    if (v.color.toLowerCase() === INK[mode]) dial.setValue("color", INK[next]);
    setMode(next);
  };
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(jsx({ ...props, size: v.size }, v.shape, v.render, v.color.toLowerCase() === INK[mode] ? undefined : v.color));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  // Shape and render are what you're looking at, not tuning, so Reset leaves them be.
  const changed = Object.entries(CONFIG).some(([key, c]) => {
    const value = v[key as keyof typeof v];
    if (key === "shape" || key === "render" || value === undefined) return false;
    const initial = key === "color" ? INK[mode] : Array.isArray(c) ? c[0] : c.default;
    return typeof value === "string" ? value.toLowerCase() !== initial : value !== initial;
  });
  // Back to the defaults, with the colour that reads on this theme.
  const reset = () => {
    const { shape, render } = v;
    dial.resetValues();
    dial.setValue("shape", shape);
    dial.setValue("render", render);
    dial.setValue("color", INK[mode]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      // Leave the arrows to whatever has focus when it uses them: fields, and the panel's own controls.
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable], [class*='dialkit']")) return;
      e.preventDefault();
      setLook((l) => LOOKS[(LOOKS.indexOf(l) + (e.key === "ArrowDown" ? 1 : LOOKS.length - 1)) % LOOKS.length]);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div data-mode={mode} className={`${theme(mode)} flex min-h-screen flex-col lg:h-screen`}>
      <SiteHeader stars={stars} mode={mode} onMode={toggle} page="playground" />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav aria-label="States" className="flex shrink-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-8 lg:w-80 lg:justify-center-safe">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm lg:flex-col">
            {LOOKS.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  aria-current={l === look ? "true" : undefined}
                  onClick={() => setLook(l)}
                  className={`text-left transition-colors ${l === look ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {title(l)}
                </button>
              </li>
            ))}
          </ul>
          <p className="hidden text-xs text-muted-foreground lg:block">↑ ↓ to switch</p>
        </nav>

        <div className="relative flex min-h-[60vh] flex-1 items-center justify-center p-8" style={{ color: v.color }}>
          <Orb {...orb} size={v.size} />
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm">
            <Orb {...orb} size={24} />
            <span key={look} className="shimmer">
              {LABEL[look] ?? title(look)}
            </span>
          </div>
        </div>

        <aside className="mx-auto flex w-full max-w-md shrink-0 flex-col overflow-y-auto px-4 py-6 sm:px-8 lg:mx-0 lg:w-80 lg:max-w-none lg:justify-center-safe">
          <DialRoot mode="inline" theme={mode} productionEnabled />
          <div className="mt-4 flex gap-4 text-sm">
            <button type="button" onClick={copy} className="text-muted-foreground transition-colors hover:text-foreground">
              {copied ? "Copied" : "Copy"}
            </button>
            {changed && (
              <button type="button" onClick={reset} className="text-muted-foreground transition-colors hover:text-foreground">
                Reset
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
