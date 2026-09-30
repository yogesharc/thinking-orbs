# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Thinking Orbs** (thinkingorbs.com) — animated dotted-sphere status indicators for AI agents: one sphere, a state for each thing an agent does (working, reasoning, compacting, searching, background tasks, retrying). Distributed two ways from one source: the npm package (`npm i @yogesharc/thinking-orbs`, `import { Orb } from "@yogesharc/thinking-orbs"`, or `mountOrb` from `@yogesharc/thinking-orbs/vanilla` without React), and a shadcn registry item (`npx shadcn@latest add https://thinkingorbs.com/r/orb.json`) for people who want to own and edit the source. There is no CLI of our own.

The npm package is `@yogesharc/thinking-orbs`. npm refused the unscoped `thinkingorbs` as too similar to the existing `thinking-orbs`, an unrelated package with the same pitch, so keep the scope: dropping it installs theirs.

Only the homepage ships to users. `/playground` (the orb playground) and the `/v1`–`/v4`, `/v6` layout trials are committed but unlinked and noindexed. The old design playground (`app/playground-old/`, `prototype/`, and the `motion` and `status` pages) stays gitignored — never commit those paths.

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
  registry/orb/      what ships: orb-core.ts (all the drawing, plain JS, `mountOrb`), orb.tsx (the React <Orb> around it), and the opt-in shapes.ts and renders.ts
  app/               the homepage; app/llms.ts holds the docs as markdown; app/r/[item] (orb, orb-shapes, orb-renders .json) and app/llms.txt serve them
packages/thinkingorbs/  the npm package; `tsc` compiles both registry/orb files into dist/
```

### The orb

`registry/orb/orb-core.ts` draws every orb: one SVG of imperatively created circles, redrawn each frame. `VARIANTS` lists every public `state` and the `variant`s it comes in, `default` first (`<Orb state="working" variant="gyro" />`); variants are named after their motion. Internally the drawing keys on a `Look`: the state alone for `default`, else `state-variant`. Where the dots sit comes from `distribute()` (a Fibonacci sphere, or spiral arms for `background-spiral`); `density`, `dotSize` and `tilt` tune it; every behaviour on top of the spin is a branch keyed on the state inside the one `draw` loop, and spin periods come from `PERIOD`. Renaming a state or variant means changing it in `orb-core.ts`, `app/orbs.tsx`, `app/llms.ts` and `packages/thinkingorbs/README.md`.

The core ships only the sphere drawn in dots. Other shapes and renders are opt-in plug-ins, so they cost nothing unless imported: `registry/orb/shapes.ts` (`OrbShape`: `points(count, look)` plus optional `scale` and `tip`) and `registry/orb/renders.ts` (`OrbRender`: `mount` returns a per-point `dot()` and a per-frame `frame()`; `flat` renders like halftone and lines drop the tilt, and Working's ring runs straight down). They ship as `@yogesharc/thinking-orbs/shapes` and `@yogesharc/thinking-orbs/renders`, and as the `orb-shapes` and `orb-renders` registry items. Not every state is tuned for every extra, by design.

### The homepage

`app/page.tsx` renders `Orbs` from `app/orbs.tsx`. A row along the top holds the contents (Orbs · Installation · Usage) on the left and Sponsor, GitHub stars and the theme toggle on the right, pinned on wide screens with no fill. At `xl` it's three columns: a sticky left column with just the pitch (install bar with Copy prompt, credit and MIT License), the orb cards two to a row in story order, and a sticky `components/chat-mock.tsx`; Installation and Usage follow below the cards, ending in an llms.txt link. There's no footer. Whichever card crosses a line 35% down the viewport is "picked" — a row splits its height between its cards, so scrolling zigzags left then right (clicking scrolls a card onto its share of the line) — the chat's live line shows it, and the rows above it build up as you scroll. Below `xl` the cards are a grid, the chat stays at its seed rows and tapping a card picks it.

`orbs.tsx` exports its pieces (`Hero`, `TopBar`, `Toc`, `OrbList`, `StoryChat`, `Docs`, the `useStory` picking hook…). Plain data and helpers (the `orbs` list, `Item`, `Mode`, `theme()`, the `LG`/`XL` media checks) live in `app/orbs-data.ts` instead: a file exporting both components and data makes Fast Refresh reload the whole page, so keep new code to that split. `app/variations.tsx` builds the unlinked, noindexed layout trials at `/v1`–`/v4` and `/v6` from them.

The chat mock deliberately copies how Dray's transcript renders a turn (row wording, 20px orb lines, shimmering live labels, a thinking preview) — Dray's source lives in `~/Documents/ade/apps/desktop/src/components/chat/`.

`app/llms.ts` is the docs as markdown: the Usage section and props table read from it, Copy prompt copies it, and `/llms.txt` serves it. Change the docs there.

Shipped files must never import anything gitignored — a clean clone won't build. To check, copy only tracked files to a temp dir and run `next build` there.

### The playground

`app/playground/` is the committed orb playground: the states down the left (↑ ↓ steps through them), one big orb with the same orb at 24px beside its chat line under it, and a DialKit panel on the right for shape and render (every export of `shapes.ts` and `renders.ts`), color, size, speed and tuning params, with Copy and Reset (which keeps shape and render) under it. `playground.css` strips DialKit's chrome (card, header, collapse); flat renders drop the Tilt slider. It renders the shipped `<Orb>` from the registry, and Copy writes the settings as `<Orb … />` JSX with the imports it needs and defaults left out. State-specific tuning (hop rates, lens size and the like) stays in code, not the panel. If Tailwind stops styling a folder that was just un-ignored, clear `.next` and restart the dev server: Turbopack caches the compiled CSS by content.

### Local-only tools

`app/playground-old/` is where the shipped orbs were designed: `rows` are the live list and `aside` is "Set aside" (rejected ideas are moved there, not deleted). It previews the selected orb inside the copied Dray window in `prototype/`, whose chat label per state comes from `label()` in `prototype/illustrations/Hero.tsx`.

**Tailwind's source detection skips gitignored files**, so the local pages import `app/playground-old/local.css`, which pulls in `globals.css` plus the prototype theme and adds `@source` for each local folder.

**The registry is the single source of truth with three consumers.** `apps/web/registry/orb/` is:

1. imported directly by the homepage for live previews,
2. served by `app/r/[item]/route.ts` as shadcn registry items (prerendered at build), and
3. compiled by `packages/thinkingorbs` into the npm package (`pnpm build` there; `npm publish` runs it first). Each registry file is its own entry point there.

Keep every import of `./orb-core` extensionless: Turbopack won't map `./orb-core.js` to the `.ts` file, and shadcn users' tsconfigs may reject `.ts` extensions. The package build adds `.js` to its output so the files also run unbundled.

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
