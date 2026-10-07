import type { Metadata } from "next";
import { stars } from "../stars";
import { Playground } from "./playground";
import "@/components/page.css";

const title = "Playground - Thinking Orbs";
const description = "Tune every Thinking Orb live: shape, render, color, size, speed and density, then copy the <Orb /> JSX.";
// Setting openGraph here drops the root's opengraph-image, so name it again.
const images = ["/opengraph-image"];

/** The orb playground: other geometry, rendering and tuning. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/playground" },
  openGraph: { title, description, url: "/playground", siteName: "Thinking Orbs", type: "website", images },
  twitter: { card: "summary_large_image", title, description, creator: "@yogesharc", images },
};

export default async function Page() {
  return (
    <main className="flex flex-1 flex-col">
      <Playground stars={await stars()} />
    </main>
  );
}
