# Thinking Orbs

Well-crafted, animated orb status indicators for AI interfaces: one sphere of dots, a state for each thing an agent does. For React or plain JS, with no dependencies. See them all at [thinkingorbs.com](https://thinkingorbs.com).

```bash
npm i @yogesharc/thinking-orbs
```

```tsx
import { Orb } from "@yogesharc/thinking-orbs";

<span className="flex items-center gap-2">
  <Orb state="reasoning" />
  Thinking
</span>
```

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `state` | `OrbState` | `"base"` | What the agent is doing. |
| `variant` | `OrbVariant` | `"default"` | Which look of that state. |
| `size` | `number` | `20` | Width and height in px. Every orb is tuned to read at 20. |
| `speed` | `number` | `1` | How fast it runs: `0.5` is half speed, `2` double. Every motion scales together. |
| `shape` | `OrbShape` | | The form the dots sit on, a sphere without one. See [Shapes and renders](#shapes-and-renders). |
| `render` | `OrbRender` | | How the dots are drawn, circles without one. See [Shapes and renders](#shapes-and-renders). |
| `density` | `number` | `1` | How many dots, as a multiple of the tuned count. |
| `dotSize` | `number` | `1` | How big each dot is, as a multiple of the tuned size. |
| `tilt` | `number` | `20` | How far it's seen from above, in degrees: `0` side on, `90` straight down. |
| `paused` | `boolean` | `false` | Holds it on its current frame. |
| `label` | `string` | | What screen readers announce, like "Thinking". Without one it's hidden from them. |
| `className` | `string` | | The orb draws in the text color, so set `color` to tint it. |

States and their variants (`default` is each state's own look): `working` (`gyro`), `reasoning` (`twins`), `searching` (`lighthouse`), `background` (`spiral`), `retrying` (`surge`), `compacting` (`squeeze`, `fuse`), `waiting`, `base`.

It's a client component with no dependencies beyond React 18+. With `prefers-reduced-motion` it holds still.

## Shapes and renders

The orb is a sphere of dots. Other shapes and ways of drawing it are opt-in, so they only land in your bundle if you import them:

```tsx
import { Orb } from "@yogesharc/thinking-orbs";
import { cube } from "@yogesharc/thinking-orbs/shapes";
import { halftone } from "@yogesharc/thinking-orbs/renders";

<Orb state="working" shape={cube} render={halftone} />
```

- `@yogesharc/thinking-orbs/shapes`: `cube`, `octahedron`, `tetrahedron`, `torus`.
- `@yogesharc/thinking-orbs/renders`: `dashes` (strokes along the spin), `squares`, `crosses`, `mesh` (each dot joined to its nearest), and flat screens toned by the orb beneath: `halftone` dots, `lines` and `verticalLines`, like an engraving.

Not every state suits every shape or render; try them at [thinkingorbs.com/playground](https://thinkingorbs.com/playground).

Your own shape is an `OrbShape`: `{ points(count, look) }` returning `[x, y, z]` points inside the unit sphere, or just that function. Your own render is an `OrbRender`, whose `mount` makes its SVG elements and returns a `dot(i, x, y, r, a, dx, dy)` to place each point every frame. Define either outside your component, or the orb redraws every render.

## Without React

```js
import { mountOrb } from "@yogesharc/thinking-orbs/vanilla";

// Draws into any <svg> on the page, in its CSS color. Takes the same options as the props, minus paused and className.
const orb = mountOrb(document.querySelector("svg"), { state: "reasoning", label: "Thinking" });

orb.pause(); // hold it on its frame
orb.play(); // carry on
orb.destroy(); // remove it
```

It has no dependencies at all, so it also loads straight from a CDN in a `<script type="module">`.

## Own the source instead

To copy the orb into your project and change it freely:

```bash
npx shadcn@latest add https://thinkingorbs.com/r/orb.json
# and if you want them: .../r/orb-shapes.json, .../r/orb-renders.json
```
