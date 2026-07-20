import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import type { Exercise, Equipment } from '@/lib/database.types';
import { getSql } from '@/lib/db';
import { currentTrainer } from '@/lib/current-tenant';
import { getWorkout, workoutShares } from '@/lib/tenant-workouts';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import PrintButton from '@/components/PrintButton';
import SyncroFitButton from '@/components/workout/SyncroFitButton';
import CopyField from '@/components/CopyField';
import CreateShareFromWorkout from '@/components/workout/CreateShareFromWorkout';

export const dynamic = 'force-dynamic';

// One saved circuit: run it, share it, print it as a PDF with a QR, or drop it on
// your website. Everything a trainer wants to do with a workout they built.
export default async function WorkoutDetail({ params }: { params: { id: string } }) {
  const t = await currentTrainer();
  if (!t) notFound();

  const workout = await getWorkout(params.id, t.tenant.id, t.userId, t.isOwner);
  if (!workout) notFound();

  const shares = await workoutShares(workout.id);
  const sql = getSql();
  const clientRows = sql
    ? await sql`select id, name from clients where tenant_id = ${t.tenant.id} and (${t.isOwner} or owner_user_id = ${t.userId}) order by name`
    : [];
  const clients = clientRows as Array<{ id: string; name: string }>;

  const { exercises, params: wp } = workout.payload;
  const gym = t.tenant.branding.brandName ?? t.tenant.name;

  const h = headers();
  const host = h.get('host') ?? 'vitality-tracker-mauve.vercel.app';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');

  // SyncroFit straight from the saved circuit — its id is the circuit id.
  const exForSf: Exercise[] = exercises.map((e) => ({
    id: '',
    name: e.name,
    muscle_group: null,
    default_cue: null,
    equipment: (e.equipment as Equipment) ?? null,
    image_url: e.image_url,
    created_at: '',
  }));
  const sfUrl = syncrofitRunUrl(workout.name, exForSf, wp, '', workout.id);

  // The newest share link is the circuit's public address — QR, PDF and embed
  // all point at it.
  const primary = shares[0];
  const shareUrl = primary ? `${proto}://${host}/s/${primary.token}` : null;
  const qrSvg = shareUrl
    ? await QRCode.toString(shareUrl, { type: 'svg', margin: 1, color: { dark: '#0b0b0c', light: '#ffffff' } })
    : null;

  const embed = shareUrl
    ? `<a href="${shareUrl}"
   style="display:inline-block;background:${t.tenant.branding.accent ?? '#a3e635'};color:#0b0b0c;
          font:600 16px/1 system-ui,sans-serif;padding:14px 24px;
          border-radius:8px;text-decoration:none;">
  ${workout.name}
</a>`
    : '';

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <Link href="/dashboard/workouts" className="text-caption text-text-muted print:hidden">
          ← Your circuits
        </Link>

        {/* Printed header */}
        <p className="mt-2 text-label text-accent">{gym.toUpperCase()}</p>
        <h1 className="mb-1 text-h1 text-text-primary">{workout.name}</h1>
        <p className="mb-6 text-body text-text-muted nums">
          {exercises.length} moves · {wp.sets} sets · {wp.restSec}s rest
        </p>

        {/* The circuit */}
        <ul className="mb-6 space-y-2">
          {exercises.map((e, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="w-5 shrink-0 text-center text-caption font-semibold text-text-faint nums">{i + 1}</span>
              <ExerciseThumb equipment={(e.equipment as Equipment) ?? null} imageUrl={e.image_url} name={e.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-text-primary">{e.name}</span>
                {e.notes && <span className="block text-caption text-text-muted nums">{e.notes}</span>}
              </span>
            </li>
          ))}
        </ul>

        {/* Run it */}
        <div className="mb-3"><SyncroFitButton url={sfUrl} /></div>

        <CreateShareFromWorkout
          workoutId={workout.id}
          name={workout.name}
          exercises={exercises}
          params={wp}
          clients={clients}
        />

        {/* Public address → QR, PDF, embed */}
        {shareUrl && qrSvg ? (
          <>
            <section className="mt-7">
              <p className="mb-1 text-label text-accent print:hidden">SHARE LINK</p>
              <div className="print:hidden">
                <CopyField value={shareUrl} />
              </div>
            </section>

            <section className="mt-6">
              <p className="mb-2 text-label text-accent print:hidden">PRINT / PDF</p>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5">
                <div className="h-40 w-40 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <p className="text-center text-caption text-text-muted">Scan to open {workout.name}</p>
                <PrintButton className="h-10 rounded-md border border-border px-4 text-caption font-semibold text-text-primary active:bg-surface-raised print:hidden" />
              </div>
              <p className="mt-2 text-center text-caption text-text-faint print:hidden">
                Print → “Save as PDF” gives you a handout with the QR code.
              </p>
            </section>

            <section className="mt-6 print:hidden">
              <p className="mb-1 text-label text-accent">ADD TO YOUR SITE</p>
              <p className="mb-2 text-caption text-text-muted">A button linking straight to this circuit.</p>
              <CopyField value={embed} multiline />
            </section>
          </>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-border p-4 text-center text-caption text-text-muted print:hidden">
            Create a share link to unlock the QR code, printable PDF, and website button.
          </p>
        )}

        {/* Every link minted from this circuit */}
        {shares.length > 0 && (
          <section className="mt-8 print:hidden">
            <p className="mb-2 text-label text-accent">SHARES ({shares.length})</p>
            <ul className="space-y-2">
              {shares.map((s) => (
                <li key={s.token} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-body text-text-primary">{s.client_name ?? 'No client'}</p>
                    <span className="shrink-0 text-caption text-text-muted nums">
                      {s.opens} open{Number(s.opens) === 1 ? '' : 's'}
                      {Number(s.completions) > 0 && ` · ✓ ${s.completions}`}
                    </span>
                  </div>
                  <Link href={`/s/${s.token}`} className="text-caption text-accent">
                    /s/{s.token} ›
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
