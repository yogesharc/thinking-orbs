import { Orbs } from "./orbs";
import { installs, stars } from "./stars";
import "@/components/page.css";

export default async function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Orbs stars={await stars()} installs={await installs()} />
    </main>
  );
}
