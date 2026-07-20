import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';
import { tenantLibrary } from '@/lib/tenant-library';
import { tenantEquipmentSlugs } from '@/lib/tenant-equipment';
import { generateWorkout } from '@/lib/workout-generator';
import { workoutParams, type Profile } from '@/lib/profile';
import { EQUIPMENT_ORDER } from '@/lib/exercises';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { hashString, seededRng } from '@/lib/seed';
import TenantNav from '@/components/layout/TenantNav';
import ExerciseRow from '@/components/workout/ExerciseRow';

export const dynamic = 'force-dynamic';

// A gym's front door. Everything shown here is REAL: the suggestion below is
// generated from this gym's own library and the gear they've registered, seeded
// by the date so it's stable for the day.
export default async function TenantHome({ params }: { params: { slug: string } }) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();

  const name = tenant.branding.brandName ?? tenant.name;
  const library = await tenantLibrary(tenant.id);
  const gear = await tenantEquipmentSlugs(tenant.id);
  const allowed = gear.length ? gear : EQUIPMENT_ORDER;

  const pool: Exercise[] = library
    .filter((e) => e.equipment && allowed.includes(e.equipment))
    .map((e) => ({
      id: e.id,
      name: e.real_name,
      muscle_group: e.muscle_group,
      default_cue: null,
      equipment: e.equipment,
      image_url: e.image_url,
      created_at: '',
    }));

  const today = new Date().toISOString().slice(0, 10);
  const rng = seededRng(hashString(`${tenant.slug}|${today}`));
  const profile: Profile = { equipment: allowed, focus: 'full', intensity: 'moderate' };
  const workout = generateWorkout(profile, { focus: 'full', count: 5, pool, rng });
  const wp = workoutParams(profile);
  const byId = new Map(library.map((e) => [e.id, e]));

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <TenantNav slug={tenant.slug} name={name} logoUrl={tenant.branding.logoUrl} />

      <main className="mx-auto max-w-md px-5 pb-16 pt-8">
        {/* Hero */}
        <p className="text-label text-accent">YOUR TRAINING APP</p>
        <h1 className="mb-2 text-h1 text-text-primary">Train at {name}.</h1>
        <p className="mb-5 text-body text-text-muted">
          Your coach’s workouts, on your phone — built around your gear and time, ready to run with a tap.
        </p>
        <Link
          href={`/g/${tenant.slug}/build`}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press"
        >
          BUILD A WORKOUT
        </Link>
        <Link
          href={`/g/${tenant.slug}/exercises`}
          className="mb-9 mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
        >
          BROWSE THE LIBRARY
        </Link>

        {/* A real suggestion from this gym's library — not a placeholder */}
        {workout.length > 0 && (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-label text-accent">TODAY’S SUGGESTION</p>
              <span className="text-caption text-text-faint nums">{workout.length} moves</span>
            </div>
            <ul className="space-y-2">
              {workout.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  index={i + 1}
                  name={byId.get(ex.id)?.name ?? ex.name}
                  equipment={ex.equipment}
                  imageUrl={ex.image_url}
                  detail={
                    isTimed(ex)
                      ? `${wp.sets} × ${wp.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
                      : `${wp.sets} × ${wp.reps} @ ${wp.tempo}`
                  }
                />
              ))}
            </ul>
            <Link
              href={`/g/${tenant.slug}/build?focus=full&len=6&v=1`}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
            >
              BUILD TODAY’S WORKOUT
            </Link>
          </>
        )}

        <p className="mt-12 text-center text-caption text-text-faint">Powered by Vitality</p>
      </main>
    </div>
  );
}
