# registry

Source of truth for every component the CLI can install.

One folder per component (`registry/orb/`), containing the `.tsx` files copied
verbatim into the consumer's project. Components import from `@/lib/...` and
Tailwind v4 classes only — no runtime dependency on this repo.

A build step serves each folder as `public/r/<name>.json` (files + npm deps),
which `npx thinkingorbs add <name>` fetches.
