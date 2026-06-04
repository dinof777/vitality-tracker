import Link from "next/link";

// Home screen — also a live smoke-test of the DESIGN.md tokens.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-16 pt-12">
      <header className="space-y-1">
        <p className="text-label text-accent">LIVE ELEVATED</p>
        <h1 className="text-h1 text-text-primary">Vitality Tracker</h1>
        <p className="text-body text-text-muted">
          Log every set. Track the overload. Hit the Daily 5.
        </p>
      </header>

      {/* Display-number sample (weight readout) */}
      <section className="mt-8 rounded-lg border border-border bg-surface p-4">
        <p className="text-caption text-text-muted">LAST SET · BENCH PRESS</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-display nums text-text-primary">185</span>
          <span className="mb-2 text-h3 text-text-muted">lb × 8</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-full bg-accent/15 px-3 text-caption font-semibold text-accent nums">
            3-1-1
          </span>
          <span className="inline-flex h-8 items-center rounded-full bg-energy/15 px-3 text-caption font-semibold text-energy">
            AMRAP
          </span>
        </div>
      </section>

      <div className="flex-1" />

      <Link
        href="/log"
        className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent transition-all duration-150 ease-out active:scale-[0.97] active:bg-accent-press"
      >
        LOG TODAY&apos;S WORKOUT
      </Link>
    </main>
  );
}
