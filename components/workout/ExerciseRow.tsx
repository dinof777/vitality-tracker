import type { Equipment } from '@/lib/database.types';
import ExerciseThumb from './ExerciseThumb';

// The one way an exercise appears in a list. Landing, builder, saved circuit and
// share pages all use this so a movement looks the same everywhere.
export default function ExerciseRow({
  index,
  name,
  equipment,
  imageUrl,
  detail,
  trailing,
}: {
  index?: number;
  name: string;
  equipment: Equipment | null;
  imageUrl: string | null;
  /** Prescription or meta line, e.g. "3 × 10 @ 3-1-1". */
  detail?: string | null;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="relative flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      {index !== undefined && (
        <span className="w-5 shrink-0 text-center text-caption font-semibold text-text-faint nums">{index}</span>
      )}
      <ExerciseThumb equipment={equipment} imageUrl={imageUrl} name={name} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-text-primary">{name}</span>
        {detail && <span className="block truncate text-caption text-text-muted nums">{detail}</span>}
      </span>
      {trailing}
    </li>
  );
}
