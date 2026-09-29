import type { Metadata } from "next";
import { stars } from "../stars";
import { V4 } from "../variations";
import "@/components/page.css";

/** A layout being tried out; unlinked and unindexed. */
export const metadata: Metadata = { robots: { index: false } };

export default async function Page() {
  return (
    <main className="flex flex-1 flex-col">
      <V4 stars={await stars()} />
    </main>
  );
}
