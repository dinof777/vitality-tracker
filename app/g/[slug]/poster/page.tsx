import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { brandingToCssVars, fetchTenantBySlug, DEFAULT_BRANDING } from '@/lib/tenant';
import { currentTrainer } from '@/lib/current-tenant';
import { resolvePosterLayout } from '@/lib/poster';
import PrintButton from '@/components/PrintButton';
import { tenantMetadata } from '@/lib/tenant-metadata';

export const dynamic = 'force-dynamic';

// Print-only artifact — its own light "paper" surface per DESIGN.md §9, not the
// dark app theme. Ink is literal hex, never the text-primary/etc CSS vars (those
// resolve dark-theme values that would be invisible on white paper).
const INK = '#0b0b0c';
const INK_MUTED = '#52525b';
const INK_FAINT = '#8b8b93';

const STEPS = [
  { n: 1, label: 'Scan the code' },
  { n: 2, label: "Get today's workout — no login" },
  { n: 3, label: 'Follow along, free' },
];

function BrandMark({ logoUrl, accent, onAccent, initial, size }: {
  logoUrl?: string | null;
  accent: string;
  onAccent: string;
  initial: string;
  size: 'lg' | 'sm';
}) {
  if (size === 'lg') {
    return logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="mb-3 h-16 w-16 object-contain" />
    ) : (
      <span
        className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-h1 font-extrabold"
        style={{ background: accent, color: onAccent }}
      >
        {initial}
      </span>
    );
  }
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
  ) : (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-extrabold"
      style={{ background: accent, color: onAccent }}
    >
      {initial}
    </span>
  );
}

function QrFrame({ qrSvg, accent, name, size, className, borderWidth }: {
  qrSvg: string;
  accent: string;
  name: string;
  size: number;
  className: string;
  borderWidth: number;
}) {
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ borderColor: accent, borderStyle: 'solid', borderWidth }}
      role="img"
      aria-label={`QR code — scan to open ${name}'s training app`}
    >
      <div
        style={{ height: size, width: size }}
        className="[&>svg]:h-full [&>svg]:w-full"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </div>
  );
}

interface PaperProps {
  name: string;
  accent: string;
  onAccent: string;
  logoUrl?: string | null;
  initial: string;
  qrSvg: string;
  host: string;
  slug: string;
}

