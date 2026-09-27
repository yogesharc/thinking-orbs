# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Thinking Orbs** (thinkingorbs.com) — animated dotted-sphere status indicators for AI agents: one sphere, a state for each thing an agent does (working, reasoning, compacting, searching, background tasks, retrying). Distributed shadcn-style: users run `npx thinkingorbs@latest add <name>` and the component's source is written into *their* repo. They own the code afterward; there is no runtime package to upgrade.

The npm name `thinkingorbs` is unclaimed and reserved for the CLI. (`thinking-orbs` is taken — don't use it.)

Only the homepage ships. The design playground (`app/playground/`), the copied Dray app window it previews orbs in (`prototype/`), and the `motion` and `status` pages are local-only and gitignored — never commit them.

## Commands

Run from the repo root:

```bash
pnpm dev      # Next.js dev server (Turbopack) on :3000
pnpm build    # production build
pnpm lint     # eslint
```

No test runner is set up yet. Don't invent one without asking.

**Install quirk:** `create-next-app` wrote an `apps/web/pnpm-workspace.yaml`, which makes `apps/web` its own pnpm workspace root — so the lockfile and `node_modules` live in `apps/web/`, not at the repo root. The root scripts work anyway (they shell out via `--filter web`). When `packages/cli` lands, delete `apps/web/pnpm-workspace.yaml` (moving its `ignoredBuiltDependencies` to the root one) and re-install, or the two packages will resolve dependencies independently.

## Architecture

```
apps/web/            Next.js 16 site — also serves the registry
  components/        the sphere (every orb state) and site UI
  registry/          component source of truth, one folder per component
  app/               the homepage, showing each orb
packages/            (empty) — the `thinkingorbs` CLI goes here
```

**The registry is the single source of truth with two consumers.** A component written once in `apps/web/registry/<name>/` is:

1. imported directly by the showcase pages for live previews, and
2. emitted at build time as `apps/web/public/r/<name>.json` (file contents + npm deps), which the CLI fetches and writes into the user's project.

Neither the build step nor the CLI exists yet. Build them when there is a component worth installing.

### Rules for anything in `registry/`

These files get copied verbatim into a stranger's codebase, so they must survive outside this repo:

- **No imports from this repo.** Only `react`, declared npm deps, and `@/lib/...`-style paths the consumer will also have.
- **Tailwind v4 classes only** for styling — consumers are required to have Tailwind v4. No CSS modules, no styled-components.
- Mark client components with `"use client"` — they land in App Router projects.
- Any npm package a component needs must be declared in its registry entry so the CLI can install it.

### Styling

Tailwind v4, CSS-first — there is **no `tailwind.config.ts`**. Theme tokens are declared in `apps/web/app/globals.css` via `@theme inline`, and dark mode is `prefers-color-scheme` (not a `.dark` class). If a component needs a new color or animation token, add it to `@theme inline` *and* make sure the registry entry tells consumers to do the same.

## Next.js 16

This is Next 16 with React 19 — newer than most training data, with breaking changes from Next 14/15. Before writing App Router code, read the relevant guide in `apps/web/node_modules/next/dist/docs/` (note: resolves from `apps/web`, not the repo root).

`apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are generated and rewritten by `next dev` — don't hand-edit them; commit the churn along with your work.
