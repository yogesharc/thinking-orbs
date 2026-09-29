import { REPO } from "./llms";

/** The repo's star count, refreshed hourly; null while the repo is private or GitHub is unreachable. */
export async function stars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, { next: { revalidate: 3600 } });
    return res.ok ? (await res.json()).stargazers_count : null;
  } catch {
    return null;
  }
}