function PosterPaper({ name, accent, onAccent, logoUrl, initial, qrSvg, host, slug }: PaperProps) {
  return (
    <div
      className="relative flex w-full max-w-[680px] aspect-[8.5/11] flex-col items-center justify-between rounded-2xl border border-border bg-white p-10 text-center shadow-lift print:aspect-auto print:h-auto print:w-auto print:max-w-none print:rounded-none print:border-0 print:shadow-none print:fixed print:inset-0 print:m-0 print:p-[0.5in] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]"
    >
      <div className="flex flex-col items-center">
        <BrandMark logoUrl={logoUrl} accent={accent} onAccent={onAccent} initial={initial} size="lg" />
        <p className="text-h2 font-extrabold" style={{ color: INK }}>
          {name}
        </p>

        <h1 className="mt-2 text-[2.5rem] font-extrabold leading-[1.05] sm:text-[2.9rem]" style={{ color: INK }}>
          Scan to train at <span style={{ color: accent }}>{name}</span>.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg" style={{ color: INK_MUTED }}>
          Free workouts built around your equipment and your time. No login, no download — just scan.
        </p>

        <div className="my-8 flex flex-col items-center">
          <QrFrame qrSvg={qrSvg} accent={accent} name={name} size={260} className="rounded-2xl p-4" borderWidth={6} />
        </div>

        <div className="grid max-w-md grid-cols-3 gap-4 text-left">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="block text-caption font-bold" style={{ color: accent }}>
                0{s.n}
              </span>
              <span className="block text-sm" style={{ color: INK_MUTED }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold tracking-wide" style={{ color: INK_FAINT }}>
          {host}/g/{slug}
        </p>
        <p className="mt-1 text-xs" style={{ color: INK_FAINT }}>
          Powered by Live Elevated
        </p>
      </div>
    </div>
  );
}

function HandoutCard({ name, accent, onAccent, logoUrl, initial, qrSvg, host, slug, className }: PaperProps & { className?: string }) {
  return (
    <div
      className={`flex items-center justify-between gap-6 bg-white p-8 print:p-6 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact] ${className ?? ''}`}
    >
      <div className="flex-1 text-left">
        <div className="mb-2 flex items-center gap-2">
          <BrandMark logoUrl={logoUrl} accent={accent} onAccent={onAccent} initial={initial} size="sm" />
          <span className="text-sm font-bold" style={{ color: INK }}>
            {name}
          </span>
        </div>
        <h2 className="text-3xl font-extrabold leading-tight" style={{ color: INK }}>
          Scan to train at <span style={{ color: accent }}>{name}</span>.
        </h2>
        <p className="mt-2 max-w-xs text-sm" style={{ color: INK_MUTED }}>
          Free workouts, no login. Scan and go.
        </p>
        <p className="mt-4 text-xs font-semibold" style={{ color: INK_FAINT }}>
          {host}/g/{slug}
        </p>
      </div>
      <QrFrame qrSvg={qrSvg} accent={accent} name={name} size={140} className="rounded-xl p-2" borderWidth={4} />
    </div>
  );
}

function HandoutSheet(props: PaperProps) {
  return (
    <>
      {/* Print: two identical cards, 2-up, dashed cut line between */}
      <div className="hidden print:grid print:h-full print:w-full print:grid-rows-2">
        <HandoutCard {...props} className="border-b border-dashed border-[#d4d4d8] pb-6" />
        <HandoutCard {...props} className="pt-6" />
      </div>
      {/* Screen: one preview card */}
      <div className="print:hidden">
        <HandoutCard {...props} className="mx-auto max-w-[680px] rounded-2xl border border-border shadow-lift" />
      </div>
    </>
  );
}

// The gym's name in the tab, not the platform's — see lib/tenant-metadata.ts.
export function generateMetadata({ params }: { params: { slug: string } }) {
  return tenantMetadata(params.slug, 'poster');
}

export default async function GymPoster({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { layout?: string };
}) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();

  const name = tenant.branding.brandName ?? tenant.name;
  const accent = tenant.branding.accent ?? DEFAULT_BRANDING.accent;
  const onAccent = tenant.branding.onAccent ?? DEFAULT_BRANDING.onAccent;
  const initial = name.trim().charAt(0).toUpperCase();
  const me = await currentTrainer();
  const isMyGym = me?.tenant.id === tenant.id;
  const h = headers();
  const host = h.get('host') ?? 'vitality-tracker-mauve.vercel.app';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const url = `${proto}://${host}/g/${tenant.slug}`;
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b0b0c', light: '#ffffff' } });
  const layout = resolvePosterLayout(searchParams.layout);

  const paperProps: PaperProps = {
    name,
    accent,
    onAccent,
    logoUrl: tenant.branding.logoUrl,
    initial,
    qrSvg,
    host,
    slug: tenant.slug,
  };

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      {/* Toolbar */}
      <div className="shell flex items-center justify-between px-5 pt-6 print:hidden">
        <Link href={isMyGym ? '/dashboard' : `/g/${tenant.slug}`} className="text-caption text-text-muted">
          ← {isMyGym ? 'Dashboard' : name}
        </Link>
        <PrintButton className="h-12 rounded-md border border-border px-4 text-caption font-semibold text-text-primary active:bg-surface-raised" />
      </div>

      {/* Layout toggle */}
      <div className="shell mb-6 mt-4 grid grid-cols-2 gap-2 px-5 print:hidden">
        <Link
          href={`/g/${tenant.slug}/poster?layout=poster`}
          aria-label={layout === 'poster' ? 'Wall poster layout, currently selected' : 'Switch to wall poster layout'}
          className={`rounded-lg border p-3 text-center ${
            layout === 'poster' ? 'border-accent bg-accent/10' : 'border-border bg-surface'
          }`}
        >
          <span className="block text-body font-semibold text-text-primary">Wall poster</span>
          <span className="block text-caption text-text-muted">8.5×11 / A4</span>
        </Link>
        <Link
          href={`/g/${tenant.slug}/poster?layout=handout`}
          aria-label={layout === 'handout' ? 'Handout layout, currently selected' : 'Switch to handout layout'}
          className={`rounded-lg border p-3 text-center ${
            layout === 'handout' ? 'border-accent bg-accent/10' : 'border-border bg-surface'
          }`}
        >
          <span className="block text-body font-semibold text-text-primary">Handout</span>
          <span className="block text-caption text-text-muted">2-up, cut &amp; hand out</span>
        </Link>
      </div>

      {/* Scoped to this route only — no global CSS touched */}
      <style>{`@page { margin: 0.4in; }`}</style>

      <div className="flex justify-center px-5 pb-16 print:p-0">
        {layout === 'poster' ? <PosterPaper {...paperProps} /> : <HandoutSheet {...paperProps} />}
      </div>
    </div>
  );
}
