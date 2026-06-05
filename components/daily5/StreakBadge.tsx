interface StreakBadgeProps {
  streak: number;
}

// Flame + streak count. Accent/energy when active, muted at zero.
export default function StreakBadge({ streak }: StreakBadgeProps) {
  const active = streak > 0;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
        active ? 'bg-energy/15' : 'bg-surface-raised'
      }`}
    >
      <span className={`text-h3 ${active ? '' : 'opacity-40 grayscale'}`}>🔥</span>
      <span className="nums">
        <span className={`text-h3 font-extrabold ${active ? 'text-energy' : 'text-text-muted'}`}>
          {streak}
        </span>{' '}
        <span className="text-caption text-text-muted">day{streak === 1 ? '' : 's'}</span>
      </span>
    </div>
  );
}
