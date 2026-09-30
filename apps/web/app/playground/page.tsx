import type { Metadata } from "next";
import { stars } from "../stars";
import { Playground } from "./playground";
import "@/components/page.css";

/** The orb playground: other geometry, rendering and tuning; unlinked and unindexed. */
export const metadata: Metadata = { robots: { index: false } };

export default async function Page() {
  return (
    <main className="flex flex-1 flex-col">
      <Playground stars={await stars()} />
    </main>
  );
}
