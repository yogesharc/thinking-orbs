import { LLMS } from "../llms";

// The docs only change with a deploy.
export const dynamic = "force-static";

/** The homepage as markdown, for agents: install, usage, props and every state. */
export function GET() {
  return new Response(LLMS, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
