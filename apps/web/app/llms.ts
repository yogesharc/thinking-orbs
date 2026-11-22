/**
 * The docs as markdown, one source for the homepage's Usage section, its Copy prompt button and
 * /llms.txt, so an agent reads the same thing a person does.
 */

export const REPO = "yogesharc/thinking-orbs";

export const USAGE = `import { Orb } from "@yogesharc/thinking-orbs";

export function Thinking() {
  return (
    <span className="flex items-center gap-2 text-sm">
      <Orb state="reasoning" />
      Thinking
    </span>
  );
}`;

export const VANILLA = `import { mountOrb } from "@yogesharc/thinking-orbs/vanilla";

// Draws into any <svg> on the page, in its CSS color.
const orb = mountOrb(document.querySelector("svg"), { state: "reasoning", label: "Thinking" });

orb.pause(); // hold it on its frame
orb.play(); // carry on
orb.destroy(); // remove it`;

/** The Swift package: its URL for Xcode, and the lines for a Package.swift. */
export const SWIFT_URL = `https://github.com/${REPO}`;
export const SWIFT_PACKAGE = `// Package.swift
.package(
  url: "${SWIFT_URL}",
  from: "0.1.2"
),

// and in your target's dependencies:
.product(name: "ThinkingOrbs", package: "thinking-orbs"),`;

export const SWIFTUI = `import SwiftUI
import ThinkingOrbs

struct Thinking: View {
  var body: some View {
    HStack(spacing: 8) {
      Orb(state: .reasoning)
      Text("Thinking")
    }
  }
}`;

/** The Android library, built by JitPack from a GitHub tag: its coordinate, and the Gradle lines for it. */
export const ANDROID_COORDINATE = "com.github.yogesharc:thinking-orbs:0.1.3";
export const GRADLE = `// settings.gradle.kts
dependencyResolutionManagement {
  repositories {
    google()
    mavenCentral()
    maven("https://jitpack.io")
  }
}

// app/build.gradle.kts
dependencies {
  implementation("${ANDROID_COORDINATE}")
}`;

export const COMPOSE = `import com.yogesharc.thinkingorbs.Orb
import com.yogesharc.thinkingorbs.OrbState

@Composable
fun Thinking() {
  Row(
    horizontalArrangement = Arrangement.spacedBy(8.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Orb(OrbState.Reasoning)
    Text("Thinking")
  }
}`;

/** The opt-in extras, in React and plain JS. */
export const EXTRAS = `import { Orb } from "@yogesharc/thinking-orbs";
import { cube } from "@yogesharc/thinking-orbs/shapes";
import { halftone } from "@yogesharc/thinking-orbs/renders";

<Orb state="working" shape={cube} render={halftone} />`;

export const EXTRAS_VANILLA = `import { mountOrb } from "@yogesharc/thinking-orbs/vanilla";
import { cube } from "@yogesharc/thinking-orbs/shapes";
import { halftone } from "@yogesharc/thinking-orbs/renders";

mountOrb(document.querySelector("svg"), { state: "working", shape: cube, render: halftone });`;

/** `react` marks the props only the React component takes. */
export const props = [
  { name: "state", type: "OrbState", fallback: `"idle"`, note: "What the agent is doing." },
  { name: "variant", type: "OrbVariant", fallback: `"default"`, note: "Which look of that state." },
  { name: "size", type: "number", fallback: "20", note: "Width and height in px." },
  { name: "speed", type: "number", fallback: "1", note: "Speed multiplier." },
  { name: "shape", type: "OrbShape", fallback: "—", note: "Another form, from @yogesharc/thinking-orbs/shapes." },
  { name: "render", type: "OrbRender", fallback: "—", note: "Another way to draw it, from @yogesharc/thinking-orbs/renders." },
  { name: "density", type: "number", fallback: "1", note: "Dot count multiplier." },
  { name: "dotSize", type: "number", fallback: "1", note: "Dot size multiplier." },
  { name: "tilt", type: "number", fallback: "20", note: "Viewing angle from above, in degrees." },
  { name: "direction", type: "OrbDirection", fallback: "—", note: "Where using clicks, or which way its scroll goes. Anywhere without one." },
  { name: "paused", type: "boolean", fallback: "false", note: "Freezes the animation.", react: true },
  { name: "label", type: "string", fallback: "—", note: "Name for screen readers." },
  { name: "className", type: "string", fallback: "—", note: "Tint it with text-* classes.", react: true },
];

