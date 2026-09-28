import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Built once at deploy: the orb's source never changes between builds.
export const dynamic = "force-static";

/** The orb as a shadcn registry item, for `npx shadcn@latest add https://thinkingorbs.com/r/orb.json`. */
export async function GET() {
  const content = await readFile(join(process.cwd(), "registry/orb/orb.tsx"), "utf8");
  return Response.json({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "orb",
    type: "registry:component",
    title: "Orb",
    description: "Animated dotted-sphere status orbs for AI agents.",
    files: [{ path: "registry/orb/orb.tsx", type: "registry:component", content }],
  });
}
