# Thinking Orbs

Animated dotted-sphere status orbs for AI agents: one sphere, a state for each thing an agent does. See them all at [thinkingorbs.com](https://thinkingorbs.com).

```bash
npm i thinkingorbs
```

```tsx
import { Orb } from "thinkingorbs";

<span className="flex items-center gap-2">
  <Orb state="reasoning" />
  Thinking
</span>
```

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `state` | `OrbState` | `"base"` | Which orb to draw. |
| `size` | `number` | `20` | Width and height in px. Every orb is tuned to read at 20. |
| `speed` | `number` | `1` | How fast it runs: `0.5` is half speed, `2` double. Every motion scales together. |
| `paused` | `boolean` | `false` | Holds it on its current frame. |
| `label` | `string` | | What screen readers announce, like "Thinking". Without one it's hidden from them. |
| `className` | `string` | | The orb draws in the text color, so set `color` to tint it. |

States: `working`, `working-wring`, `reasoning`, `reasoning-two`, `searching`, `searching-lighthouse`, `background`, `background-spiral`, `retrying`, `retrying-ease-out`, `compacting`, `compacting-wring`, `compacting-fuse`, `waiting`, `base`.

It's a client component with no dependencies beyond React 18+. With `prefers-reduced-motion` it holds still.

## Without React

```js
import { mountOrb } from "thinkingorbs/vanilla";

// Draws into any <svg> on the page, in its CSS color. Takes state, size, speed and label.
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
```
