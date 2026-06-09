import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import type { Exercise, Equipment } from '@/lib/database.types';
import { brandingToCssVars, fetchTenantById, DEFAULT_BRANDING, type Branding } from '@/lib/tenant';
import { fetchShareByToken, bumpShareOpens } from '@/lib/share';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import ExerciseThumb from '@/components/workout/ExerciseThumb';

export const dynamic = 'force-dynamic';

// Public, no-login workout share. Opened from a link or QR a trainer sent. Themed
// to the gym, runnable, and one tap to SyncroFit (circuit.id = token → feedback
// correlates to this exact share).
export default async function SharedWorkout({ params }: { params: { token: string } }) {
  const share = await fetchShareByToken(params.token);
  if (!share) notFound();
  await bumpShareOpens(params.token);

  const tenant = await fetchTenantById(share.tenant_id);
  const branding: Branding = tenant?.branding ?? DEFAULT_BRANDING;
  const gym = branding.brandName ?? tenant?.name ?? 'Your gym';
  const { name, exercises, params: wp } = share.payload;

  // Reconstruct Exercise-likes for the SyncroFit deep link (it classifies by name).
  const exForSf: Exercise[] = exercises.map((e) => ({
    id: '',
    name: e.name,
    muscle_group: null,
    default_cue: null,
    equipment: (e.equipment as Equipment) ?? null,
    image_url: e.image_url,
    created_at: '',
  }));
  const sfUrl = syncrofitRunUrl(name, exForSf, wp, '', params.token);

  const h = headers();
  const host = h.get('host') ?? 'vitality-tracker-mauve.vercel.app';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const shareUrl = `${proto}://${host}/s/${params.token}`;
  const qrSvg = await QRCode.toString(shareUrl, { type: 'svg', margin: 1, color: { dark: '#0b0b0c', light: '#ffffff' } });

  return (
    <div style={brandingToCssVars(branding)} className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-16 pt-10">
        <p className="text-label text-accent">{gym.toUpperCase()}</p>
        <h1 className="mb-1 mt-1 text-h1 text-text-primary">{name}</h1>
        <p className="mb-6 text-body text-text-muted">
          {exercises.length} moves · {wp.sets} sets · {wp.restSec}s rest
        </p>

        <ul className="space-y-2">
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

        <a
          href={sfUrl}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press print:hidden"
        >
          ⏱ SEND TO SYNCROFIT
        </a>

        {/* QR for printing / scanning on the gym wall */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="h-36 w-36 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-caption text-text-faint">Scan to open this workout</p>
        </div>

        <p className="mt-8 text-center text-caption text-text-faint print:hidden">Powered by Vitality</p>
      </main>
    </div>
  );
}
