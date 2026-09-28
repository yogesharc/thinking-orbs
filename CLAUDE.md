# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Thinking Orbs** (thinkingorbs.com) — animated dotted-sphere status indicators for AI agents: one sphere, a state for each thing an agent does (working, reasoning, compacting, searching, background tasks, retrying). Distributed two ways from one source file: the npm package (`npm i thinkingorbs`, `import { Orb } from "thinkingorbs"`), and a shadcn registry item (`npx shadcn@latest add https://thinkingorbs.com/r/orb.json`) for people who want to own and edit the source. There is no CLI of our own.

The npm name `thinkingorbs` was unclaimed as of 2026-09-28 and isn't published yet. (`thinking-orbs` is taken — don't use it.)

Only the homepage ships. The design playground (`app/playground/`), the copied Dray app window it previews orbs in (`prototype/`), and the `motion` and `status` pages are local-only and gitignored — never commit them.

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
  components/        the sphere (every orb state) and site UI
  registry/orb/      the shipped <Orb>: source of truth for the npm package and the shadcn item
  app/               the homepage, showing each orb; app/r/orb.json serves the shadcn item
packages/thinkingorbs/  the npm package; `tsc` compiles apps/web/registry/orb/orb.tsx into dist/
```

### The sphere

`components/sphere.tsx` draws every orb: one SVG of imperatively created circles, redrawn each frame. Two props shape it:

- `kind` (`SphereKind`) is **where the dots sit** — `base` is a Fibonacci sphere; `sparse`, `spiral`, `meridians` and others are alternative distributions (`distribute()`).
- `state` (`SphereState`) is **what it does on top of the spin** — every behaviour is a branch keyed on the state name inside the one `draw` loop.

Timing runs through a per-look clock: `lookOf(kind, state)` keys a clock in `clocks`, `tick()` advances it (scaled by the `speeds` map, never stepping back), so every sphere showing the same look stays in sync. Spin periods come from `periodOf()`; `turnOf()` is the display value.

`sphere.tsx` is the design lab, with every experiment. What ships is `registry/orb/orb.tsx`: a pruned copy holding only the homepage's orbs, keyed by their public slug (`OrbState`, e.g. `waiting` is `subagent-patch-descend` in the sphere). The homepage and chat mock render `<Orb>`, so the site shows exactly what ships. When an orb changes in `sphere.tsx` or joins the homepage, port it into `orb.tsx` and run the local check at `/playground/orb-check` (`?n=` sets the frame count): it steps both at the same instants and must say `same` for every orb.

### The homepage

`app/page.tsx` renders `app/orbs.tsx`, three columns on wide screens: a sticky left column (pitch, install command, contents, theme switch, credit), one column of orb cards (each state followed by its variations, Base last), and a sticky `components/chat-mock.tsx` on the right; Installation and Usage follow below. Whichever card crosses a line 35% down the viewport is "picked" (clicking scrolls a card onto that line), and the chat's live line shows the picked orb with its `label`. The chat mock deliberately copies how Dray's transcript renders a turn (row wording, 20px orb lines, shimmering live labels, a thinking preview) — Dray's source lives in `~/Documents/ade/apps/desktop/src/components/chat/`.

### Local-only tools

`app/playground/` is where orbs are designed: `rows` are the live list and `aside` is "Set aside" (rejected ideas are moved there, not deleted). It previews the selected orb inside the copied Dray window in `prototype/`, whose chat label per state comes from `label()` in `prototype/illustrations/Hero.tsx`.

**Tailwind's source detection skips gitignored files**, so the local pages import `app/playground/local.css`, which pulls in `globals.css` plus the prototype theme and adds `@source` for each local folder. Shipped files must never import anything gitignored — a clean clone won't build. To check, copy only tracked files to a temp dir and run `next build` there.

**The registry is the single source of truth with three consumers.** `apps/web/registry/orb/orb.tsx` is:

1. imported directly by the homepage for live previews,
2. served by `app/r/orb.json/route.ts` as a shadcn registry item (prerendered at build), and
3. compiled by `packages/thinkingorbs` into the npm package (`pnpm build` there; `npm publish` runs it first).

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