/** The SwiftUI view's parameters: the web props, typed, without shapes, renders or className. */
export const swiftProps = [
  { name: "state", type: "OrbState", fallback: ".idle", note: "What the agent is doing." },
  { name: "variant", type: "OrbVariant", fallback: ".default", note: "Which look of that state." },
  { name: "size", type: "CGFloat", fallback: "20", note: "Width and height in points." },
  { name: "speed", type: "Double", fallback: "1", note: "Speed multiplier." },
  { name: "density", type: "Double", fallback: "1", note: "Dot count multiplier." },
  { name: "dotSize", type: "Double", fallback: "1", note: "Dot size multiplier." },
  { name: "tilt", type: "Double", fallback: "20", note: "Viewing angle from above, in degrees." },
  { name: "direction", type: "OrbDirection?", fallback: "nil", note: "Where using clicks, or which way its scroll goes. Anywhere without one." },
  { name: "paused", type: "Bool", fallback: "false", note: "Freezes the animation." },
  { name: "label", type: "String?", fallback: "nil", note: "What VoiceOver reads. Hidden from it without one." },
];

/** The composable's parameters: the SwiftUI ones, plus Compose's modifier and color. */
export const composeProps = [
  { name: "state", type: "OrbState", fallback: "OrbState.Idle", note: "What the agent is doing." },
  { name: "modifier", type: "Modifier", fallback: "Modifier", note: "Layout and the rest, as any composable takes." },
  { name: "variant", type: "OrbVariant", fallback: "OrbVariant.Default", note: "Which look of that state." },
  { name: "size", type: "Dp", fallback: "20.dp", note: "Width and height." },
  { name: "color", type: "Color", fallback: "LocalContentColor.current", note: "The dots' color: the text color around it, like an Icon." },
  { name: "speed", type: "Double", fallback: "1.0", note: "Speed multiplier." },
  { name: "paused", type: "Boolean", fallback: "false", note: "Freezes the animation." },
  { name: "label", type: "String?", fallback: "null", note: "What TalkBack reads. Hidden from it without one." },
  { name: "density", type: "Double", fallback: "1.0", note: "Dot count multiplier." },
  { name: "dotSize", type: "Double", fallback: "1.0", note: "Dot size multiplier." },
  { name: "tilt", type: "Double", fallback: "20.0", note: "Viewing angle from above, in degrees." },
  { name: "direction", type: "OrbDirection?", fallback: "null", note: "Where using clicks, or which way its scroll goes. Anywhere without one." },
];

/** Every state, what it's for, and its variants, each described by how it moves. */
const states: [string, string, [string, string][]][] = [
  ["working", "Busy, running a tool.", [["default", "A ring of light runs down it."], ["gyro", "Wobbles like a spinning top."]]],
  ["reasoning", "Thinking.", [["default", "One spark wanders over it."], ["twins", "Two sparks wander at once."]]],
  ["searching", "Searching the web or files.", [["default", "A lens hops between spots."], ["lighthouse", "A beam sweeps round, like a lighthouse."]]],
  ["background", "Background tasks running, like a dev server.", [["default", "Fewer, bigger dots."], ["spiral", "The dots wound into spiral arms."]]],
  [
    "using",
    "Using a browser or computer, as a person would.",
    [
      ["default", "An arrow drawn in the dots glides about and clicks. With a `direction`, it clicks out on that side, like a back button for `\"left\"`."],
      ["tap", "A glowing cursor glides about, clicks, and sends a ripple out."],
      ["scroll", "Rolls in flicks that coast to a stop, the way `direction` scrolls a page. Without one, each flick goes a new way."],
      ["type", "Lines of text type out across it, word by word, after a caret."],
      ["zoom", "The face swells toward you and eases back."],
      ["snap", "Stops dead with a flash, like a screenshot, then turns on."],
      ["record", "Pulses dim and bright, like a recording light."],
    ],
  ],
  ["retrying", "Retrying after an error.", [["default", "Spins, then winds back."], ["surge", "Each turn launches fast and eases out."]]],
  ["compacting", "Compacting the context window.", [["default", "Packs tight, then springs back past loose."], ["squeeze", "Packs while wringing the top against the bottom."], ["fuse", "Packs along a burning fuse line, with no bounce."]]],
  ["waiting", "Waiting for a usage limit to reset.", [["default", "A comet spirals round it."]]],
  ["idle", "Idle, or anything without its own state. It was called `base`, which still works.", [["default", "A plain spin."], ["blink", "Blinks now and then, its lids closing from top and bottom."]]],
];

