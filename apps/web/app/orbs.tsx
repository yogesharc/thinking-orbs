"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChatMock, type ChatRow } from "@/components/chat-mock";
import { Orb, type OrbLook } from "@/registry/orb/orb";
import { LLMS, props, REPO, USAGE, VANILLA } from "./llms";

/**
 * `orb` is what `<Orb>` takes: the state and, for a variation, its variant. `label` is the line it sits beside
 * in the chat, the way Dray words that state; `thought` makes it a thinking line, which names itself
 * plainly and streams a preview of the thought underneath. `done` is the row it leaves in the
 * transcript once the reader scrolls past it.
 */
export type Item = { name: string; orb: OrbLook; label: string; thought?: string; done?: ChatRow };
/** Every orb, in the order one turn would reach them, so scrolling the list writes the transcript. */
const orbs: Item[] = [
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
/** The same orbs for the grid: each state followed by its variations, states in the order the story meets them. */
const family = (o: Item) => o.name.split(" · ")[0];
const grouped = orbs.toSorted((a, b) => orbs.findIndex((o) => family(o) === family(a)) - orbs.findIndex((o) => family(o) === family(b)));
/** Rows already in the turn when the page opens, so the chat never starts empty. */
const SEED: ChatRow[] = [
  { verb: "Read", target: "middleware.ts" },
  { verb: "Edited", target: "middleware.ts", add: 3, del: 1 },
  { verb: "Bash", target: "pnpm test" },
];

const COMMAND = "npm i thinkingorbs";

/** The install command, copied on click, beside a button that copies the agent prompt instead. */
function Install({ command = COMMAND }: { command?: string }) {
  const [copied, setCopied] = useState<"command" | "prompt" | null>(null);
  const copy = (what: "command" | "prompt") =>
    navigator.clipboard.writeText(what === "command" ? command : LLMS).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    });

  return (
    <div className="flex w-full items-center rounded-xl bg-foreground/[0.07] text-sm text-foreground whitespace-nowrap light:bg-transparent light:ring-1 light:ring-foreground/12">
      <button
        type="button"
        onClick={() => copy("command")}
        aria-label={`Copy ${command}`}
        className="min-w-0 flex-1 overflow-x-auto py-2.5 pr-3 pl-4 text-left font-mono [scrollbar-width:none]"
      >
        {copied === "command" ? (
          <span className="text-muted-foreground">Copied</span>
        ) : (
          <>
            <span className="text-muted-foreground">$ </span>
            {command}
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => copy("prompt")}
        aria-label="Copy a prompt for your agent"
        className="mr-1.5 w-[6.25rem] shrink-0 rounded-lg bg-foreground/[0.1] py-1 text-foreground transition-colors hover:bg-foreground/[0.16]"
      >
        {copied === "prompt" ? "Copied" : "Copy prompt"}
      </button>
    </div>
  );
}

/** A card's face: the orb on an inset stage, its name underneath. */
function Card({ item }: { item: Item }) {
  return (
    <>
      <span className="flex h-56 w-full items-center justify-center rounded-2xl bg-foreground/[0.06] shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_12%,transparent)]">
        <Orb size={96} {...item.orb} />
      </span>
      <span className="w-full px-4 pt-3 pb-4 text-center text-sm font-medium">
        {item.name.split(" · ")[0]}
        {item.orb.variant && <span className="text-muted-foreground"> · {item.name.split(" · ")[1]}</span>}
      </span>
    </>
  );
}

const CARD = "flex w-full flex-col rounded-2xl bg-foreground/[0.04] transition-shadow hover:shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_30%,transparent)] light:bg-transparent light:ring-1 light:ring-foreground/12 light:hover:ring-foreground/30";
const RING = "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_30%,transparent)] light:ring-foreground/30";
const EDGE = "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_8%,transparent)]";

