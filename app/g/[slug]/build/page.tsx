import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import type { Exercise } from '@/lib/database.types';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';
import { tenantLibrary } from '@/lib/tenant-library';
import { generateWorkout } from '@/lib/workout-generator';
import { workoutParams, FOCUS_CHOICES, type Profile } from '@/lib/profile';
import { EQUIPMENT_ORDER, EQUIPMENT_LABEL } from '@/lib/exercises';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import { hashString, seededRng } from '@/lib/seed';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import PrintButton from '@/components/PrintButton';
import ShareWorkoutButton from '@/components/workout/ShareWorkoutButton';
import CustomWorkoutBuilder from '@/components/workout/CustomWorkoutBuilder';
import SaveCircuitBox from '@/components/workout/SaveCircuitBox';
import { filterByFacets, tagsInCategory, type TagCategory } from '@/lib/tags';

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
  searchParams: { focus?: string; len?: string; v?: string; mode?: string; tags?: string };
}) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();
  const library = await tenantLibrary(tenant.id);
  const name = tenant.branding.brandName ?? tenant.name;

  const focusVal = FOCI.includes(searchParams.focus as (typeof FOCI)[number]) ? (searchParams.focus as string) : 'full';
  const count = LENGTHS.includes(Number(searchParams.len) as (typeof LENGTHS)[number]) ? Number(searchParams.len) : 6;
  const variant = Math.max(1, Math.min(999, Number(searchParams.v) || 1));
  const focusLabel = FOCUS_CHOICES.find((f) => f.value === focusVal)?.label ?? 'Full Body';
  const custom = searchParams.mode === 'custom';

  // Tag facets narrow the pool the generator draws from — so "Stage 3 + Knee PT"
  // generates a stage-3 knee session rather than a general workout.
  const selectedTags = (searchParams.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const poolSource = selectedTags.length ? filterByFacets(library, { tags: selectedTags }) : library;

  // Deterministic seed → the same URL always yields the same workout, so a
  // printed QR reproduces it exactly when scanned. Shuffle bumps `v`.
  const rng = seededRng(hashString(`${tenant.slug}|${focusVal}|${count}|${variant}|${selectedTags.join(',')}`));

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
  }));

  const profile: Profile = { equipment: EQUIPMENT_ORDER, focus: focusVal, intensity: 'moderate' };
  const workout = generateWorkout(profile, { focus: focusVal, count, pool, rng });
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
  const qs = (f: string, l: number, v = variant) => `?focus=${f}&len=${l}&v=${v}${tagParam}`;
  // Toggle one tag, keeping focus/length; reset the shuffle so the new pool is used.
  const tagHref = (id: string) => {
    const next = selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id];
    const q = next.length ? `&tags=${next.join(',')}` : '';
    return `/g/${tenant.slug}/build?focus=${focusVal}&len=${count}&v=1${q}`;
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
      <main className="mx-auto max-w-md px-5 pb-16 pt-10">
        <Link href={`/g/${tenant.slug}`} className="text-caption text-text-muted print:hidden">
          ← {name}
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Build a workout</h1>
        <p className="mb-5 text-body text-text-muted">From {name}’s library, ready for SyncroFit.</p>

        {/* How do you want to build it? */}
        <div className="mb-6 grid grid-cols-2 gap-2 print:hidden">
          <Link
            href={`/g/${tenant.slug}/build${qs(focusVal, count)}`}
            className={`rounded-lg border p-3 text-center ${!custom ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
          >
            <span className="block text-body font-semibold text-text-primary">✨ Build it for me</span>
            <span className="block text-caption text-text-muted">Pick a focus, we choose</span>
          </Link>
          <Link
            href={`/g/${tenant.slug}/build?mode=custom`}
            className={`rounded-lg border p-3 text-center ${custom ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
          >
            <span className="block text-body font-semibold text-text-primary">✚ Pick my own</span>
            <span className="block text-caption text-text-muted">Search &amp; add moves</span>
          </Link>
        </div>

        {custom ? (
          <CustomWorkoutBuilder
            library={library}
            workoutName={`${name} — Custom`}
            params={wp}
            circuitId={`${tenant.slug}-custom`}
          />
        ) : (
        <>
        {/* Focus */}
        <div className="mb-2 flex flex-wrap gap-2 print:hidden">
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
        {/* Length + shuffle */}
        <div className="mb-6 flex items-center gap-2 print:hidden">
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
          <Link
            href={qs(focusVal, count, variant + 1)}
            className="ml-auto rounded-full border border-border px-3 py-1.5 text-caption font-semibold text-text-muted"
          >
            🔀 Shuffle
          </Link>
        </div>

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
                </li>
              );
            })}
          </ul>
        )}

        {workout.length > 0 && (
          <a
            href={sfUrl}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press print:hidden"
          >
            ⏱ SEND TO SYNCROFIT
          </a>
        )}

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
