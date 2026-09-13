export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">agentui</h1>
      <p className="max-w-md text-balance opacity-60">
        Copy-paste React components for AI interfaces. Chats, thinking orbs, streams.
      </p>
      <code className="rounded-lg border border-current/15 px-4 py-2 font-mono text-sm">
        npx agentui@latest add orb
      </code>
    </main>
  );
}
