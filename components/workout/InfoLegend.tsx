import { SET_TYPE_INFO, TEMPO_INFO, LAST_INFO } from '@/lib/workout-types';

// Tap-to-reveal legend for the numbers in the logger (mobile-friendly, since
// hover tooltips don't show on touch). Desktop also gets native title hovers.
export default function InfoLegend() {
  const rows: { term: string; desc: string }[] = [
    { term: 'LAST', desc: LAST_INFO },
    { term: 'Tempo (e.g. 3-1-1)', desc: TEMPO_INFO },
    { term: 'AMRAP', desc: SET_TYPE_INFO.amrap },
    { term: 'Drop', desc: SET_TYPE_INFO.dropset },
    { term: '1.5 Rep', desc: SET_TYPE_INFO.half_rep },
  ];
  return (
    <div className="space-y-2 rounded-md border border-border bg-surface p-3">
      {rows.map((r) => (
        <p key={r.term} className="text-caption text-text-muted">
          <span className="font-semibold text-accent">{r.term}</span> — {r.desc}
        </p>
      ))}
    </div>
  );
}
