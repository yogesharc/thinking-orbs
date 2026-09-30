import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The shadcn registry items, for `npx shadcn@latest add https://thinkingorbs.com/r/orb.json`. The extras
 * sit beside the orb's own files and import its core, so they pull the orb in with them.
 */
const ITEMS: Record<string, { title: string; description: string; files: string[]; registryDependencies?: string[] }> = {
  orb: { title: "Orb", description: "Animated dotted-sphere status orbs for AI agents.", files: ["orb.tsx", "orb-core.ts"] },
  "orb-shapes": {
    title: "Orb shapes",
    description: "Cube, octahedron, tetrahedron and torus for the orb's shape prop.",
    files: ["shapes.ts"],
    registryDependencies: ["https://thinkingorbs.com/r/orb.json"],
  },
  "orb-renders": {
    title: "Orb renders",
    description: "Dashes, squares, crosses, mesh, halftone and lines for the orb's render prop.",
    files: ["renders.ts"],
    registryDependencies: ["https://thinkingorbs.com/r/orb.json"],
  },
};

// Read once when the module loads, not per request.
const SOURCES = Object.fromEntries(
  await Promise.all(
    [...new Set(Object.values(ITEMS).flatMap((item) => item.files))].map(
      async (file) => [file, await readFile(join(process.cwd(), "registry/orb", file), "utf8")] as const,
    ),
  ),
);

// Built once at deploy: the orb's source never changes between builds.
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(ITEMS).map((name) => ({ item: `${name}.json` }));

export async function GET(_: Request, { params }: { params: Promise<{ item: string }> }) {
  const name = (await params).item.replace(/\.json$/, "");
  const { files, ...item } = ITEMS[name];
  return Response.json({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:component",
    ...item,
    files: files.map((file) => ({ path: `registry/orb/${file}`, type: "registry:component", content: SOURCES[file] })),
  });
}