const code = (lang: string, src: string) => `\`\`\`${lang}\n${src}\n\`\`\``;

export const LLMS = `# Thinking Orbs

> Animated thinking orbs for AI agent UIs: an open-source React component library (plus plain JS, SwiftUI and Jetpack Compose) with a state for each thing an agent does, like thinking, searching and compacting. No dependencies, built to read at 20px.

Website: https://thinkingorbs.com

## Installation

Install the package:

${code("bash", "npm i @yogesharc/thinking-orbs\n# or: pnpm add @yogesharc/thinking-orbs, yarn add @yogesharc/thinking-orbs, bun add @yogesharc/thinking-orbs")}

Or copy the React source into the project with shadcn, to own and edit it. It lands in \`components/\`, so import from \`@/components/orb\`:

${code("bash", "npx shadcn@latest add https://thinkingorbs.com/r/orb.json")}

The React orb needs nothing but React; the plain JS one needs nothing at all.

For SwiftUI (iOS 17, macOS 14), add the Swift package. In Xcode: File › Add Package Dependencies, paste ${SWIFT_URL}, and add \`ThinkingOrbs\` to the app target. Or in a Package.swift:

${code("swift", SWIFT_PACKAGE)}

For Jetpack Compose (Android 5, API 21, and up), add the Android library from JitPack, which builds it from the GitHub tag:

${code("kotlin", GRADLE)}

## Usage

### React

${code("tsx", USAGE)}

### Without React

${code("js", VANILLA)}

### SwiftUI

${code("swift", SWIFTUI)}

### Jetpack Compose

${code("kotlin", COMPOSE)}

## Props

All optional. \`paused\` and \`className\` are React only; \`mountOrb\` returns \`pause()\` and \`play()\` instead, and takes its color from the svg's CSS \`color\`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
${props.map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.fallback === "—" ? "—" : `\`${p.fallback}\``} | ${p.note} |`).join("\n")}

The orb draws in the text color (\`currentColor\`). With reduced motion it holds still.

In SwiftUI, \`Orb(...)\` takes the same options as typed parameters, minus \`shape\`, \`render\` and \`className\`, all optional: ${swiftProps.map((p) => `\`${p.name}: ${p.type} = ${p.fallback}\``).join(", ")}. It draws in the foreground style, so \`.foregroundStyle(.blue)\` tints it, and with Reduce Motion it holds still.

In Compose, \`Orb(...)\` takes the same options, all optional, plus a \`modifier\` and a \`color\`: ${composeProps.map((p) => `\`${p.name}: ${p.type} = ${p.fallback}\``).join(", ")}. Without a \`color\` it draws in the content color around it, as an \`Icon\` does, and with animations turned off in the system's settings it holds still.

Shapes and renders are web-only for now.

## Shapes and renders

The core ships one shape and one render. Other shapes and ways of drawing it are opt-in modules, so only what you import lands in the bundle. With shadcn, add them as \`https://thinkingorbs.com/r/orb-shapes.json\` and \`https://thinkingorbs.com/r/orb-renders.json\`.

${code("tsx", EXTRAS)}

- \`@yogesharc/thinking-orbs/shapes\`: \`cube\`, \`octahedron\`, \`tetrahedron\`, \`torus\`.
- \`@yogesharc/thinking-orbs/renders\`: \`dashes\`, \`squares\`, \`crosses\`, \`mesh\`, \`halftone\`, \`lines\`, \`verticalLines\`.

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
