import { Orbs } from "./orbs";
import "@/components/page.css";

const REPO = "monorepo-labs/thinkingorbs";

/** The repo's star count, refreshed hourly; null while the repo is private or GitHub is unreachable. */
async function stars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, { next: { revalidate: 3600 } });
    return res.ok ? (await res.json()).stargazers_count : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Orbs repo={REPO} stars={await stars()} />
    </main>
  );
}
