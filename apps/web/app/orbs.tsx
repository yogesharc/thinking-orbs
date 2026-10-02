"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChatMock, type ChatRow } from "@/components/chat-mock";
import { Orb } from "@/registry/orb/orb";
import { EXTRAS, EXTRAS_VANILLA, LLMS, props, REPO, USAGE, VANILLA } from "./llms";
import { LG, orbs, theme, XL, type Item, type Mode } from "./orbs-data";

/** The same orbs for the grid: each state followed by its variations, states in the order the story meets them. */
const family = (o: Item) => o.name.split(" · ")[0];
const grouped = orbs.toSorted((a, b) => orbs.findIndex((o) => family(o) === family(a)) - orbs.findIndex((o) => family(o) === family(b)));
/** Rows already in the turn when the page opens, so the chat never starts empty. */
const SEED: ChatRow[] = [
  { verb: "Read", target: "middleware.ts" },
  { verb: "Edited", target: "middleware.ts", add: 3, del: 1 },
  { verb: "Bash", target: "pnpm test" },
];

const COMMAND = "npm i @yogesharc/thinking-orbs";

/** Copies `text` to the clipboard, and whether it just did, for a "Copied" that lasts 1.5s. */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return [copied, copy] as const;
}

/** A button that copies the agent prompt: the docs as markdown. */
function CopyPrompt({ className = "" }: { className?: string }) {
  const [copied, copy] = useCopy(LLMS);
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy a prompt for your agent"
      className={`w-[6.25rem] shrink-0 rounded-lg bg-fill py-1 text-sm text-foreground transition-colors hover:bg-fill-hover ${className}`}
    >
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}

/**
 * The install command, copied on click, with Copy prompt inside the bar when `prompt` is set. The hero leaves
 * it out: its 20rem column has no room for both beside the scoped name.
 */
