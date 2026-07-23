import Link from 'next/link';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { currentTrainer } from '@/lib/current-tenant';
import { DEFAULT_BRANDING } from '@/lib/tenant';
import CopyField from '@/components/CopyField';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

// "How do I put this on my website?" — the answer, as copy-paste snippets.
export default async function Embed() {
  const t = await currentTrainer();

  if (!t) {
    return (
      <main className="shell min-h-dvh px-5 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-2 mt-2 text-h1 text-text-primary">Add to your website</h1>
        <p className="text-body text-text-muted">Create your gym first, then come back here.</p>
      </main>
    );
  }

  const gym = t.tenant;
  const brandName = gym.branding.brandName ?? gym.name;
  const accent = gym.branding.accent ?? DEFAULT_BRANDING.accent;

  const h = headers();
  const host = h.get('host') ?? 'vitality-tracker-mauve.vercel.app';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const url = `${proto}://${host}/g/${gym.slug}`;

  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b0b0c', light: '#ffffff' } });

  const buttonSnippet = `<a href="${url}"
   style="display:inline-block;background:${accent};color:#0b0b0c;
          font:600 16px/1 system-ui,sans-serif;padding:14px 24px;
          border-radius:8px;text-decoration:none;">
  Start Today's Workout
</a>`;

  const iframeSnippet = `<iframe src="${url}"
        title="${brandName} workouts"
        style="width:100%;max-width:480px;height:720px;border:0;border-radius:12px;"
        loading="lazy"></iframe>`;

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted print:hidden">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Add to your website</h1>
        <p className="mb-6 text-body text-text-muted">
          Three ways to put {brandName} in front of your clients. Pick whichever fits your site.
        </p>

        {/* 1. The plain link */}
        <section className="mb-6">
          <p className="mb-1 text-label text-accent">1 · YOUR APP&rsquo;S ADDRESS</p>
          <p className="mb-2 text-caption text-text-muted">
            Share this anywhere — text, email, Instagram bio, a link on your site.
          </p>
          <CopyField value={url} />
        </section>

        {/* 2. A button for their site */}
        <section className="mb-6">
          <p className="mb-1 text-label text-accent">2 · A BUTTON FOR YOUR SITE</p>
          <p className="mb-2 text-caption text-text-muted">
            Paste this into your site&rsquo;s HTML (Squarespace/Wix/WordPress all have an &ldquo;embed&rdquo; or
            &ldquo;custom HTML&rdquo; block). It uses your brand color.
          </p>
          <CopyField value={buttonSnippet} multiline />
        </section>

        {/* 3. Full embed */}
        <section className="mb-6">
          <p className="mb-1 text-label text-accent">3 · EMBED THE WHOLE APP</p>
          <p className="mb-2 text-caption text-text-muted">
            Drops the app straight into a page on your site.
          </p>
          <CopyField value={iframeSnippet} multiline />
        </section>

        {/* QR for the physical world */}
        <section className="mb-6">
          <p className="mb-1 text-label text-accent">4 · QR CODE</p>
          <p className="mb-3 text-caption text-text-muted">
            Print it for the gym wall, your front desk, or a flyer — scanning opens your app.
          </p>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5">
            <div className="h-44 w-44 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="text-caption font-semibold text-text-primary">{brandName}</p>
            <PrintButton className="h-10 rounded-md border border-border px-4 text-caption font-semibold text-text-primary active:bg-surface-raised print:hidden" />
          </div>
          <p className="mt-2 text-caption text-text-muted">
            Need something bigger for the wall?{' '}
            <Link href={`/g/${gym.slug}/poster`} className="text-accent">
              Get the poster
            </Link>
          </p>
        </section>

        <p className="text-caption text-text-faint print:hidden">
          Want it on your own domain instead of /g/{gym.slug}? That&rsquo;s coming with Pro.
        </p>
      </main>
    </div>
  );
}
