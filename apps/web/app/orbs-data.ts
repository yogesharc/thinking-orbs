import type { ChatRow } from "@/components/chat-mock";
import type { OrbLook } from "@/registry/orb/orb";

/**
 * `orb` is what `<Orb>` takes: the state and, for a variation, its variant. `label` is the line it sits beside
 * in the chat, the way Dray words that state; `thought` makes it a thinking line, which names itself
 * plainly and streams a preview of the thought underneath. `done` is the row it leaves in the
 * transcript once the reader scrolls past it.
 */
export type Item = { name: string; orb: OrbLook; label: string; thought?: string; done?: ChatRow };
/** Every orb, in the order one turn would reach them, so scrolling the list writes the transcript. */
export const orbs: Item[] = [
  { name: "Working", orb: { state: "working" }, label: "Working", done: { verb: "Read", target: "login/page.tsx" } },
  { name: "Reasoning", orb: { state: "reasoning" }, label: "Thinking", thought: "A redirect back to /login means the session looks missing. The cookie might be set too late…", done: "Thought" },
  { name: "Searching", orb: { state: "searching" }, label: "Searching web", done: { verb: "Searched web", target: "cookie set after redirect" } },
  { name: "Searching · Lighthouse", orb: { state: "searching", variant: "lighthouse" }, label: "Searching files", done: { verb: "Searched", target: "setCookie" } },
  { name: "Working · Gyro", orb: { state: "working", variant: "gyro" }, label: "Working", done: { verb: "Edited", target: "session.ts", add: 4, del: 2 } },
  { name: "Background Tasks", orb: { state: "background" }, label: "1 Background Task", done: { verb: "Bash", target: "pnpm test --watch" } },
  { name: "Reasoning · Twins", orb: { state: "reasoning", variant: "twins" }, label: "Thinking", thought: "Tests pass. Worth loading the page on the dev server to be sure…", done: "Thought" },
  { name: "Background Tasks · Spiral", orb: { state: "background", variant: "spiral" }, label: "2 Background Tasks", done: { verb: "Bash", target: "pnpm dev" } },
  { name: "Retrying", orb: { state: "retrying" }, label: "Retrying — attempt 2 of 10" },
  // One compaction, the live line changing orb as you pass its variations; the background tasks drain once it's done.
  { name: "Compacting", orb: { state: "compacting" }, label: "Compacting context" },
  { name: "Compacting · Squeeze", orb: { state: "compacting", variant: "squeeze" }, label: "Compacting context" },
  { name: "Compacting · Fuse", orb: { state: "compacting", variant: "fuse" }, label: "Compacting context", done: { verb: "Compacted", target: "Saved 45k tokens" } },
  {
    name: "Retrying · Surge",
    orb: { state: "retrying", variant: "surge" },
    label: "Retrying — attempt 3 of 10",
    done: { text: "Fixed. The session cookie was set after the redirect, so every visit looked logged out. It's set first now, before the redirect goes out." },
  },
  // The turn never ends: after the reply, the agent carries on.
  { name: "Waiting", orb: { state: "waiting" }, label: "Waiting for usage limit to reset" },
  { name: "Base", orb: { state: "base" }, label: "Working" },
];

export type Mode = "dark" | "light";
/** The page's wrapper classes: the palette hangs off `.pg[data-mode]`, set alongside. */
export const theme = (mode: Mode) => `pg ${mode === "dark" ? "bg-black" : "bg-page"}`;

const media = (query: string) => ({
  matches: () => matchMedia(query).matches,
  subscribe: (cb: () => void) => {
    const mq = matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  },
});
/** Widths where the chat sits beside the cards and scrolling writes the turn; below them it just shows the seed rows. */
export const LG = media("(min-width: 64rem)");
export const XL = media("(min-width: 80rem)");
