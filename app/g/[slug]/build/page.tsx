import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import type { Exercise } from '@/lib/database.types';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';
import { tenantLibrary } from '@/lib/tenant-library';
import { generateWorkout } from '@/lib/workout-generator';
import { workoutParams, FOCUS_CHOICES, lengthToCount, DEFAULT_LENGTH, LENGTH_MIN, LENGTH_MAX, type Profile, type Intensity } from '@/lib/profile';
import { EQUIPMENT_ORDER, EQUIPMENT_LABEL } from '@/lib/exercises';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import { hashString, seededRng } from '@/lib/seed';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import PrintButton from '@/components/PrintButton';
import ShareWorkoutButton from '@/components/workout/ShareWorkoutButton';
import CustomWorkoutBuilder from '@/components/workout/CustomWorkoutBuilder';
import TenantNav from '@/components/layout/TenantNav';
import SaveCircuitBox from '@/components/workout/SaveCircuitBox';
import SyncroFitButton from '@/components/workout/SyncroFitButton';
import TenantBuilderControls from '@/components/workout/TenantBuilderControls';
import { filterByFacets, tagsInCategory, type TagCategory } from '@/lib/tags';
import { tenantEquipmentSlugs } from '@/lib/tenant-equipment';
import { currentTrainer } from '@/lib/current-tenant';

export const dynamic = 'force-dynamic';

// Focus options offered on the tenant builder (a useful subset).
const FOCI = ['full', 'upper', 'lower', 'core', 'cardio', 'mobility', 'physical-therapy', 'knee'] as const;
const LENGTHS = [4, 6, 8] as const;