/**
 * One card per orb, stacked in story order. The picked one wears the hover ring; clicking a card
 * scrolls it onto the pick line, which keeps it picked.
 */
function OrbList({ picked, onPick }: { picked: Item; onPick: (item: Item) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {orbs.map((item) => {
        const on = item === picked;
        return (
          <li key={item.name} data-orb={item.name}>
            <button
              type="button"
              aria-pressed={on}
              onClick={(e) => {
                onPick(item);
                const r = e.currentTarget.getBoundingClientRect();
                if (isWide()) scrollBy({ top: r.top + r.height / 2 - pickLine(), behavior: "smooth" });
              }}
              className={`${CARD} ${on ? RING : EDGE}`}
            >
              <Card item={item} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Every orb at once, grouped by state; nothing to pick, since there's no chat beside it. */
function OrbGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {grouped.map((item) => (
        <li key={item.name} className={`${CARD} ${EDGE}`}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Just enough TSX highlighting for our own snippets, in match order: comments, strings, keywords,
 * JSX tag names and JSX attribute names. Colours sit mid-lightness so they read in both themes.
 */
const SYNTAX = /(\/\/.*)|("[^"]*")|\b(import|from|export|function|return|const|type)\b|(?<=<\/?)([A-Za-z][\w.]*)|\b([a-zA-Z]+)(?==)/g;
const TONES = [
  "text-muted-foreground italic",
  "text-[oklch(0.68_0.13_155)]",
  "text-[oklch(0.66_0.15_300)]",
  "text-[oklch(0.66_0.13_240)]",
  "text-[oklch(0.72_0.12_65)]",
];
function highlight(src: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of src.matchAll(SYNTAX)) {
    out.push(src.slice(last, m.index));
    const g = m.slice(1).findIndex(Boolean);
    out.push(
      <span key={m.index} className={TONES[g]}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(src.slice(last));
  return out;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-foreground/[0.08] p-5 font-mono text-sm leading-relaxed text-foreground shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_10%,transparent)] light:bg-transparent light:shadow-none light:ring-1 light:ring-foreground/12">
      <code>{highlight(children)}</code>
    </pre>
  );
}

/** A section of the guide: a heading, then prose and code. */
function Guide({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-24 w-full scroll-mt-12">
      <h2 className="mb-1.5 text-base font-medium tracking-[-0.01em]">{title}</h2>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/** Tabs over what they switch: only the open one is filled. */
function Tabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`h-8 rounded-lg px-3 transition-colors ${value === id ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** A text link with a soft, offset underline that firms up on hover. */
const UNDERLINE =
  "text-muted-foreground underline decoration-foreground/25 decoration-[1.5px] underline-offset-[5px] transition-colors hover:text-foreground hover:decoration-foreground/60";

function Links() {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
      <a href="https://www.patreon.com/c/yogesharc" className={UNDERLINE}>
        Sponsor
      </a>
      <a href="https://x.com/yogesharc" className={UNDERLINE}>
        X
      </a>
      <a href={`https://github.com/${REPO}`} className={UNDERLINE}>
        GitHub
      </a>
      <a href="/llms.txt" className={UNDERLINE}>
        llms.txt
      </a>
      <span>MIT License</span>
    </p>
  );
}

function Credit() {
  return (
    <p className="text-sm text-muted-foreground">
      Built by{" "}
      <a href="https://yogesharc.com" className={UNDERLINE}>
        Yogesh
      </a>
    </p>
  );
}

/** GitHub's mark; lucide dropped its brand icons. */
function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/** How far down the viewport a card has to cross to be picked: a third of the way, so the first card starts picked. */
const pickLine = () => innerHeight * 0.35;

/** Desktop, where the chat sits beside the cards and scrolling writes the turn; smaller screens just show it. */
const WIDE = "(min-width: 64rem)";
const isWide = () => matchMedia(WIDE).matches;
const onWideChange = (cb: () => void) => {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const VIEWS = [
  { id: "list", label: "List" },
  { id: "grid", label: "Grid" },
] as const;

/** Ways to install: the package from each package manager, or shadcn to copy the React source in. */
const INSTALLS = [
  { id: "npm", label: "npm", command: COMMAND },
  { id: "pnpm", label: "pnpm", command: "pnpm add thinkingorbs" },
  { id: "yarn", label: "yarn", command: "yarn add thinkingorbs" },
  { id: "bun", label: "bun", command: "bun add thinkingorbs" },
  { id: "shadcn", label: "shadcn", command: "npx shadcn@latest add https://thinkingorbs.com/r/orb.json" },
] as const;

const LANGS = [
  { id: "react", label: "React" },
  { id: "js", label: "JS" },
] as const;

const toc = [
  { id: "orbs", label: "Orbs" },
  { id: "installation", label: "Installation" },
  { id: "usage", label: "Usage" },
];

/**
 * The landing page, three columns on wide screens: the pitch and contents on the left and the chat
 * on the right stay put while the orbs scroll between them; the guide follows below. Whichever card
 * sits across the middle of the screen is picked, and the chat's live line shows it.
 */
export function Orbs({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [picked, setPicked] = useState(orbs[0]);
  const [view, setView] = useState<"list" | "grid">("list");
  const [lang, setLang] = useState<"react" | "js">("react");
  const [via, setVia] = useState<(typeof INSTALLS)[number]["id"]>("npm");
  const [active, setActive] = useState(toc[0].id);
  const wide = useSyncExternalStore(onWideChange, isWide, () => true);
  // A click scrolls its card to the middle; until that lands, the cards it passes shouldn't pick themselves.
  const clicked = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const line = pickLine();
      if (isWide() && performance.now() > clicked.current) {
        const card = [...document.querySelectorAll<HTMLElement>("[data-orb]")].find((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= line && r.bottom >= line;
        });
        const item = card && orbs.find((o) => o.name === card.dataset.orb);
        if (item) setPicked(item);
      }
      // The current section is the last one whose top has passed 40% down the viewport.
      setActive(toc.findLast(({ id }) => document.getElementById(id)!.getBoundingClientRect().top <= innerHeight * 0.4)?.id ?? toc[0].id);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  const pick = (item: Item) => {
    clicked.current = performance.now() + 900;
    setPicked(item);
  };

  const layout = (
    <div role="radiogroup" aria-label="Layout" className="mb-4 hidden gap-4 text-sm lg:flex">
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          onClick={() => setView(id)}
          className={`transition-colors ${view === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div
      data-mode={mode}
      className={`pg relative flex flex-1 flex-col gap-12 px-4 py-12 sm:px-8 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:gap-y-0 lg:py-0 ${mode === "dark" ? "bg-black" : "bg-page"}`}
    >
      <header className="flex flex-col justify-between gap-12 lg:sticky lg:top-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-screen lg:py-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-[1.1] font-medium tracking-[-0.03em]">
              Thinking Orbs
              <span className="block text-muted-foreground">for AI Agents</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              A library of beautiful status orbs for React and plain JS. One component, every state tuned to read at small sizes.
            </p>
          </div>
          <Install />
          <Credit />
        </div>
        {/* Wide screens only; small ones get the links in a footer below the guide. */}
        <div className="hidden flex-col gap-8 lg:flex">
          <nav aria-label="Contents">
            <ul className="flex flex-col gap-2 text-sm">
              {toc.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={active === id ? "location" : undefined}
                    className={`transition-colors ${active === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Links />
        </div>
      </header>

      {/* Pinned on wide screens; on small ones it sits at the top and scrolls away. */}
      <div className="absolute top-12 right-4 z-10 flex items-center gap-4 text-sm sm:right-8 lg:fixed">
        <a
          href={`https://github.com/${REPO}`}
          aria-label={stars === null ? "GitHub" : `Star on GitHub, ${stars} stars`}
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <GitHubLogo className="size-4" />
          {stars !== null && <span className="tabular-nums">{Intl.NumberFormat("en", { notation: "compact" }).format(stars)}</span>}
        </a>
        <button
          type="button"
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          className={UNDERLINE}
        >
          {mode === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      {view === "grid" ? (
        <section id="orbs" aria-label="Orbs" className="min-w-0 scroll-mt-12 lg:col-start-2 lg:row-start-1 lg:py-12">
          {layout}
          <OrbGrid />
        </section>
      ) : (
        // Its own box, so the sticky chat is bounded by the cards and scrolls away before the guide.
        <div className="flex flex-col gap-12 lg:col-start-2 lg:row-start-1 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
          <aside aria-label="The picked orb in a chat" className="flex items-center lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:h-screen lg:items-start lg:pt-[30vh] lg:pb-12">
            <ChatMock
              rows={wide ? [...SEED, ...orbs.slice(0, orbs.indexOf(picked)).flatMap((o) => (o.done ? [o.done] : []))] : SEED}
              live={picked.orb.state === "background" ? undefined : picked}
              tasks={
                orbs.indexOf(picked) <= orbs.findIndex((o) => o.name === "Compacting · Fuse")
                  ? orbs.slice(0, orbs.indexOf(picked) + 1).findLast((o) => o.orb.state === "background")
                  : undefined
              }
              className="lg:max-h-full"
            />
          </aside>

          <section id="orbs" aria-label="Orbs" className="min-w-0 scroll-mt-12 lg:col-start-1 lg:row-start-1 lg:py-12">
            {layout}
            <OrbList picked={picked} onPick={pick} />
          </section>
        </div>
      )}

      <div className="max-w-xl min-w-0 lg:pb-24 lg:col-start-2 lg:row-start-2">
        <Guide id="installation" title="Installation">
          <p>Add it to any project. The React orb needs nothing but React, and the plain JS one needs nothing at all.</p>
          <div className="flex flex-col gap-2">
            <Tabs label="Install with" value={via} options={INSTALLS} onChange={setVia} />
            <Install command={INSTALLS.find((o) => o.id === via)!.command} />
          </div>
          {via === "shadcn" && (
            <p>
              That copies the React source into <code className="font-mono text-foreground">components/</code>, yours to change,
              so import it from <code className="font-mono text-foreground">@/components/orb</code>.
            </p>
          )}
        </Guide>

        <Guide id="usage" title="Usage">
          <p>{lang === "react" ? "Import it and give it a state." : "Point it at any <svg> on the page and give it a state."}</p>
          <div className="flex flex-col gap-2">
            <Tabs label="Language" value={lang} options={LANGS} onChange={setLang} />
            <Code>{lang === "react" ? USAGE : VANILLA}</Code>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="font-medium text-foreground">{lang === "react" ? "Props" : "Options"}</h3>
            <span>All optional</span>
          </div>
          <table className="w-full text-left">
            <thead className="text-muted-foreground">
              <tr className="border-b border-foreground/10">
                <th className="py-2 pr-4 font-normal">Prop</th>
                <th className="py-2 pr-4 font-normal">Type</th>
                <th className="py-2 pr-4 font-normal">Default</th>
                <th className="py-2 font-normal">Description</th>
              </tr>
            </thead>
            <tbody>
              {props.filter((p) => lang === "react" || !p.react).map((p) => (
                <tr key={p.name} className="border-b border-foreground/10 align-top">
                  <td className="py-2 pr-4 font-mono text-foreground">{p.name}</td>
                  <td className="py-2 pr-4 font-mono">{p.type}</td>
                  <td className="py-2 pr-4 font-mono">{p.fallback}</td>
                  <td className="py-2">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Guide>
      </div>

      <footer className="lg:hidden">
        <Links />
      </footer>
    </div>
  );
}

