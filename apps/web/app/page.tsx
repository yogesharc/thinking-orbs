import { Orbs } from "./orbs";
import { stars } from "./stars";
import "@/components/page.css";

export default async function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Orbs stars={await stars()} />
    </main>
  );
}
