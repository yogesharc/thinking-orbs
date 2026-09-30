"use client";

import { useLayoutEffect, useRef } from "react";
import { Orb, type OrbLook } from "@/registry/orb/orb";

/** A finished step: "Thought", the agent's reply `text`, or a tool call's past-tense verb, its target, and for edits the lines added and removed. */
export type ChatRow = "Thought" | { text: string } | { verb: string; target: string; add?: number; del?: number };
type Live = { orb: OrbLook };

/** One line of the turn: a 20px slot for the orb (empty on finished rows), then the text, always at the same x. */
function Row({ orb, children }: { orb?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-start gap-2">
      <span className="flex h-[1.65em] w-5 shrink-0 items-center">{orb}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2">{children}</div>
    </div>
  );
}

function Done({ row }: { row: ChatRow }) {
  if (row === "Thought") return <span className="text-muted-foreground">Thought</span>;
  if ("text" in row) return <p>{row.text}</p>;
  return (
    <>
      <span className="text-foreground/80">{row.verb}</span>
      <span className="truncate text-muted-foreground">{row.target}</span>
      {row.add !== undefined && (
        <span className="tabular-nums">
          <span className="text-[oklch(0.7_0.15_163)]">+{row.add}</span>{" "}
          <span className="text-[oklch(0.704_0.191_22.216)]">-{row.del}</span>
        </span>
      )}
    </>
  );
}

/**
 * A turn drawn the way Dray's transcript draws one: the user's question pinned at the top, the
 * finished steps, then the live line (`live`, an orb beside its label, thinking with a preview
 * underneath). When the rows outgrow the box the
 * oldest clip under the question, fading, so the newest line always shows.
 */
export function ChatMock({
  rows,
  live,
  tasks,
  className = "",
}: {
  rows: ChatRow[];
  live?: Live & { label: string; thought?: string };
  /** Background work still running, pinned below the turn until it drains, like a dev server. */
  tasks?: Live & { label: string };
  className?: string;
}) {
  // Whether the rows overflow, written straight onto the list so the fade only shows when something's cut.
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = list.current!;
    el.dataset.full = String(el.scrollHeight > el.clientHeight + 1);
  });

  return (
    <div className={`flex w-full flex-col gap-3 text-sm leading-[1.65] ${className}`}>
      <p className="max-w-[85%] shrink-0 self-end rounded-xl bg-fill px-3 py-2">
        The login page keeps redirecting to itself. Can you fix it?
      </p>
      {/* justify-end pushes any overflow out of the top, so the oldest rows are the ones cut off. */}
      <div
        ref={list}
        className="flex min-h-0 flex-col justify-end gap-1.5 overflow-hidden data-[full=true]:[mask-image:linear-gradient(to_bottom,transparent,black_3rem)]"
      >
        {rows.map((row, i) => (
          <Row key={i}>
            <Done row={row} />
          </Row>
        ))}
        {live && (
          <>
            <Row orb={<Orb {...live.orb} />}>
              {/* Thinking names itself plainly and streams a preview of the thought underneath; the rest shimmer. */}
              <span key={live.label} className={`transition-opacity duration-300 starting:opacity-0 ${live.thought ? "text-muted-foreground" : "shimmer"}`}>
                {live.label}
              </span>
            </Row>
            {live.thought && (
              <Row>
                <p key={live.thought} className="text-muted-foreground italic transition-opacity duration-300 starting:opacity-0">
                  {live.thought}
                </p>
              </Row>
            )}
          </>
        )}
      </div>
      {tasks && (
        <Row orb={<Orb {...tasks.orb} />}>
          <span key={tasks.label} className="shimmer transition-opacity duration-300 starting:opacity-0">
            {tasks.label}
          </span>
        </Row>
      )}
    </div>
  );
}
