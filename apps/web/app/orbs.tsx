"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, LayoutGrid, Rows3 } from "lucide-react";
import { ChatMock, type ChatRow } from "@/components/chat-mock";
import { Segmented, ThemeSwitch } from "@/components/theme-switch";
import { Orb, type OrbState } from "@/registry/orb/orb";

/**
 * `slug` is the orb's public name, what `<Orb state>` will take. `label` is the line it sits beside
 * in the chat, the way Dray words that state; `thought` makes it a thinking line, which names itself
 * plainly and streams a preview of the thought underneath. `done` is the row it leaves in the
 * transcript once the reader scrolls past it.
 */
export type Item = { name: string; slug: OrbState; label: string; thought?: string; done?: ChatRow };
/** Every orb, in the order one turn would reach them, so scrolling the list writes the transcript. */
const orbs: Item[] = [
  { name: "Working", slug: "working", label: "Working", done: { verb: "Read", target: "login/page.tsx" } },
  { name: "Reasoning", slug: "reasoning", label: "Thinking", thought: "A redirect back to /login means the session looks missing. The cookie might be set too late…", done: "Thought" },
  { name: "Searching", slug: "searching", label: "Searching web", done: { verb: "Searched web", target: "cookie set after redirect" } },
  { name: "Searching · Lighthouse", slug: "searching-lighthouse", label: "Searching files", done: { verb: "Searched", target: "setCookie" } },
  { name: "Working · Wring", slug: "working-wring", label: "Working", done: { verb: "Edited", target: "session.ts", add: 4, del: 2 } },
  { name: "Background Tasks", slug: "background", label: "1 Background Task", done: { verb: "Bash", target: "pnpm test --watch" } },
  { name: "Reasoning · Two", slug: "reasoning-two", label: "Thinking", thought: "Tests pass. Worth loading the page on the dev server to be sure…", done: "Thought" },
  { name: "Background Tasks · Spiral", slug: "background-spiral", label: "2 Background Tasks", done: { verb: "Bash", target: "pnpm dev" } },
  { name: "Retrying", slug: "retrying", label: "Retrying — attempt 2 of 10" },
  // One compaction, the live line changing orb as you pass its variations; the background tasks drain once it's done.
  { name: "Compacting", slug: "compacting", label: "Compacting context" },
  { name: "Compacting · Wring", slug: "compacting-wring", label: "Compacting context" },
  { name: "Compacting · Fuse", slug: "compacting-fuse", label: "Compacting context", done: { verb: "Compacted", target: "Saved 45k tokens" } },
  {
    name: "Retrying · Ease out",
    slug: "retrying-ease-out",
    label: "Retrying — attempt 3 of 10",
    done: { text: "Fixed. The session cookie was set after the redirect, so every visit looked logged out. It's set first now, before the redirect goes out." },
  },
  // The turn never ends: after the reply, the agent carries on.
  { name: "Waiting", slug: "waiting", label: "Waiting for usage limit to reset" },
  { name: "Base", slug: "base", label: "Working" },
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
const SHADCN = "npx shadcn@latest add https://thinkingorbs.com/r/orb.json";

function Install({ command = COMMAND }: { command?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-2 flex w-fit items-center gap-3 rounded-xl whitespace-nowrap bg-foreground/[0.07] py-2.5 pr-3.5 pl-4 font-mono text-[13px] transition-colors hover:bg-foreground/[0.1]"
    >
      <span>
        <span className="text-muted-foreground">$ </span>
        {command}
      </span>
      {copied ? <Check className="size-3.5" aria-label="Copied" /> : <Copy className="size-3.5 text-muted-foreground" aria-label="Copy" />}
    </button>
  );
}

/** A card's face: the orb on an inset stage, its name underneath. */
function Card({ item }: { item: Item }) {
  return (
    <>
      <span className="flex h-56 w-full items-center justify-center rounded-2xl bg-foreground/[0.06] shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_12%,transparent)]">
        <Orb size={96} state={item.slug} />
      </span>
      <span className="w-full px-4 pt-3 pb-4 text-center text-sm font-medium">{item.name}</span>
    </>
  );
}

const CARD = "flex w-full flex-col rounded-2xl bg-foreground/[0.04] transition-shadow hover:shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_30%,transparent)]";
const RING = "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_30%,transparent)]";
const EDGE = "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_8%,transparent)]";

/**
 * One card per orb, stacked in story order. The picked one wears the hover ring; clicking a card
 * scrolls it onto the pick line, which keeps it picked.
 */
function OrbList({ picked, onPick }: { picked: Item; onPick: (item: Item) => void }) {
  return (
    <ul className="flex flex-col gap-4">
      {orbs.map((item) => {
        const on = item === picked;
        return (
          <li key={item.slug} data-orb={item.slug}>
            <button
              type="button"
              aria-pressed={on}
              onClick={(e) => {
                onPick(item);
                const r = e.currentTarget.getBoundingClientRect();
                scrollBy({ top: r.top + r.height / 2 - pickLine(), behavior: "smooth" });
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
        <li key={item.slug} className={`${CARD} ${EDGE}`}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}

const USAGE = `import { Orb } from "thinkingorbs";

export function Thinking() {
  return (
    <span className="flex items-center gap-2 text-sm">
      <Orb state="reasoning" />
      Thinking
    </span>
  );
}`;

const props = [
  { name: "state", type: "OrbState", fallback: `"base"`, note: "Which orb to draw: any name below." },
  { name: "size", type: "number", fallback: "20", note: "Width and height in px. Every orb is tuned to read at 20." },
  { name: "className", type: "string", fallback: "", note: "The orb draws in the text color, so text-* classes tint it." },
];

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
    <pre className="overflow-x-auto rounded-2xl bg-foreground/[0.08] p-5 font-mono text-[13px] leading-relaxed text-foreground shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_10%,transparent)]">
      <code>{highlight(children)}</code>
    </pre>
  );
}

/** A section of the guide: a heading, then prose and code. */
function Guide({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-24 w-full scroll-mt-12">
      <h2 className="mb-6 text-base font-medium tracking-[-0.01em]">{title}</h2>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/** X's logo; lucide dropped its brand icons. */
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.9 1.2h3.7l-8 9.2 9.4 12.4h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3Z" />
    </svg>
  );
}

function Credit() {
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      <p>
        Made by{" "}
        <a href="https://yogesharc.com" className="text-foreground hover:underline">
          Yogesh
        </a>
      </p>
      <p className="flex items-center gap-1.5">
        <a href="https://x.com/yogesharc" className="flex items-center gap-1.5 text-foreground hover:underline">
          <XLogo className="size-3" />
          @yogesharc
        </a>
        <span aria-hidden>·</span>
        <a href="https://www.patreon.com/c/yogesharc" className="text-foreground hover:underline">
          Sponsor
        </a>
      </p>
    </div>
  );
}

/** How far down the viewport a card has to cross to be picked: a third of the way, so the first card starts picked. */
const pickLine = () => innerHeight * 0.35;

/** The page for people and the page for agents: two links styled as a switch, this one lit. */
function Readers() {
  const pages = [
    { href: "/", label: "Human" },
    { href: "/agent", label: "Agent" },
  ];
  return (
    <nav aria-label="Reader" className="flex rounded-full bg-foreground/[0.07] p-0.5 text-sm">
      {pages.map(({ href, label }) => {
        const here = href === "/";
        return (
          <Link
            key={href}
            href={href}
            aria-current={here ? "page" : undefined}
            className={`flex h-7 items-center rounded-full px-3 transition-colors ${here ? "bg-(--knob) text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.2),0_0_0_0.5px_rgb(0_0_0/0.06)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const VIEWS = [
  { id: "list", label: "List with chat", Icon: Rows3 },
  { id: "grid", label: "Grid", Icon: LayoutGrid },
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
export function Orbs() {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [picked, setPicked] = useState(orbs[0]);
  const [view, setView] = useState<"list" | "grid">("list");
  const [active, setActive] = useState(toc[0].id);
  // A click scrolls its card to the middle; until that lands, the cards it passes shouldn't pick themselves.
  const clicked = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const line = pickLine();
      if (performance.now() > clicked.current) {
        const card = [...document.querySelectorAll<HTMLElement>("[data-orb]")].find((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= line && r.bottom >= line;
        });
        const item = card && orbs.find((o) => o.slug === card.dataset.orb);
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

  return (
    <div
      data-mode={mode}
      className={`pg flex flex-1 flex-col gap-12 px-4 py-12 sm:px-8 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:gap-y-0 lg:py-0 ${mode === "dark" ? "bg-black" : "bg-page"}`}
    >
      <header className="flex flex-col justify-between gap-12 lg:sticky lg:top-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-screen lg:py-12">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl leading-[1.1] font-medium tracking-[-0.03em] sm:text-4xl">
            Thinking Orbs
            <span className="block text-muted-foreground">for AI Agents</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Animated status orbs, built to read at 20px, the size they actually sit at in a real interface.
          </p>
          <Install />
          <div className="flex flex-wrap gap-2">
            <Readers />
            <Segmented label="Layout" value={view} options={VIEWS} onChange={setView} />
          </div>
          <nav aria-label="Contents" className="mt-8 hidden lg:block">
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
        </div>
        <div className="flex flex-col items-start gap-4">
          <ThemeSwitch mode={mode} onChange={setMode} />
          <Credit />
        </div>
      </header>

      {view === "grid" ? (
        <section id="orbs" aria-label="Orbs" className="min-w-0 scroll-mt-12 lg:col-start-2 lg:row-start-1 lg:py-12">
          <OrbGrid />
        </section>
      ) : (
        // Its own box, so the sticky chat is bounded by the cards and scrolls away before the guide.
        <div className="flex flex-col gap-12 lg:col-start-2 lg:row-start-1 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
          <aside aria-label="The picked orb in a chat" className="flex items-center lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:h-screen lg:items-start lg:pt-[30vh] lg:pb-12">
            <ChatMock
              rows={[...SEED, ...orbs.slice(0, orbs.indexOf(picked)).flatMap((o) => (o.done ? [o.done] : []))]}
              live={picked.slug.startsWith("background") ? undefined : picked}
              tasks={
                orbs.indexOf(picked) <= orbs.findIndex((o) => o.slug === "compacting-fuse")
                  ? orbs.slice(0, orbs.indexOf(picked) + 1).findLast((o) => o.slug.startsWith("background"))
                  : undefined
              }
              className="lg:max-h-full"
            />
          </aside>

          <section id="orbs" aria-label="Orbs" className="min-w-0 scroll-mt-12 lg:col-start-1 lg:row-start-1 lg:py-12">
            <OrbList picked={picked} onPick={pick} />
          </section>
        </div>
      )}

      <div className="max-w-2xl min-w-0 pb-24 lg:col-start-2 lg:row-start-2">
        <Guide id="installation" title="Installation">
          <p>Add it to any React project. It needs nothing but React.</p>
          <Install />
          <p>To own the source instead, copy it into your project and change anything you like:</p>
          <Install command={SHADCN} />
          <p>
            That writes it to <code className="font-mono text-[13px] text-foreground">components/orb.tsx</code>, so import it from{" "}
            <code className="font-mono text-[13px] text-foreground">@/components/orb</code>.
          </p>
        </Guide>

        <Guide id="usage" title="Usage">
          <p>Import it and give it a state.</p>
          <Code>{USAGE}</Code>
          <h3 className="mt-4 text-sm font-medium text-foreground">Props</h3>
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-foreground/10">
                <th className="py-2 pr-4 font-normal">Prop</th>
                <th className="py-2 pr-4 font-normal">Type</th>
                <th className="py-2 pr-4 font-normal">Default</th>
                <th className="py-2 font-normal">What it does</th>
              </tr>
            </thead>
            <tbody>
              {props.map((p) => (
                <tr key={p.name} className="border-b border-foreground/10 align-top">
                  <td className="py-2 pr-4 font-mono text-[13px] text-foreground">{p.name}</td>
                  <td className="py-2 pr-4 font-mono text-[13px]">{p.type}</td>
                  <td className="py-2 pr-4 font-mono text-[13px]">{p.fallback}</td>
                  <td className="py-2">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Names:{" "}
            {grouped.map((item, i) => (
              <span key={item.slug}>
                {i > 0 && ", "}
                <code className="font-mono text-[13px] text-foreground">{item.slug}</code>
              </span>
            ))}
            .
          </p>
        </Guide>
      </div>
    </div>
  );
}

