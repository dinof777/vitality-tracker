import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';
import { tenantLibrary } from '@/lib/tenant-library';
import { generateWorkout } from '@/lib/workout-generator';
import { workoutParams, FOCUS_CHOICES, type Profile } from '@/lib/profile';
import { EQUIPMENT_ORDER } from '@/lib/exercises';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import ExerciseThumb from '@/components/workout/ExerciseThumb';

export const dynamic = 'force-dynamic';

// Focus options offered on the tenant builder (a useful subset).
const FOCI = ['full', 'upper', 'lower', 'core', 'cardio', 'mobility'] as const;
const LENGTHS = [4, 6, 8] as const;

// Public, themed: generate a workout from THIS gym's library (global + their
// custom moves, with their renames) and hand it to SyncroFit. Server-rendered so
// the names — including custom/renamed moves — appear in the HTML.
export default async function TenantBuild({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { focus?: string; len?: string };
}) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();
  const library = await tenantLibrary(tenant.id);
  const name = tenant.branding.brandName ?? tenant.name;

  const focusVal = FOCI.includes(searchParams.focus as (typeof FOCI)[number]) ? (searchParams.focus as string) : 'full';
  const count = LENGTHS.includes(Number(searchParams.len) as (typeof LENGTHS)[number]) ? Number(searchParams.len) : 6;
  const focusLabel = FOCUS_CHOICES.find((f) => f.value === focusVal)?.label ?? 'Full Body';

  // Classify on the REAL name (so timing is right), display the gym's alias.
  const byId = new Map(library.map((e) => [e.id, e]));
  const pool: Exercise[] = library.map((e) => ({
    id: e.id,
    name: e.real_name,
    muscle_group: e.muscle_group,
    default_cue: null,
    equipment: e.equipment,
    image_url: e.image_url,
    created_at: '',
  }));

  const profile: Profile = { equipment: EQUIPMENT_ORDER, focus: focusVal, intensity: 'moderate' };
  const workout = generateWorkout(profile, { focus: focusVal, count, pool });
  const wp = workoutParams(profile);

  // SyncroFit shows the gym's names; circuit id is tenant-scoped so feedback maps back.
  const displayExercises = workout.map((ex) => ({ ...ex, name: byId.get(ex.id)?.name ?? ex.name }));
  const sfUrl = workout.length
    ? syncrofitRunUrl(`${name} — ${focusLabel}`, displayExercises, wp, '', `${tenant.slug}-build`)
    : '#';

  const qs = (f: string, l: number) => `?focus=${f}&len=${l}`;

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-16 pt-10">
        <Link href={`/g/${tenant.slug}`} className="text-caption text-text-muted">
          ← {name}
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Build a workout</h1>
        <p className="mb-5 text-body text-text-muted">From {name}’s library, ready for SyncroFit.</p>

        {/* Focus */}
        <div className="mb-2 flex flex-wrap gap-2">
          {FOCI.map((f) => (
            <Link
              key={f}
              href={qs(f, count)}
              className={`rounded-full px-3 py-1.5 text-caption font-semibold ${
                f === focusVal ? 'bg-accent text-on-accent' : 'border border-border text-text-muted'
              }`}
            >
              {FOCUS_CHOICES.find((c) => c.value === f)?.label ?? f}
            </Link>
          ))}
        </div>
        {/* Length */}
        <div className="mb-6 flex gap-2">
          {LENGTHS.map((l) => (
            <Link
              key={l}
              href={qs(focusVal, l)}
              className={`rounded-full px-3 py-1.5 text-caption font-semibold ${
                l === count ? 'bg-accent text-on-accent' : 'border border-border text-text-muted'
              }`}
            >
              {l} moves
            </Link>
          ))}
        </div>

        {workout.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No moves match that focus in {name}’s library yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {workout.map((ex, i) => {
              const display = byId.get(ex.id);
              const timed = isTimed(ex);
              const presc = timed
                ? `${wp.sets} × ${wp.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
                : `${wp.sets} × ${wp.reps} @ ${wp.tempo}`;
              return (
                <li key={ex.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <span className="w-5 shrink-0 text-center text-caption font-semibold text-text-faint nums">{i + 1}</span>
                  <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={display?.name ?? ex.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-text-primary">
                      {display?.name ?? ex.name}
                      {display?.is_custom && (
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-caption font-semibold text-accent">
                          custom
                        </span>
                      )}
                    </span>
                    <span className="block text-caption text-text-muted nums">{presc}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {workout.length > 0 && (
          <a
            href={sfUrl}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press"
          >
            ⏱ SEND TO SYNCROFIT
          </a>
        )}

        <p className="mt-8 text-center text-caption text-text-faint">Powered by Vitality</p>
      </main>
    </div>
  );
}
