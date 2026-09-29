"use client";

import { useState } from "react";
import { Docs, Hero, Links, OrbGrid, OrbList, StoryChat, theme, Toc, TopBar, useStory, XL, type Mode } from "./orbs";

// Homepage layouts tried out at /v1 to /v6; the fifth became the homepage. Each wide-screen column that
// holds several blocks is `contents` on small screens, so `order` can slot the cards in after the pitch and before the guide.

/** The old homepage with the contents and switches in a row along the top, and the links in a footer. */
export function V1({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");
  const [view, setView] = useState<"list" | "grid">("list");
  const { picked, pick, wide } = useStory();

  return (
    <div data-mode={mode} className={`${theme(mode)} flex flex-1 flex-col`}>
      {/* No fill, so cards scroll up to the page's edge; on wide screens nothing sits beneath its two ends. */}
      <div className="z-10 flex h-12 items-center justify-between px-4 sm:px-8 lg:sticky lg:top-0">
        <Toc className="gap-4" />
        <TopBar stars={stars} mode={mode} onMode={setMode} view={view} onView={setView} />
      </div>

      <div className="flex flex-col gap-12 px-4 py-12 sm:px-8 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:gap-y-0 lg:py-0">
        <header className="lg:sticky lg:top-12 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:h-[calc(100vh-3rem)] lg:items-center lg:pb-12">
          <Hero license />
        </header>
        <section id={view === "grid" ? "orbs" : undefined} hidden={view !== "grid"} aria-label="Orbs" className="min-w-0 scroll-mt-12 lg:col-start-2 lg:row-start-1 lg:py-12">
          <OrbGrid />
        </section>
        <div hidden={view !== "list"} className="flex flex-col gap-12 lg:col-start-2 lg:row-start-1 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
          <StoryChat picked={picked} wide={wide} className="lg:sticky lg:top-12 lg:col-start-2 lg:row-start-1 lg:h-[calc(100vh-3rem)] lg:items-start lg:pt-[calc(30vh-3rem)] lg:pb-12" />
          <section id={view === "list" ? "orbs" : undefined} aria-label="Orbs" className="min-w-0 scroll-mt-12 lg:col-start-1 lg:row-start-1 lg:py-12">
            <OrbList picked={picked} onPick={pick} />
          </section>
        </div>
        <Docs className="lg:col-start-2 lg:row-start-2 lg:pb-24" />
      </div>

      <footer className="border-t border-foreground/10 px-4 py-8 sm:px-8">
        <Links license={false} />
      </footer>
    </div>
  );
}

/** Two columns: the pitch above the cards, the chat beside them. */
export function V2({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");
  const { picked, pick, wide } = useStory();

  return (
    <div data-mode={mode} className={`${theme(mode)} relative flex flex-1 flex-col px-4 sm:px-8`}>
      <TopBar stars={stars} mode={mode} onMode={setMode} className="absolute top-12 right-4 z-10 sm:right-8 lg:fixed" />
      <div className="mx-auto flex w-full max-w-[58rem] flex-col gap-12 py-12 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:py-0">
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-12 lg:py-12">
          <Hero />
          <section id="orbs" aria-label="Orbs" className="order-1 min-w-0">
            <OrbList picked={picked} onPick={pick} />
          </section>
        </div>
        <StoryChat picked={picked} wide={wide} className="lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:h-screen lg:items-start lg:pt-[30vh] lg:pb-12" />
      </div>
      <div className="mx-auto w-full max-w-[58rem] pb-24">
        <Docs />
      </div>
      <footer className="mx-auto w-full max-w-[58rem] pb-12">
        <Links />
      </footer>
    </div>
  );
}

/** The second layout with the cards two to a row, zigzagging, and the first's row of contents and switches on top. */
export function V6({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");
  const [view, setView] = useState<"list" | "grid">("list");
  const { picked, pick, wide } = useStory();

  return (
    <div data-mode={mode} className={`${theme(mode)} flex flex-1 flex-col px-4 sm:px-8`}>
      <div className="z-10 mx-auto flex h-12 w-full max-w-[90rem] items-center justify-between lg:sticky lg:top-0">
        <Toc className="gap-4" />
        <TopBar stars={stars} mode={mode} onMode={setMode} view={view} onView={setView} />
      </div>
      <div className="mx-auto flex w-full max-w-[64rem] flex-col">
        <section id={view === "grid" ? "orbs" : undefined} hidden={view !== "grid"} aria-label="Orbs" className="flex flex-col gap-12 py-12">
          <div className="max-w-sm">
            <Hero />
          </div>
          <OrbGrid />
        </section>
        <div hidden={view !== "list"} className="flex flex-col gap-12 py-12 lg:grid lg:grid-cols-[39rem_minmax(0,1fr)] lg:items-start lg:gap-x-12 lg:py-0">
          <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-12 lg:py-12">
            <div className="max-w-sm">
              <Hero />
            </div>
            <section id={view === "list" ? "orbs" : undefined} aria-label="Orbs" className="order-1 min-w-0">
              <OrbList picked={picked} onPick={pick} className="sm:grid-cols-2" />
            </section>
          </div>
          <StoryChat picked={picked} wide={wide} className="lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:h-screen lg:items-start lg:pt-[30vh] lg:pb-12" />
        </div>
        <Docs className="max-w-[39rem]! pb-24" />
        <footer className="pb-12">
          <Links />
        </footer>
      </div>
    </div>
  );
}

/** The pitch and the guide in one column, every orb in a grid beside it. No chat. */
export function V3({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");

  return (
    <div
      data-mode={mode}
      className={`${theme(mode)} relative flex flex-1 flex-col gap-12 px-4 py-12 sm:px-8 lg:grid lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:py-0`}
    >
      <TopBar stars={stars} mode={mode} onMode={setMode} className="absolute top-12 right-4 z-10 sm:right-8 lg:fixed" />
      <div className="contents lg:sticky lg:top-0 lg:col-start-1 lg:row-start-1 lg:flex lg:max-h-screen lg:flex-col lg:overflow-y-auto lg:py-12 lg:[scrollbar-width:none]">
        <Hero />
        <Docs className="order-1" />
        <footer className="order-2 lg:mt-24">
          <Links />
        </footer>
      </div>
      <section id="orbs" aria-label="Orbs" className="min-w-0 lg:col-start-2 lg:row-start-1 lg:pt-24 lg:pb-12">
        <OrbGrid className="sm:grid-cols-2" />
      </section>
    </div>
  );
}

/**
 * The third layout with the chat back as a sticky column on the right. The cards sit two to a row
 * in story order, and scrolling zigzags through each row: left card, then right.
 */
export function V4({ stars }: { stars: number | null }) {
  const [mode, setMode] = useState<Mode>("dark");
  const { picked, pick, wide } = useStory(XL);

  return (
    <div
      data-mode={mode}
      className={`${theme(mode)} relative flex flex-1 flex-col gap-12 px-4 py-12 sm:px-8 xl:grid xl:grid-cols-[22rem_minmax(0,1fr)_22rem] xl:items-start xl:gap-x-12 xl:py-0`}
    >
      <TopBar stars={stars} mode={mode} onMode={setMode} className="absolute top-12 right-4 z-10 sm:right-8 xl:fixed" />
      <div className="contents xl:sticky xl:top-0 xl:col-start-1 xl:row-start-1 xl:flex xl:max-h-screen xl:flex-col xl:overflow-y-auto xl:py-12 xl:[scrollbar-width:none]">
        <Hero />
        <Docs className="order-1" />
        <footer className="order-2 xl:mt-24">
          <Links />
        </footer>
      </div>
      <StoryChat picked={picked} wide={wide} className="xl:sticky xl:top-0 xl:col-start-3 xl:row-start-1 xl:h-screen xl:items-start xl:pt-[30vh] xl:pb-12" />
      <section id="orbs" aria-label="Orbs" className="min-w-0 xl:col-start-2 xl:row-start-1 xl:pt-[30vh] xl:pb-[40vh]">
        <OrbList picked={picked} onPick={pick} className="sm:grid-cols-2" />
      </section>
    </div>
  );
}
