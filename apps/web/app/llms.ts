/**
 * The docs as markdown, one source for the homepage's Usage section, its Copy prompt button and
 * /llms.txt, so an agent reads the same thing a person does.
 */

export const REPO = "monorepo-labs/thinkingorbs";

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
  { name: "state", type: "OrbState", fallback: `"base"`, note: "Which orb to draw." },
  { name: "size", type: "number", fallback: "20", note: "Width and height in px." },
  { name: "speed", type: "number", fallback: "1", note: "Speed multiplier." },
  { name: "paused", type: "boolean", fallback: "false", note: "Freezes the animation.", react: true },
  { name: "label", type: "string", fallback: "—", note: "Name for screen readers." },
  { name: "className", type: "string", fallback: "—", note: "Tint it with text-* classes.", react: true },
];

/** Every public state, with what it's for. Variations are other looks for the same moment. */
const states = [
  ["working", "Busy, running a tool."],
  ["working-wring", "Variation of working."],
  ["reasoning", "Thinking."],
  ["reasoning-two", "Variation of reasoning."],
  ["searching", "Searching the web or files."],
  ["searching-lighthouse", "Variation of searching."],
  ["background", "Background tasks running, like a dev server."],
  ["background-spiral", "Variation of background."],
  ["retrying", "Retrying after an error."],
  ["retrying-ease-out", "Variation of retrying."],
  ["compacting", "Compacting the context window."],
  ["compacting-wring", "Variation of compacting."],
  ["compacting-fuse", "Variation of compacting."],
  ["waiting", "Waiting for a usage limit to reset."],
  ["base", "Idle, or anything without its own state."],
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

${states.map(([slug, what]) => `- \`${slug}\`: ${what}`).join("\n")}

## About

- Built by Yogesh: https://yogesharc.com
- X: https://x.com/yogesharc
- Sponsor: https://www.patreon.com/c/yogesharc
- GitHub: https://github.com/${REPO}
- License: MIT
`;
