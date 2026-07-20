'use client';

import { useRouter } from 'next/navigation';
import type { Intensity } from '@/lib/profile';
import BuilderControls, { type BuilderValue } from './BuilderControls';

// The gym builder's controls: the SAME component the personal app uses, wired to
// the URL instead of localStorage. Keeping the URL as the source of truth is why
// a printed QR still reproduces the exact workout when scanned.
export default function TenantBuilderControls({
  slug,
  focus,
  intensity,
  minutes,
  tags,
  equipmentNote,
}: {
  slug: string;
  focus: string;
  intensity: Intensity;
  minutes: number;
  tags: string[];
  equipmentNote?: React.ReactNode;
}) {
  const router = useRouter();

  const push = (patch: Partial<BuilderValue>) => {
    const next = {
      focus: patch.focus ?? focus,
      intensity: patch.intensity ?? intensity,
      minutes: patch.minutes ?? minutes,
    };
    const q = new URLSearchParams({
      focus: next.focus,
      mins: String(next.minutes),
      intensity: next.intensity,
      v: '1',
    });
    if (tags.length) q.set('tags', tags.join(','));
    router.push(`/g/${slug}/build?${q.toString()}`);
  };

  return (
    <BuilderControls
      value={{ focus, intensity, minutes, equipment: [] }}
      onChange={push}
      showEquipment={false}
      equipmentNote={equipmentNote}
    />
  );
}