// Public, themed: generate a workout from THIS gym's library (global + their
// custom moves, with their renames) and hand it to SyncroFit. Server-rendered so
// the names — including custom/renamed moves — appear in the HTML.
export default async function TenantBuild({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { focus?: string; len?: string; mins?: string; intensity?: string; v?: string; mode?: string; tags?: string; sw?: string };
}) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();
  const library = await tenantLibrary(tenant.id);
  const name = tenant.branding.brandName ?? tenant.name;

  // Only build with gear the gym actually has. Empty = not set up yet, so fall
  // back to everything rather than producing an empty workout.
  const gymEquipment = await tenantEquipmentSlugs(tenant.id);
  const equipmentSet = gymEquipment.length > 0;
  const allowedEquipment = equipmentSet ? gymEquipment : EQUIPMENT_ORDER;
  const me = await currentTrainer();
  const isMyGym = me?.tenant.id === tenant.id;

  const focusVal = FOCI.includes(searchParams.focus as (typeof FOCI)[number]) ? (searchParams.focus as string) : 'full';
  // Minutes (like the personal app) rather than a fixed move count. `len` is still
  // honoured so older printed QR codes keep resolving.
  const minutes = searchParams.mins
    ? Math.min(LENGTH_MAX, Math.max(LENGTH_MIN, Number(searchParams.mins) || DEFAULT_LENGTH))
    : DEFAULT_LENGTH;
  const count = LENGTHS.includes(Number(searchParams.len) as (typeof LENGTHS)[number])
    ? Number(searchParams.len)
    : lengthToCount(minutes);
  const intensity: Intensity = (['light', 'moderate', 'intense'] as const).includes(searchParams.intensity as Intensity)
    ? (searchParams.intensity as Intensity)
    : 'moderate';
  const variant = Math.max(1, Math.min(999, Number(searchParams.v) || 1));
  // Per-slot rerolls: sw=0:2,3:1 means "slot 0 swapped twice, slot 3 once".
  const swaps = new Map<number, number>();
  for (const part of (searchParams.sw ?? '').split(',').filter(Boolean)) {
    const [i, k] = part.split(':').map(Number);
    if (Number.isInteger(i) && i >= 0) swaps.set(i, Math.max(1, Math.min(50, k || 1)));
  }
  const focusLabel = FOCUS_CHOICES.find((f) => f.value === focusVal)?.label ?? 'Full Body';
  const custom = searchParams.mode === 'custom';

  // Tag facets narrow the pool the generator draws from — so "Stage 3 + Knee PT"
  // generates a stage-3 knee session rather than a general workout.
  const selectedTags = (searchParams.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const equipmentScoped = equipmentSet ? library.filter((e) => e.equipment && allowedEquipment.includes(e.equipment)) : library;
  const poolSource = selectedTags.length
    ? filterByFacets(equipmentScoped, { tags: selectedTags })
    : equipmentScoped;

  // Deterministic seed → the same URL always yields the same workout, so a
  // printed QR reproduces it exactly when scanned. Shuffle bumps `v`.
  const rng = seededRng(hashString(`${tenant.slug}|${focusVal}|${count}|${intensity}|${variant}|${selectedTags.join(',')}`));

  // Classify on the REAL name (so timing is right), display the gym's alias.
  const byId = new Map(library.map((e) => [e.id, e]));
  const pool: Exercise[] = poolSource.map((e) => ({
    id: e.id,
    name: e.real_name,
    muscle_group: e.muscle_group,
    default_cue: null,
    equipment: e.equipment,
    image_url: e.image_url,
    created_at: '',
    tags: e.tags,
  }));

  const profile: Profile = { equipment: allowedEquipment, focus: focusVal, intensity };
  const generated = generateWorkout(profile, { focus: focusVal, count, pool, rng });

  // A rehab session should read early → late. Sorting the pool doesn't survive
  // the generator's per-muscle selection, so order the finished session instead.
  const stageOf = (e: Exercise) =>
    (e.tags ?? []).includes('stage-1') ? 0 : (e.tags ?? []).includes('stage-2') ? 1 : 2;
  const focusChoiceFull = FOCUS_CHOICES.find((f) => f.value === focusVal);

  // Refresh a single move: swap that slot for another from the pool, chosen
  // deterministically so the URL (and any QR of it) still reproduces exactly.
  const swapped = generated.map((ex, i) => {
    const bumps = swaps.get(i);
    if (!bumps) return ex;
    const used = new Set(generated.map((g) => g.id));
    const alts = pool.filter((c) => !used.has(c.id));
    if (alts.length === 0) return ex;
    const pick = seededRng(hashString(`${tenant.slug}|swap|${i}|${bumps}|${variant}`));
    return alts[Math.floor(pick() * alts.length)] ?? ex;
  });

  const workout = focusChoiceFull?.byStage ? [...swapped].sort((a, b) => stageOf(a) - stageOf(b)) : swapped;
  const wp = workoutParams(profile);

  // SyncroFit shows the gym's names; circuit id is tenant-scoped so feedback maps back.
  const displayExercises = workout.map((ex) => ({ ...ex, name: byId.get(ex.id)?.name ?? ex.name }));
  const sfUrl = workout.length
    ? syncrofitRunUrl(`${name} — ${focusLabel}`, displayExercises, wp, '', `${tenant.slug}-build`)
    : '#';

  // Snapshot (with prescriptions) for a stable, shareable /s/<token> link.
  const shareExercises = workout.map((ex) => {
    const timed = isTimed(ex);
    return {
      name: byId.get(ex.id)?.name ?? ex.name,
      equipment: ex.equipment,
      image_url: ex.image_url,
      notes: timed
        ? `${wp.sets} × ${wp.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
        : `${wp.sets} × ${wp.reps} @ ${wp.tempo}`,
    };
  });

  const tagParam = selectedTags.length ? `&tags=${selectedTags.join(',')}` : '';
  const qs = (f: string, l: number, v = variant) => `?focus=${f}&mins=${minutes}&intensity=${intensity}&v=${v}${tagParam}${v === variant ? swParam : ''}`;
  // Toggle one tag, keeping focus/length; reset the shuffle so the new pool is used.
  const tagHref = (id: string) => {
    const next = selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id];
    const q = next.length ? `&tags=${next.join(',')}` : '';
    return `/g/${tenant.slug}/build?focus=${focusVal}&mins=${minutes}&intensity=${intensity}&v=1${q}`;
  };
  const swParam = swaps.size ? `&sw=${Array.from(swaps).map(([i, k]) => `${i}:${k}`).join(',')}` : '';
  const rerollHref = (i: number) => {
    const next = new Map(swaps);
    next.set(i, (next.get(i) ?? 0) + 1);
    const sw = Array.from(next).map(([idx, k]) => `${idx}:${k}`).join(',');
    return `/g/${tenant.slug}/build?focus=${focusVal}&mins=${minutes}&intensity=${intensity}&v=${variant}${tagParam}&sw=${sw}`;
  };
  const usedTagIds = new Set(library.flatMap((e) => e.tags ?? []));

  // Absolute URL of THIS exact workout → encode it in a QR to scan/print.
  const h = headers();
  const host = h.get('host') ?? 'vitality-tracker-mauve.vercel.app';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const shareUrl = `${proto}://${host}/g/${tenant.slug}/build${qs(focusVal, count)}`;
  const qrSvg = await QRCode.toString(shareUrl, {
    type: 'svg',
    margin: 1,
    color: { dark: '#0b0b0c', light: '#ffffff' },
  });

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <div className="print:hidden">
        <TenantNav slug={tenant.slug} name={name} logoUrl={tenant.branding.logoUrl} />
      </div>
      <main className="shell px-5 pb-16 pt-6">
        <h1 className="mb-1 text-h2 text-text-primary">Build a workout</h1>
        <p className="mb-1 text-body text-text-muted">From {name}’s library, ready for SyncroFit.</p>
        {isMyGym && (
          <p className="mb-5 text-caption text-text-faint print:hidden">
            {equipmentSet ? (
              <>
                Using your gear: {gymEquipment.map((e) => EQUIPMENT_LABEL[e]).join(', ')} ·{' '}
                <Link href="/dashboard/equipment" className="text-accent">
                  Change
                </Link>
              </>
            ) : (
              <>
                Using <span className="text-text-muted">all equipment</span> —{' '}
                <Link href="/dashboard/equipment" className="text-accent">
                  tell us what you actually have
                </Link>{' '}
                and workouts will only use that.
              </>
            )}
          </p>
        )}
        {!isMyGym && <p className="mb-5" />}

        {/* How do you want to build it? */}
        <div className="mb-5 grid grid-cols-2 gap-2 print:hidden">
          <Link
            href={`/g/${tenant.slug}/build${qs(focusVal, count)}`}
            className={`rounded-lg border p-3 text-center ${!custom ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
          >
            <span className="block text-body font-semibold text-text-primary">✨ For me</span>
            <span className="block text-caption text-text-muted">We choose</span>
          </Link>
          <Link
            href={`/g/${tenant.slug}/build?mode=custom`}
            className={`rounded-lg border p-3 text-center ${custom ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
          >
            <span className="block text-body font-semibold text-text-primary">✚ My own</span>
            <span className="block text-caption text-text-muted">Search &amp; add</span>
          </Link>
        </div>

        {custom ? (
          <CustomWorkoutBuilder
            library={equipmentScoped}
            workoutName={`${name} — Custom`}
            params={wp}
            circuitId={`${tenant.slug}-custom`}
          />
        ) : (
        <>
        <TenantBuilderControls
          slug={tenant.slug}
          focus={focusVal}
          intensity={intensity}
          minutes={minutes}
          tags={selectedTags}
          equipmentNote={
            isMyGym ? (
              <p className="text-caption text-text-faint">
                {equipmentSet
                  ? `Using your gear: ${gymEquipment.map((e) => EQUIPMENT_LABEL[e]).join(', ')}`
                  : 'Using all equipment — set your gear in the dashboard.'}
              </p>
            ) : null
          }
        />

        <div className="mb-1 flex items-center justify-between print:hidden">
          <span className="text-caption text-text-faint nums">{workout.length} moves</span>
          <Link
            href={qs(focusVal, count, variant + 1)}
            className="flex h-9 items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-3 text-caption font-semibold text-accent active:scale-[0.97]"
          >
            🔀 Refresh all
          </Link>
        </div>
        <p className="mb-4 text-caption text-text-faint print:hidden">
          Don’t like a move? Tap ↻ next to it to swap just that one.
        </p>

        {/* Narrow the pool the generator draws from — same facets as Pick my own */}
        <div className="mb-6 print:hidden">
          {([
            { id: 'goal' as TagCategory, label: 'GOAL' },
            { id: 'stage' as TagCategory, label: 'STAGE' },
            { id: 'pattern' as TagCategory, label: 'MOVEMENT' },
          ])
            .map((cat) => ({ ...cat, items: tagsInCategory(cat.id).filter((t) => usedTagIds.has(t.id)) }))
            .filter((cat) => cat.items.length > 0)
            .map((cat) => (
              <div key={cat.id} className="mb-2">
                <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">{cat.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((t) => {
                    const on = selectedTags.includes(t.id);
                    return (
                      <Link
                        key={t.id}
                        href={tagHref(t.id)}
                        title={t.description}
                        className={`rounded-full border px-2.5 py-1 text-caption ${
                          on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
                        }`}
                      >
                        {t.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          {selectedTags.length > 0 && (
            <p className="mt-1 text-caption text-text-faint nums">
              Drawing from {poolSource.length} matching move{poolSource.length === 1 ? '' : 's'} ·{' '}
              <Link href={`/g/${tenant.slug}/build?focus=${focusVal}&len=${count}&v=1`} className="text-accent">
                Clear
              </Link>
            </p>
          )}
        </div>

        {/* Print-only header */}
        <div className="mb-4 hidden print:block">
          <p className="text-label text-text-muted">{focusLabel.toUpperCase()} · {count} MOVES</p>
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
                    <span className="block text-caption text-text-muted">
                      {[ex.equipment && EQUIPMENT_LABEL[ex.equipment], presc].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {/* Swap just this move, keeping the rest of the workout */}
                  <Link
                    href={rerollHref(i)}
                    aria-label={`Swap ${display?.name ?? ex.name} for another move`}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-caption text-text-muted active:scale-95 active:text-accent print:hidden"
                  >
                    ↻ <span className="hidden sm:inline">Swap</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {workout.length > 0 && <SyncroFitButton url={sfUrl} />}

        {workout.length > 0 && (
          <ShareWorkoutButton name={`${name} — ${focusLabel}`} exercises={shareExercises} params={wp} />
        )}

        {workout.length > 0 && (
          <SaveCircuitBox
            exercises={shareExercises}
            params={wp}
            defaultName={selectedTags.length ? `${focusLabel} — ${selectedTags.length} filter${selectedTags.length === 1 ? '' : 's'}` : `${name} — ${focusLabel}`}
          />
        )}

        {/* QR — print it on the gym wall; scanning opens this exact workout */}
        {workout.length > 0 && (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-border bg-surface p-5 print:border-0 print:bg-transparent">
            <div
              className="h-40 w-40 rounded-lg bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-3 text-center text-caption text-text-muted">
              Scan to open this workout & run it in SyncroFit
            </p>
            <div className="mt-4 flex gap-2 print:hidden">
              <PrintButton className="h-10 rounded-md border border-border px-4 text-caption font-semibold text-text-primary active:bg-surface-raised" />
            </div>
          </div>
        )}
        </>
        )}

        <p className="mt-8 text-center text-caption text-text-faint">Powered by Vitality</p>
      </main>
    </div>
  );
}
