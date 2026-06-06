import type { Equipment } from '@/lib/database.types';

interface ExerciseThumbProps {
  equipment: Equipment | null;
  imageUrl?: string | null;
  name: string;
  size?: number;
}

// Equipment illustrations — lime line-art on a carbon tile. Used as the visual
// for an exercise until a real photo (image_url) is set, then the photo wins.
function EquipmentIcon({ equipment }: { equipment: Equipment | null }) {
  const common = {
    fill: 'none',
    stroke: 'var(--accent)',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (equipment) {
    case 'dumbbell':
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
        </svg>
      );
    case 'tube_band':
      // Long band with two handles.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <path d="M4 7v10M20 7v10" />
          <path d="M4 12c5-6 11 6 16 0" />
        </svg>
      );
    case 'loop_band':
      // Mini loop band — a ring.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <ellipse cx="12" cy="12" rx="8" ry="5" />
        </svg>
      );
    case 'kettlebell':
      // Bell body + handle.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <path d="M9 8a3 3 0 0 1 6 0" />
          <circle cx="12" cy="15" r="6" />
        </svg>
      );
    case 'pullup_bar':
      // Bar + two arms + head.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <path d="M4 5h16M9 5v6M15 5v6" />
          <circle cx="12" cy="15" r="2.5" />
        </svg>
      );
    case 'medicine_ball':
      // Ball with a cross seam.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4v16" />
        </svg>
      );
    case 'jump_rope':
      // Two handles + rope arc.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <path d="M6 5v4M18 5v4" />
          <path d="M6 9c0 9 12 9 12 0" />
        </svg>
      );
    case 'isometric':
      // Stopwatch — isometric work is timed holds.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <circle cx="12" cy="14" r="7" />
          <path d="M12 14V10M10 3h4M19 7l-1.5 1.5" />
        </svg>
      );
    case 'stretch':
      // Flexion arc with a figure.
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <circle cx="9" cy="5" r="2" />
          <path d="M9 8v6l-3 5M9 11l5 1 3 4M5 20c4-9 11-9 15-3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" {...common}>
          <path d="M6 12h12M12 6v12" />
        </svg>
      );
  }
}

export default function ExerciseThumb({
  equipment,
  imageUrl,
  name,
  size = 48,
}: ExerciseThumbProps) {
  const style = { width: size, height: size };
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        style={style}
        className="shrink-0 rounded-md border border-border object-cover"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised"
      aria-hidden
    >
      <EquipmentIcon equipment={equipment} />
    </div>
  );
}
