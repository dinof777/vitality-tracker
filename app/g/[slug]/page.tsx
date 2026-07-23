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
import SyncroFitButton from '@/components/workout/SyncroFitButton';
import SaveCircuitBox from '@/components/workout/SaveCircuitBox';
import { syncrofitRunUrl } from '@/lib/syncrofit';

export const dynamic = 'force-dynamic';

// A gym's front door. Everything shown here is REAL: the suggestion below is
// generated from this gym's own library and the equipment they've registered,
// seeded by the date so it's stable for the day.
export default async function TenantHome({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { v?: string; sw?: string };
}) {
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
      tags: e.tags,
    }));

  const today = new Date().toISOString().slice(0, 10);
  const variant = Math.max(1, Math.min(999, Number(searchParams.v) || 1));
  const swaps = new Map<number, number>();
  for (const part of (searchParams.sw ?? '').split(',').filter(Boolean)) {
    const [i, k] = part.split(':').map(Number);
    if (Number.isInteger(i) && i >= 0) swaps.set(i, Math.max(1, Math.min(50, k || 1)));
  }

  const rng = seededRng(hashString(`${tenant.slug}|${today}|${variant}`));
  const profile: Profile = { equipment: allowed, focus: 'full', intensity: 'moderate' };
  const generated = generateWorkout(profile, { focus: 'full', count: 5, pool, rng });

  // Swap one move without disturbing the rest — deterministic so the link is stable.
  const workout = generated.map((ex, i) => {
    const bumps = swaps.get(i);
    if (!bumps) return ex;
    const used = new Set(generated.map((g) => g.id));
    const alts = pool.filter((c) => !used.has(c.id));
    if (alts.length === 0) return ex;
    const pick = seededRng(hashString(`${tenant.slug}|today-swap|${i}|${bumps}|${variant}`));
    return alts[Math.floor(pick() * alts.length)] ?? ex;
  });

  const swParam = swaps.size ? `&sw=${Array.from(swaps).map(([i, k]) => `${i}:${k}`).join(',')}` : '';
  const rerollHref = (i: number) => {
    const next = new Map(swaps);
    next.set(i, (next.get(i) ?? 0) + 1);
    return `/g/${tenant.slug}?v=${variant}&sw=${Array.from(next).map(([idx, k]) => `${idx}:${k}`).join(',')}`;
  };
  const refreshAllHref = `/g/${tenant.slug}?v=${variant + 1}`;
  const wp = workoutParams(profile);
  const byId = new Map(library.map((e) => [e.id, e]));

  const presc = (ex: Exercise) =>
    isTimed(ex)
      ? `${wp.sets} × ${wp.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
      : `${wp.sets} × ${wp.reps} @ ${wp.tempo}`;

  // Today's suggestion is a real workout, so it gets the same actions as any other.
  const todayName = `${name} — Today`;
  const displayToday = workout.map((ex) => ({ ...ex, name: byId.get(ex.id)?.name ?? ex.name }));
  const sfUrl = workout.length
    ? syncrofitRunUrl(todayName, displayToday, wp, '', `${tenant.slug}-today`, { name, organization: 'Live Elevated' })
    : '#';
  void swParam;
  const todaySnapshot = workout.map((ex) => ({
    name: byId.get(ex.id)?.name ?? ex.name,
    equipment: ex.equipment,
    image_url: ex.image_url,
    notes: presc(ex),
  }));

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <TenantNav slug={tenant.slug} name={name} logoUrl={tenant.branding.logoUrl} />

      <main className="shell px-5 pb-16 pt-6">
        {/* Hero */}
        <p className="text-label text-accent">YOUR TRAINING APP</p>
        <h1 className="mb-2 text-h2 text-text-primary">Train at {name}.</h1>
        <p className="mb-4 text-body text-text-muted">Your coach’s workouts, built around your equipment and time.</p>
        <Link
          href={`/g/${tenant.slug}/build`}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press"
        >
          BUILD A WORKOUT
        </Link>
        <Link
          href={`/g/${tenant.slug}/exercises`}
          className="mb-7 mt-2 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
        >
          BROWSE THE LIBRARY
        </Link>

        {/* A real suggestion from this gym's library — not a placeholder */}
        {workout.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-label text-accent">TODAY’S SUGGESTION</p>
              <Link
                href={refreshAllHref}
                className="flex h-9 items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-3 text-caption font-semibold text-accent active:scale-[0.97]"
              >
                🔀 Refresh all
              </Link>
            </div>
            <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
              {workout.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  index={i + 1}
                  name={byId.get(ex.id)?.name ?? ex.name}
                  equipment={ex.equipment}
                  imageUrl={ex.image_url}
                  detail={presc(ex)}
                  trailing={
                    <Link
                      href={rerollHref(i)}
                      aria-label={`Swap ${byId.get(ex.id)?.name ?? ex.name}`}
                      className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-caption text-text-muted active:scale-95 active:text-accent"
                    >
                      ↻ <span className="hidden sm:inline">Swap</span>
                    </Link>
                  }
                />
              ))}
            </ul>
            <div className="mt-4">
              <SyncroFitButton url={sfUrl} />
            </div>
            <SaveCircuitBox exercises={todaySnapshot} params={wp} defaultName={todayName} />
            <Link
              href={`/g/${tenant.slug}/build`}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
            >
              BUILD A DIFFERENT ONE
            </Link>
          </>
        )}

        <p className="mt-12 text-center text-caption text-text-faint">Powered by Vitality</p>
      </main>
    </div>
  );
}
