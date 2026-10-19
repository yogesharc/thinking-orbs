![Thinking Orbs](https://www.thinkingorbs.com/opengraph-image)

# Thinking Orbs

A React component library of animated AI agent status indicator orbs. Thinking, searching, compacting, using a browser and more well-thought-out orbs built with attention to detail on every state and variant. 9 states, 23 variants, 5 shapes and 8 render styles to fit every state an agent goes through and your design style.

Works in React or plain JS, with no dependencies.

See them all at [thinkingorbs.com](https://thinkingorbs.com), and try every shape and render in the [playground](https://thinkingorbs.com/playground).

## Install

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

Or copy the source into your project with shadcn, yours to change:

```bash
npx shadcn@latest add https://thinkingorbs.com/r/orb.json
```

Props, every state and variant, shapes and renders, and use without React are all in the [package README](packages/thinkingorbs/README.md).

## SwiftUI

The same orbs, drawn natively for iOS 17 and macOS 14, with no dependencies. In Xcode, File › Add Package Dependencies, and paste `https://github.com/yogesharc/thinking-orbs`. Or in a `Package.swift`:

```swift
.package(url: "https://github.com/yogesharc/thinking-orbs", from: "0.1.2"),
// and in your target's dependencies:
.product(name: "ThinkingOrbs", package: "thinking-orbs"),
```

```swift
import ThinkingOrbs

HStack(spacing: 8) {
    Orb(state: .reasoning, label: "Thinking")
    Text("Thinking")
}
```

`Orb` takes the web props, typed: `state`, `variant` (`.default` if it's not one of the state's own), `size` in points, `speed`, `paused`, `label`, `density`, `dotSize`, `tilt` and `direction`. It draws in the foreground style, so `.foregroundStyle(.blue)` tints it. Shapes and renders are web-only for now. Each orb is one `Canvas` on a `TimelineView`, so a `List` full of them needs no timers, and with Reduce Motion they hold still. Every orb with the same state, variant and speed runs on one clock, so they move in step.

`swift run OrbGallery` opens every state and variant side by side, to hold up against the [playground](https://thinkingorbs.com/playground).

## Working on it

```
apps/web/               the site at thinkingorbs.com, which also serves the shadcn registry
  registry/orb/         the orb itself: orb-core.ts draws it, orb.tsx wraps it for React
packages/thinkingorbs/  the npm package, compiled from apps/web/registry/orb
packages/swift/         the SwiftUI package, a hand port of orb-core.ts (its manifest is Package.swift at the root)
```

The orb's source lives once, in `apps/web/registry/orb`. The site imports it, the registry serves it, and the package compiles it.

```bash
cd apps/web && pnpm install && cd ../..
pnpm dev                                     # the site on localhost:3000
cd packages/thinkingorbs && pnpm install && pnpm build   # the npm package
```

## License

[MIT](packages/thinkingorbs/LICENSE)
