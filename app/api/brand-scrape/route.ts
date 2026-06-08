import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Brand autopilot: given a trainer's own website URL, best-effort extract their
// brand name, logo, and accent color so onboarding can pre-fill branding (the
// trainer always reviews + edits). NOT authoritative — JS-rendered or bot-blocked
// sites may return little.

function normalizeUrl(input: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

// SSRF guard: refuse localhost / private / link-local / metadata hosts. (For
// production-grade protection also resolve DNS and pin the IP — noted as TODO.)
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/[[\]]/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = +v4[1];
    const b = +v4[2];
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return true;
    }
  }
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag?.match(/content=["']([^"']+)["']/i)?.[1] ?? null;
}

function linkHref(html: string, relTest: RegExp): string | null {
  for (const tag of html.match(/<link[^>]+>/gi) ?? []) {
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1] ?? '';
    if (relTest.test(rel)) {
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      if (href) return href;
    }
  }
  return null;
}

function normalizeHex(c: string): string | null {
  const v = c.trim().replace(/^#/, '');
  return /^[0-9a-f]{3}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(v) ? `#${v.toLowerCase()}` : null;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  const target = normalizeUrl(raw);
  if (!target) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: 'That host is not allowed.' }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': 'VitalityProBrandBot/1.0 (+brand autofill)', Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ error: `Site returned ${res.status}` }, { status: 502 });
    html = (await res.text()).slice(0, 500_000);
  } catch {
    return NextResponse.json({ error: "Couldn't reach that site." }, { status: 502 });
  }

  const abs = (href: string | null) => {
    if (!href) return null;
    try {
      return new URL(href, target).toString();
    } catch {
      return null;
    }
  };

  const rawName =
    metaContent(html, 'og:site_name') ||
    metaContent(html, 'application-name') ||
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
    target.hostname.replace(/^www\./, '');
  const brandName = rawName.replace(/\s+/g, ' ').trim().split(/\s[-|–—·:]\s/)[0].slice(0, 60);

  // Prefer square icons (cleaner logos) over the wide social og:image.
  const logoUrl =
    abs(linkHref(html, /apple-touch-icon/i)) ||
    abs(linkHref(html, /(^|\s)icon(\s|$)|shortcut/i)) ||
    abs(metaContent(html, 'og:image')) ||
    abs('/favicon.ico');

  const accent = metaContent(html, 'theme-color') ? normalizeHex(metaContent(html, 'theme-color')!) : null;

  return NextResponse.json({
    source: target.toString(),
    branding: {
      brandName,
      logoUrl,
      accent, // null when the site has no theme-color — trainer picks
    },
    note: 'Best-effort draft — review before saving.',
  });
}
