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

/** npm downloads of the package since it was published, refreshed hourly; null when npm is unreachable. */
// ponytail: npm caps a range at 18 months, so from 2028-03 this undercounts; sum yearly ranges then.
export async function installs(): Promise<number | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`https://api.npmjs.org/downloads/point/2026-09-30:${today}/@yogesharc/thinking-orbs`, { next: { revalidate: 3600 } });
    return res.ok ? (await res.json()).downloads : null;
  } catch {
    return null;
  }
}
