# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Thinking Orbs** (thinkingorbs.com) — animated dotted-sphere status indicators for AI agents: one sphere, a state for each thing an agent does (working, reasoning, compacting, searching, background tasks, retrying). Distributed two ways from one source: the npm package (`npm i thinkingorbs`, `import { Orb } from "thinkingorbs"`, or `mountOrb` from `thinkingorbs/vanilla` without React), and a shadcn registry item (`npx shadcn@latest add https://thinkingorbs.com/r/orb.json`) for people who want to own and edit the source. There is no CLI of our own.

The npm name `thinkingorbs` was unclaimed as of 2026-09-28 and isn't published yet. (`thinking-orbs` is taken — don't use it.)

Only the homepage ships. The old design playground (`app/playground/`, `prototype/`, and the `motion` and `status` pages) stays gitignored — never commit those paths.

## Commands

Run from the repo root:

```bash
pnpm dev      # Next.js dev server (Turbopack) on :3000
pnpm build    # production build
pnpm lint     # eslint
```

No test runner is set up yet. Don't invent one without asking. Type-check with `npx tsc --noEmit -p .` from `apps/web` (TypeScript isn't installed at the root).

**Install quirk:** `create-next-app` wrote an `apps/web/pnpm-workspace.yaml`, which makes `apps/web` its own pnpm workspace root — so the lockfile and `node_modules` live in `apps/web/`, not at the repo root. The root scripts work anyway (they shell out via `--filter web`). `packages/thinkingorbs` has its own `pnpm-workspace.yaml` the same way, so run `pnpm install` / `pnpm build` inside it.

## Architecture

```
apps/web/            Next.js 16 site — also serves the registry
  components/        site UI: the chat mock and its styles
  registry/orb/      what ships: orb-core.ts (all the drawing, plain JS, `mountOrb`) and orb.tsx (the React <Orb> around it)
  app/               the homepage; app/llms.ts holds the docs as markdown; app/r/orb.json and app/llms.txt serve them
packages/thinkingorbs/  the npm package; `tsc` compiles both registry/orb files into dist/
```

### The orb

`registry/orb/orb-core.ts` draws every orb: one SVG of imperatively created circles, redrawn each frame. `VARIANTS` lists every public `state` and the `variant`s it comes in, `default` first (`<Orb state="working" variant="gyro" />`); variants are named after their motion. Internally the drawing keys on a `Look`: the state alone for `default`, else `state-variant`. Where the dots sit comes from `distribute()` (a Fibonacci sphere, or spiral arms for `background-spiral`); every behaviour on top of the spin is a branch keyed on the state inside the one `draw` loop, and spin periods come from `PERIOD`. Renaming a state or variant means changing it in `orb-core.ts`, `app/orbs.tsx`, `app/llms.ts` and `packages/thinkingorbs/README.md`.

### The homepage

`app/page.tsx` renders `app/orbs.tsx`. On desktop it's three columns: a sticky left column (pitch, install bar with Copy prompt, credit, contents and footer links), the orb cards in story order (View all, top right, swaps them for a grid of every orb with no chat), and a sticky `components/chat-mock.tsx`; Installation and Usage follow below, and the GitHub stars and theme toggle are pinned top right. Whichever card crosses a line 35% down the viewport is "picked" (clicking scrolls a card onto that line), the chat's live line shows it, and the rows above it build up as you scroll. Below desktop width the switch hides, the cards are a grid, the chat stays at its seed rows and tapping a card picks it, and the footer links move to the bottom of the page.

The chat mock deliberately copies how Dray's transcript renders a turn (row wording, 20px orb lines, shimmering live labels, a thinking preview) — Dray's source lives in `~/Documents/ade/apps/desktop/src/components/chat/`.

`app/llms.ts` is the docs as markdown: the Usage section and props table read from it, Copy prompt copies it, and `/llms.txt` serves it. Change the docs there.

Shipped files must never import anything gitignored — a clean clone won't build. To check, copy only tracked files to a temp dir and run `next build` there.

**The registry is the single source of truth with three consumers.** `apps/web/registry/orb/` is:

1. imported directly by the homepage for live previews,
2. served by `app/r/orb.json/route.ts` as a shadcn registry item (prerendered at build), and
3. compiled by `packages/thinkingorbs` into the npm package (`pnpm build` there; `npm publish` runs it first).

Keep `orb.tsx`'s import of `./orb-core` extensionless: Turbopack won't map `./orb-core.js` to the `.ts` file, and shadcn users' tsconfigs may reject `.ts` extensions. The package build adds `.js` to its output so the files also run unbundled.

### Rules for anything in `registry/`

These files get copied verbatim into a stranger's codebase, so they must survive outside this repo:

- **No imports from this repo.** Only `react`, declared npm deps, and `@/lib/...`-style paths the consumer will also have.
- **Tailwind v4 classes only** for styling — consumers are required to have Tailwind v4. No CSS modules, no styled-components.
- Mark client components with `"use client"` — they land in App Router projects.
- Any npm package a component needs must be declared in its registry entry so the CLI can install it.

### Styling

Tailwind v4, CSS-first — there is **no `tailwind.config.ts`**. Theme tokens are declared in `apps/web/app/globals.css` via `@theme inline`. If a component needs a new color or animation token, add it to `@theme inline` *and* make sure the registry entry tells consumers to do the same.

The homepage doesn't follow `prefers-color-scheme`: its wrapper is `.pg[data-mode="dark"|"light"]`, set by the theme switch, with the palette (and the `.shimmer` label animation) in `components/page.css`. Orbs draw in `currentColor`.

## Next.js 16

This is Next 16 with React 19 — newer than most training data, with breaking changes from Next 14/15. Before writing App Router code, read the relevant guide in `apps/web/node_modules/next/dist/docs/` (note: resolves from `apps/web`, not the repo root).

`apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are generated and rewritten by `next dev` — don't hand-edit them; commit the churn along with your work.
