'use client';

import { useRouter } from 'next/navigation';
import type { WorkoutMode } from '@/lib/database.types';
import type { Intensity } from '@/lib/profile';
import BuilderControls, { type BuilderValue } from './BuilderControls';

// The gym builder's controls: the SAME component the personal app uses, wired to
// the URL instead of localStorage. Keeping the URL as the source of truth is why
// a printed QR still reproduces the exact workout when scanned.
//
// URL param note: `/g/[slug]/build` already uses `?mode=custom` to mean
// "custom vs generated build" — so the workout-STYLE mode rides under `style`
// (+ `amrapMin`/`emomMin`) instead of colliding with that key. See
// syncrofit-mode-ui-spec.md's URL-collision flag.
export default function TenantBuilderControls({
  slug,
  focus,
  intensity,
  minutes,
  tags,
  mode,
  amrapMinutes,
  emomMinutes,
  equipmentNote,
}: {
  slug: string;
  focus: string;
  intensity: Intensity;
  minutes: number;
  tags: string[];
  mode: WorkoutMode;
  amrapMinutes: number;
  emomMinutes: number;
  equipmentNote?: React.ReactNode;
}) {
  const router = useRouter();

  const push = (patch: Partial<BuilderValue>) => {
    const next = {
      focus: patch.focus ?? focus,
      intensity: patch.intensity ?? intensity,
      minutes: patch.minutes ?? minutes,
      mode: patch.mode ?? mode,
      amrapMinutes: patch.amrapMinutes ?? amrapMinutes,
      emomMinutes: patch.emomMinutes ?? emomMinutes,
    };
    const q = new URLSearchParams({
      focus: next.focus,
      mins: String(next.minutes),
      intensity: next.intensity,
      v: '1',
    });
    if (tags.length) q.set('tags', tags.join(','));
    if (next.mode !== 'intervals') q.set('style', next.mode);
    if (next.mode === 'amrap') q.set('amrapMin', String(next.amrapMinutes));
    if (next.mode === 'emom') q.set('emomMin', String(next.emomMinutes));
    router.push(`/g/${slug}/build?${q.toString()}`);
  };

  return (
    <BuilderControls
      value={{ focus, intensity, minutes, equipment: [], mode, amrapMinutes, emomMinutes }}
      onChange={push}
      showEquipment={false}
      equipmentNote={equipmentNote}
    />
  );
}