function Install({ command = COMMAND, prompt }: { command?: string; prompt?: boolean }) {
  const [copied, copy] = useCopy(command);
  return (
    <div className="flex w-full items-center rounded-xl text-sm text-foreground whitespace-nowrap ring-1 ring-foreground/12">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${command}`}
        className="min-w-0 flex-1 overflow-x-auto py-2.5 pr-3 pl-4 text-left font-mono [scrollbar-width:none]"
      >
        {copied ? (
          <span className="text-muted-foreground">Copied</span>
        ) : (
          <>
            <span className="text-muted-foreground">$ </span>
            {command}
          </>
        )}
      </button>
      {/* Phones leave no room beside the scoped name, and the hero's Copy prompt is there anyway. */}
      {prompt && <CopyPrompt className="mr-1.5 hidden sm:block" />}
    </div>
  );
}

/** A card's face: the orb on an inset stage, its name underneath. */
function Card({ item }: { item: Item }) {
  return (
    <>
      <span className="flex h-56 w-full items-center justify-center rounded-2xl bg-foreground/[0.06] shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_12%,transparent)] light:bg-fill">
        <Orb size={96} {...item.orb} />
      </span>
      <span className="w-full px-4 pt-3 pb-4 text-center text-sm">
        {item.name.split(" · ")[0]}
        {item.orb.variant && <span className="text-muted-foreground"> · {item.name.split(" · ")[1]}</span>}
      </span>
    </>
  );
}

const CARD = "flex w-full flex-col rounded-2xl bg-foreground/[0.04] transition-shadow hover:shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_30%,transparent)] light:bg-white light:shadow-[0_1px_2px_rgb(0_0_0/0.07),0_1px_1px_rgb(0_0_0/0.04)]! light:ring-1 light:ring-foreground/12 light:hover:ring-foreground/30";
const RING = "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_30%,transparent)] light:ring-foreground/30";
const EDGE = "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_8%,transparent)]";

/**
 * One card per orb in story order. The picked one wears the hover ring; clicking a card
 * scrolls it onto the pick line, which keeps it picked.
 */
export function OrbList({
  picked,
  onPick,
  className = "sm:grid-cols-2 lg:grid-cols-1",
}: {
  picked: Item;
  onPick: (item: Item, el: HTMLElement) => void;
  className?: string;
}) {
  return (
    <ul className={`grid gap-4 ${className}`}>
      {orbs.map((item) => {
        const on = item === picked;
        return (
          <li key={item.name} data-orb={item.name}>
            <button type="button" aria-pressed={on} onClick={(e) => onPick(item, e.currentTarget)} className={`${CARD} ${on ? RING : EDGE}`}>
              <Card item={item} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Every orb at once, grouped by state; nothing to pick, since there's no chat beside it. */
export function OrbGrid({ className = "sm:grid-cols-2 xl:grid-cols-3" }: { className?: string }) {
  return (
    <ul className={`grid gap-4 ${className}`}>
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
    <pre className="overflow-x-auto rounded-2xl bg-fill p-5 font-mono text-sm leading-relaxed text-foreground shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_10%,transparent)] light:bg-transparent light:shadow-none light:ring-1 light:ring-foreground/12">
      <code>{highlight(children)}</code>
    </pre>
  );
}

/** A section of the guide: a heading, then prose and code. */
function Guide({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-24 w-full scroll-mt-12">
      <h2 className="mb-1.5 text-sm font-medium tracking-[-0.01em]">{title}</h2>
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
          className={`h-8 rounded-lg px-3 transition-colors ${value === id ? "bg-fill text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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

export function Links({ license = true }: { license?: boolean }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
      <a href="https://www.patreon.com/c/yogesharc" target="_blank" rel="noopener" className={UNDERLINE}>
        Sponsor
      </a>
      <a href="https://x.com/yogesharc" target="_blank" rel="noopener" className={UNDERLINE}>
        X
      </a>
      <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener" className={UNDERLINE}>
        GitHub
      </a>
      <a href="/llms.txt" target="_blank" className={UNDERLINE}>
        llms.txt
      </a>
      {license && <span>MIT License</span>}
    </p>
  );
}

function Credit({ license }: { license?: boolean }) {
  return (
    <p className="flex gap-x-3 text-sm text-muted-foreground">
      <span>
        Built by{" "}
        <a href="https://yogesharc.com?ref=thinkingorbs.com" target="_blank" rel="noopener" className={UNDERLINE}>
          Yogesh
        </a>
      </span>
      {license && <span>MIT License</span>}
    </p>
  );
}

/** The pitch: name, one line on what it is, the install bar and who made it. */
export function Hero({ license }: { license?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.1] font-medium tracking-[-0.03em]">
          Thinking Orbs
          <span className="block text-muted-foreground">for AI Interfaces</span>
        </h1>
        <p className="text-sm text-muted-foreground">A component library of well-crafted, animated AI status indicators for React. No dependencies, 3.8&nbsp;KB gzipped.</p>
      </div>
      <Install />
      <div className="flex items-center gap-3">
        <CopyPrompt />
        <Credit license={license} />
      </div>
    </div>
  );
}


// The marker oval draws on the first page load only, not on every remount after client navigation.
let markerDrawn = false;

/** GitHub stars and the theme switch, with the Playground link, Sponsor or the View all switch when the page has them. */
export function TopBar({
  stars,
  mode,
  onMode,
  view,
  onView,
  sponsor,
  playground,
  className = "",
}: {
  stars: number | null;
  mode: Mode;
  onMode: (mode: Mode) => void;
  view?: "list" | "grid";
  onView?: (view: "list" | "grid") => void;
  sponsor?: boolean;
  /** Show the Playground link; `"here"` lights it, for the playground itself. */
  playground?: boolean | "here";
  className?: string;
}) {
  const [draw] = useState(() => !markerDrawn);
  useEffect(() => {
    markerDrawn = true;
  }, []);
  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      {playground && (
        // Tablets and up: on a phone the row has no room, and the playground needs a wide screen anyway.
        <Link
          href="/playground"
          aria-current={playground === "here" ? "page" : undefined}
          className={`relative mx-2 hidden transition-colors md:inline ${playground === "here" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Playground
          {playground === true && (
            // A marker scrawl round the link, so the eye finds it.
            <svg aria-hidden viewBox="0 0 100 40" preserveAspectRatio="none" className="pointer-events-none absolute -left-3.5 -top-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+1.75rem)] -rotate-5 overflow-visible text-pink-500">
              <path
                className={draw ? "marker" : undefined}
                pathLength={1}
                d="M84 7C62 0 18 2 6 14C-4 25 12 37 46 38C80 39 100 30 97 17C94 6 72 2 52 5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
        </Link>
      )}
      {sponsor && (
        <a href="https://www.patreon.com/c/yogesharc" target="_blank" rel="noopener" className="text-muted-foreground transition-colors hover:text-foreground">
          Sponsor
        </a>
      )}
      {view && onView && (
        // Small screens only ever show the grid with the chat, so there's nothing to switch.
        <button
          type="button"
          onClick={() => {
            onView(view === "list" ? "grid" : "list");
            scrollTo({ top: 0 });
          }}
          className="hidden text-muted-foreground transition-colors hover:text-foreground lg:block"
        >
          {view === "list" ? "View all" : "Back"}
        </button>
      )}
      <a
        href={`https://github.com/${REPO}`}
        target="_blank"
        rel="noopener"
        aria-label={stars === null ? "GitHub" : `Star on GitHub, ${stars} stars`}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <GitHubLogo className="size-4" />
        {stars !== null && <span className="tabular-nums">{Intl.NumberFormat("en", { notation: "compact" }).format(stars)}</span>}
      </a>
      <button
        type="button"
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => onMode(mode === "dark" ? "light" : "dark")}
        className={UNDERLINE}
      >
        {mode === "dark" ? "Light" : "Dark"}
      </button>
    </div>
  );
}

/** Orbs, Installation, Usage, with the section you're reading lit. From another page, `base` points them back at the homepage. */
export function Toc({ className = "flex-col gap-2", base = "" }: { className?: string; base?: string }) {
  const [active, setActive] = useState<string | null>(base ? null : toc[0].id);
  useEffect(() => {
    if (base) return;
    // The current section is the last one whose top has passed 40% down the viewport.
    const onScroll = () =>
      setActive(toc.findLast(({ id }) => document.getElementById(id)!.getBoundingClientRect().top <= innerHeight * 0.4)?.id ?? toc[0].id);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [base]);
  return (
    <nav aria-label="Contents">
      <ul className={`flex text-sm ${className}`}>
        {toc.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`${base}#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={`transition-colors ${active === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
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

/** Dray's mark, from Dray's own assets. */
function DrayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 96" fill="currentColor" aria-hidden className={className}>
      <path d="M48.2787 0C49.9989 5.053e-08 51.3934 1.4046 51.3934 3.13726V8.78431C51.3934 17.4476 58.3661 24.4706 66.9672 24.4706H72.8852C74.6055 24.4706 76 25.8752 76 27.6078V68.3922C76 70.1248 74.6055 71.5294 72.8852 71.5294H66.9672C58.3661 71.5294 51.3934 78.5524 51.3934 87.2157V92.8627C51.3934 94.5954 49.9989 96 48.2787 96H0.155738C0.0697261 96 0 95.9298 0 95.8431V64.7843C0 64.6977 0.0697261 64.6275 0.155738 64.6275H29.2787C37.8798 64.6275 44.8525 57.6045 44.8525 48.9412V47.0588C44.8525 38.3955 37.8798 31.3726 29.2787 31.3726H0.155738C0.0697261 31.3726 0 31.3023 0 31.2157V0.156863C0 0.0702299 0.0697261 0 0.155738 0H48.2787Z" />
    </svg>
  );
}

/** Yogesh's tools, this one first and in full colour. */
function Tools() {
  return (
    <nav aria-label="More tools by Yogesh" className="flex items-center gap-4 text-sm">
      <Link href="/" aria-current="page" className="flex items-center gap-1.5 text-foreground">
        <Orb size={20} />
        Thinking Orbs
      </Link>
      <a href="https://drayhq.com?ref=thinkingorbs.com" target="_blank" rel="noopener" className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
        <DrayMark className="h-3 w-auto" />
        Dray
      </a>
    </nav>
  );
}

/** How far down the viewport a card has to cross to be picked: about a third, capped so tall screens don't push the cards far down. */
const pickLine = () => Math.min(innerHeight * 0.35, 360);


/**
 * The picked card: whichever crosses the pick line once the screen is `wide`. When a row holds
 * several, its height is split between them left to right, so scrolling zigzags through the row.
 */
export function useStory(wide = LG) {
  const [picked, setPicked] = useState(orbs[0]);
  const isWide = useSyncExternalStore(wide.subscribe, wide.matches, () => true);
  // A click scrolls its card to the line; until that lands, the cards it passes shouldn't pick themselves.
  const clicked = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (!wide.matches() || performance.now() < clicked.current) return;
      const line = pickLine();
      const row = [...document.querySelectorAll<HTMLElement>("[data-orb]")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= line && r.bottom >= line;
      });
      if (!row.length) return;
      const r = row[0].getBoundingClientRect();
      const card = row[Math.min(row.length - 1, Math.floor(((line - r.top) / r.height) * row.length))];
      const item = orbs.find((o) => o.name === card.dataset.orb);
      if (item) setPicked(item);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [wide]);

  const pick = (item: Item, el: HTMLElement) => {
    clicked.current = performance.now() + 900;
    setPicked(item);
    if (!wide.matches()) return;
    // Land the line in this card's share of its row, so the next scroll doesn't hand it to a neighbour.
    const r = el.getBoundingClientRect();
    const row = [...document.querySelectorAll<HTMLElement>("[data-orb]")].filter((c) => c.getBoundingClientRect().top === r.top);
    const k = row.indexOf(el.closest<HTMLElement>("[data-orb]")!);
    scrollBy({ top: r.top + (r.height * (k + 0.5)) / row.length - pickLine(), behavior: "smooth" });
  };

  return { picked, pick, wide: isWide };
}

/** The picked orb live in a chat turn; on wide screens, the orbs before it are already rows above. */
export function StoryChat({ picked, wide, className = "" }: { picked: Item; wide: boolean; className?: string }) {
  const at = orbs.indexOf(picked);
  return (
    <aside aria-label="The picked orb in a chat" className={`flex flex-col gap-3 ${className}`}>
      <ChatMock
        rows={wide ? [...SEED, ...orbs.slice(0, at).flatMap((o) => (o.done ? [o.done] : []))] : SEED}
        live={picked.orb.state === "background" ? undefined : picked}
        tasks={at <= orbs.findIndex((o) => o.name === "Compacting · Fuse") ? orbs.slice(0, at + 1).findLast((o) => o.orb.state === "background") : undefined}
        className="min-h-0"
      />
    </aside>
  );
}

/** Ways to install: the package from each package manager, or shadcn to copy the React source in. */
const INSTALLS = [
  { id: "npm", label: "npm", command: COMMAND },
  { id: "pnpm", label: "pnpm", command: "pnpm add @yogesharc/thinking-orbs" },
  { id: "yarn", label: "yarn", command: "yarn add @yogesharc/thinking-orbs" },
  { id: "bun", label: "bun", command: "bun add @yogesharc/thinking-orbs" },
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

/** Installation and Usage: which package manager and which language to show are theirs alone. `llms` ends them with a link to /llms.txt. */
export function Docs({ className = "", llms }: { className?: string; llms?: boolean }) {
  const [via, setVia] = useState<(typeof INSTALLS)[number]["id"]>("npm");
  const [lang, setLang] = useState<"react" | "js">("react");
  return (
    <div className={`max-w-xl min-w-0 ${className}`}>
      <Guide id="installation" title="Installation">
        <p>Install Thinking Orbs from npm, or copy the React component into your project with shadcn. The React orb needs nothing but React, and the plain JS one needs nothing at all.</p>
        <div className="flex flex-col gap-2">
          <Tabs label="Install with" value={via} options={INSTALLS} onChange={setVia} />
          <Install command={INSTALLS.find((o) => o.id === via)?.command ?? COMMAND} prompt />
        </div>
        {via === "shadcn" && (
          <p>
            That copies the React source into <code className="font-mono text-foreground">components/</code>, yours to change,
            so import it from <code className="font-mono text-foreground">@/components/orb</code>. The extra shapes and renders
            below are <code className="font-mono text-foreground">orb-shapes.json</code> and{" "}
            <code className="font-mono text-foreground">orb-renders.json</code> beside it.
          </p>
        )}
      </Guide>

      <Guide id="usage" title="Usage">
        <p>{lang === "react" ? "Import the Orb component and give it a state, and optionally a variant." : "Point it at any <svg> on the page and give it a state, and optionally a variant."}</p>
        <div className="flex flex-col gap-2">
          <Tabs label="Language" value={lang} options={LANGS} onChange={setLang} />
          <Code>{lang === "react" ? USAGE : VANILLA}</Code>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <h3 className="font-medium text-foreground">{lang === "react" ? "Props" : "Options"}</h3>
          <span>All optional</span>
        </div>
        <div className="overflow-x-auto">
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
        </div>
        <h3 className="mt-4 font-medium text-foreground">Shapes and renders</h3>
        <p>
          The orb is a sphere of dots. Other shapes and ways of drawing it are opt-in, so only what you import lands in your bundle.
          Try them all in the{" "}
          <Link href="/playground" className={UNDERLINE}>
            playground
          </Link>
          .
        </p>
        <Code>{lang === "react" ? EXTRAS : EXTRAS_VANILLA}</Code>
        {llms && (
          <a href="/llms.txt" target="_blank" className={`self-start ${UNDERLINE}`}>
            llms.txt
          </a>
        )}
      </Guide>
    </div>
  );
}

/**
 * The row across the top of every shipped page: contents on the left, the tools centred (equal side
 * columns keep them centred whatever sits beside them), then Playground, Sponsor and the switches.
 * On phones the contents drop out and the tools move left. `page` says which page it's on.
 */
export function SiteHeader({ stars, mode, onMode, page = "home" }: { stars: number | null; mode: Mode; onMode: (mode: Mode) => void; page?: "home" | "playground" }) {
  return (
    <div className="z-10 mx-auto flex h-12 w-full max-w-[90rem] shrink-0 items-center justify-between gap-4 px-4 sm:px-8 md:grid md:grid-cols-[1fr_auto_1fr] xl:sticky xl:top-0">
      <div className="hidden md:block">
        <Toc className="gap-4" base={page === "home" ? "" : "/"} />
      </div>
      <div className="md:col-start-2">
        <Tools />
      </div>
      <TopBar stars={stars} mode={mode} onMode={onMode} playground={page === "playground" ? "here" : true} sponsor className="justify-self-end" />
    </div>
  );
}

/**
 * The landing page. Contents and switches run along the top; on wide screens the pitch sits in a
 * sticky left column, the orbs two to a row in the middle, and the chat sticky on the right. Scrolling
 * zigzags through each row of cards, picking the one the pick line crosses, and the chat's live line shows it.
 */
export function Orbs({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");
  const { picked, pick, wide } = useStory(XL);

  return (
    <div data-mode={mode} className={`${theme(mode)} flex flex-1 flex-col`}>
      <SiteHeader stars={stars} mode={mode} onMode={setMode} />

      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-12 px-4 py-12 sm:px-8 xl:grid xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start xl:gap-x-12 xl:gap-y-0 xl:py-0">
        <header className="xl:sticky xl:top-12 xl:col-start-1 xl:row-start-1 xl:flex xl:h-[calc(100vh-3rem)] xl:items-center xl:pb-12">
          <Hero license />
        </header>
        {/* The chat spans the cards and the guide, so it stays pinned while the last rows reach the pick line on tall screens. */}
        <div className="flex flex-col gap-12 xl:col-start-2 xl:row-start-1 xl:grid xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start xl:gap-x-12 xl:gap-y-0">
          <StoryChat picked={picked} wide={wide} className="xl:sticky xl:top-12 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:h-[calc(100vh-3rem)] xl:items-start xl:pt-[calc(min(30vh,312px)-3rem)] xl:pb-12" />
          {/* Starts level with the chat, so the pick line opens on the first row's left card. */}
          <section id="orbs" aria-label="Orbs" className="min-w-0 scroll-mt-12 xl:col-start-1 xl:row-start-1 xl:pt-[calc(min(30vh,312px)-3rem)] xl:pb-12">
            <OrbList picked={picked} onPick={pick} className="sm:grid-cols-2" />
          </section>
          <Docs llms className="xl:col-start-1 xl:row-start-2 xl:min-h-screen xl:pb-24" />
        </div>
      </div>
    </div>
  );
}
