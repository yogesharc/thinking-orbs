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

/** `react` marks the props only the React component takes. */
export const props = [
  { name: "state", type: "OrbState", fallback: `"base"`, note: "What the agent is doing." },
  { name: "variant", type: "OrbVariant", fallback: `"default"`, note: "Which look of that state." },
  { name: "size", type: "number", fallback: "20", note: "Width and height in px." },
  { name: "speed", type: "number", fallback: "1", note: "Speed multiplier." },
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

> Animated dotted-sphere status orbs for AI agents: one sphere, a state for each thing an agent does. Built to read at 20px, the size they sit at in a real interface.

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

## States

${states.map(([state, what, looks]) => [`- \`${state}\`: ${what}`, ...looks.map(([v, how]) => `  - \`${v}\`: ${how}`)].join("\n")).join("\n")}

## About

- Built by Yogesh: https://yogesharc.com
- X: https://x.com/yogesharc
- Sponsor: https://www.patreon.com/c/yogesharc
- GitHub: https://github.com/${REPO}
- License: MIT
`;
