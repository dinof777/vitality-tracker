import Link from 'next/link';

// Static, non-interactive preview of the real builder screen
// (BuilderControls.tsx's FOCUS/INTENSITY/STYLE/EQUIPMENT summary-row recipe,
// `border border-border bg-surface p-4`) — representative values, not an
// invented mock. Every row is a real Link to /setup so clicking anywhere in
// the preview does something instead of dead-ending. See DESIGN_BRIEF.md
// "How the exercise builder works".
const ROWS = [
  { label: 'FOCUS', value: '🔥 Full Body' },
  { label: 'INTENSITY', value: 'Moderate — five exercises · 3×10 · 60s rest' },
  { label: 'STYLE', value: '⏱ Intervals' },
  { label: 'EQUIPMENT', value: 'Dumbbells, Bands, Bodyweight' },
];

export default function BuilderPreview() {
  return (
    <div>
      <p className="mb-2 text-caption text-text-faint">This is the actual screen — not a mockup.</p>
      <div>
        {ROWS.map((row) => (
          <Link
            key={row.label}
            href="/setup"
            className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
          >
            <span>
              <span className="block text-caption text-text-muted">{row.label}</span>
              <span className="block text-h3 text-text-primary">{row.value}</span>
            </span>
            <span className="text-text-faint">Change ›</span>
          </Link>
        ))}
        <Link
          href="/setup"
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          BUILD MY WORKOUT
        </Link>
      </div>
    </div>
  );
}
