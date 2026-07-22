'use client';

import { useState } from 'react';
import { focusPillarNodes, focusGroupNodes, isPillarToken } from '@/lib/profile';
import MuscleDrillDown from '@/components/workout/MuscleDrillDown';

interface Props {
  /** Currently selected focus value — same value MuscleDrillDown highlights on. */
  value: string;
  /**
   * Fired with a real, selectable focus value — Full Body/Balanced at step 1,
   * or a composite `pillar[:group[:deep]]` value at step 2. Never fires for a
   * bare pillar token (Strength/Cardio/Balance/Flexibility/Physical Therapy)
   * tapped at step 1 — that just advances to step 2 instead.
   */
  onSelect: (value: string) => void;
  /**
   * Seed step 2 directly on this pillar instead of starting at step 1 (Full
   * Body, Balanced, the 5 pillar tiles) — e.g. onboarding pre-seeding from the
   * goal just picked in its own step 1. Only consulted once, on mount (this
   * component remounts fresh each time its host re-shows it, e.g. the
   * builder's focus sheet reopening or onboarding stepping back to this
   * screen) — the user's own "‹ Back" tap or picking a different pillar tile
   * takes over from there. `null` (the default) always starts at step 1.
   */
  initialPillar?: string | null;
}

// The two-step pillar-first focus drill: step 1 = focusPillarNodes() (Full
// Body, Balanced, and the 5 pillar tiles — Strength/Cardio/Balance/
// Flexibility/Physical Therapy), step 2 = focusGroupNodes(pillar) (a muscle
// group, optionally drilling to a deep muscle or joint), both rendered via the
// shared MuscleDrillDown. Extracted out of BuilderControls so the per-workout
// builder and onboarding's focus step share this exact drill instead of two
// hand-rolled copies that can drift apart — see lib/profile.ts for the tree
// builders and the composite-value grammar (`pillar[:group[:deep]]`) they
// produce. The "Set as default" link and the sheet's DONE button are NOT part
// of this component — those are host-specific chrome that live around it.
export default function FocusPicker({ value, onSelect, initialPillar = null }: Props) {
  // null = step 1 (pick a pillar); a pillar token = step 2 (pick a muscle
  // group, optionally drilling to a deep muscle/joint).
  const [pillarStep, setPillarStep] = useState<string | null>(initialPillar);

  if (pillarStep === null) {
    return (
      <MuscleDrillDown
        nodes={focusPillarNodes()}
        value={value}
        onSelect={(v) => {
          if (isPillarToken(v)) {
            setPillarStep(v);
          } else {
            onSelect(v);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setPillarStep(null)}
        className="flex items-center gap-1 text-caption font-semibold text-accent"
      >
        ‹ Back
      </button>
      <MuscleDrillDown nodes={focusGroupNodes(pillarStep)} value={value} onSelect={onSelect} />
    </div>
  );
}
