/**
 * The docs as markdown, one source for the homepage's Usage section, its Copy prompt button and
 * /llms.txt, so an agent reads the same thing a person does.
 */

export const REPO = "yogesharc/thinkingorbs";

export const USAGE = `import { Orb } from "thinkingorbs";

export function Thinking() {
  return (
    <span className="flex items-center gap-2 text-sm">
      <Orb state="reasoning" />
      Thinking
    </span>
  );
}`;

export const VANILLA = `import { mountOrb } from "thinkingorbs/vanilla";

// Draws into any <svg> on the page, in its CSS color.
const orb = mountOrb(document.querySelector("svg"), { state: "reasoning", label: "Thinking" });

orb.pause(); // hold it on its frame
orb.play(); // carry on
orb.destroy(); // remove it`;

/** The opt-in extras, in React and plain JS. */
export const EXTRAS = `import { Orb } from "thinkingorbs";
import { cube } from "thinkingorbs/shapes";
import { halftone } from "thinkingorbs/renders";

<Orb state="working" shape={cube} render={halftone} />`;

export const EXTRAS_VANILLA = `import { mountOrb } from "thinkingorbs/vanilla";
import { cube } from "thinkingorbs/shapes";
import { halftone } from "thinkingorbs/renders";

mountOrb(document.querySelector("svg"), { state: "working", shape: cube, render: halftone });`;

/** `react` marks the props only the React component takes. */
export const props = [
  { name: "state", type: "OrbState", fallback: `"base"`, note: "What the agent is doing." },
  { name: "variant", type: "OrbVariant", fallback: `"default"`, note: "Which look of that state." },
  { name: "size", type: "number", fallback: "20", note: "Width and height in px." },
  { name: "speed", type: "number", fallback: "1", note: "Speed multiplier." },
  { name: "shape", type: "OrbShape", fallback: "—", note: "Another form, from thinkingorbs/shapes." },
  { name: "render", type: "OrbRender", fallback: "—", note: "Another way to draw it, from thinkingorbs/renders." },
  { name: "density", type: "number", fallback: "1", note: "Dot count multiplier." },
  { name: "dotSize", type: "number", fallback: "1", note: "Dot size multiplier." },
  { name: "tilt", type: "number", fallback: "20", note: "Viewing angle from above, in degrees." },
  { name: "paused", type: "boolean", fallback: "false", note: "Freezes the animation.", react: true },
  { name: "label", type: "string", fallback: "—", note: "Name for screen readers." },
  { name: "className", type: "string", fallback: "—", note: "Tint it with text-* classes.", react: true },
];

/** Every state, what it's for, and its variants, each described by how it moves. */
const states: [string, string, [string, string][]][] = [
  ["working", "Busy, running a tool.", [["default", "A ring of light runs down it."], ["gyro", "Wobbles like a spinning top."]]],
  ["reasoning", "Thinking.", [["default", "One spark wanders over it."], ["twins", "Two sparks wander at once."]]],
  ["searching", "Searching the web or files.", [["default", "A lens hops between spots."], ["lighthouse", "A beam sweeps round, like a lighthouse."]]],
  ["background", "Background tasks running, like a dev server.", [["default", "Fewer, bigger dots."], ["spiral", "The dots wound into spiral arms."]]],
  ["retrying", "Retrying after an error.", [["default", "Spins, then winds back."], ["surge", "Each turn launches fast and eases out."]]],
  ["compacting", "Compacting the context window.", [["default", "Packs tight, then springs back past loose."], ["squeeze", "Packs while wringing the top against the bottom."], ["fuse", "Packs along a burning fuse line, with no bounce."]]],
  ["waiting", "Waiting for a usage limit to reset.", [["default", "A comet spirals round it."]]],
  ["base", "Idle, or anything without its own state.", [["default", "A plain spin."]]],
];

const code = (lang: string, src: string) => `\`\`\`${lang}\n${src}\n\`\`\``;

export const LLMS = `# Thinking Orbs

> Animated thinking orbs for AI agent UIs: an open-source React component library (plus plain JS) with a state for each thing an agent does, like thinking, searching and compacting. No dependencies, built to read at 20px.

Website: https://thinkingorbs.com

## Installation

Install the package:

${code("bash", "npm i thinkingorbs\n# or: pnpm add thinkingorbs, yarn add thinkingorbs, bun add thinkingorbs")}

Or copy the React source into the project with shadcn, to own and edit it. It lands in \`components/\`, so import from \`@/components/orb\`:

${code("bash", "npx shadcn@latest add https://thinkingorbs.com/r/orb.json")}

The React orb needs nothing but React; the plain JS one needs nothing at all.

## Usage

### React

${code("tsx", USAGE)}

### Without React

${code("js", VANILLA)}

## Props

All optional. \`paused\` and \`className\` are React only; \`mountOrb\` returns \`pause()\` and \`play()\` instead, and takes its color from the svg's CSS \`color\`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
${props.map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.fallback === "—" ? "—" : `\`${p.fallback}\``} | ${p.note} |`).join("\n")}

The orb draws in the text color (\`currentColor\`). With reduced motion it holds still.

## Shapes and renders

The orb is a sphere of dots. Other shapes and ways of drawing it are opt-in modules, so only what you import lands in the bundle. With shadcn, add them as \`https://thinkingorbs.com/r/orb-shapes.json\` and \`https://thinkingorbs.com/r/orb-renders.json\`.

${code("tsx", EXTRAS)}

- \`thinkingorbs/shapes\`: \`cube\`, \`octahedron\`, \`tetrahedron\`, \`torus\`.
- \`thinkingorbs/renders\`: \`dashes\`, \`squares\`, \`crosses\`, \`mesh\`, \`halftone\`, \`lines\`, \`verticalLines\`.

Not every state suits every shape or render. A custom shape is an \`OrbShape\`, \`{ points(count, look) }\` returning [x, y, z] points inside the unit sphere; a custom render is an \`OrbRender\`, whose \`mount\` makes SVG elements and returns \`dot(i, x, y, r, a, dx, dy)\`. Define either outside the component.

## States

${states.map(([state, what, looks]) => [`- \`${state}\`: ${what}`, ...looks.map(([v, how]) => `  - \`${v}\`: ${how}`)].join("\n")).join("\n")}

## About

- Built by Yogesh: https://yogesharc.com
- X: https://x.com/yogesharc
- Sponsor: https://www.patreon.com/c/yogesharc
- GitHub: https://github.com/${REPO}
- License: MIT
`;
