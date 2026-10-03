![Thinking Orbs](https://www.thinkingorbs.com/opengraph-image)

# Thinking Orbs

A React component library of animated AI agent status indicator orbs. Thinking, searching, compacting and more well-thought-out orbs built with attention to detail on every state and variant. 8 states, 15 variants, 5 shapes and 8 render styles to fit every state an agent goes through and your design style.

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

## Working on it

```
apps/web/               the site at thinkingorbs.com, which also serves the shadcn registry
  registry/orb/         the orb itself: orb-core.ts draws it, orb.tsx wraps it for React
packages/thinkingorbs/  the npm package, compiled from apps/web/registry/orb
```

The orb's source lives once, in `apps/web/registry/orb`. The site imports it, the registry serves it, and the package compiles it.

```bash
cd apps/web && pnpm install && cd ../..
pnpm dev                                     # the site on localhost:3000
cd packages/thinkingorbs && pnpm install && pnpm build   # the npm package
```

## License

[MIT](packages/thinkingorbs/LICENSE)
