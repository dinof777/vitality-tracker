import sharp from 'sharp';

// Derive a brand ACCENT color from a logo image. theme-color meta is usually the
// page background (white/black), so the logo's dominant *saturated* color is a far
// better brand accent. Returns a hex string or null when nothing colorful is found.

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');

// A pixel counts as "brand color" if it's saturated and not near-white/black.
const isBrandy = (hsl: Hsl) => hsl.s >= 0.3 && hsl.l >= 0.15 && hsl.l <= 0.85;

function fromSvg(svg: string): string | null {
  const hexes = svg.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
  let best: { hex: string; score: number } | null = null;
  for (const raw of hexes) {
    let h = raw.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const hsl = rgbToHsl(r, g, b);
    if (!isBrandy(hsl)) continue;
    const score = hsl.s; // most saturated wins
    if (!best || score > best.score) best = { hex: `#${h.toLowerCase()}`, score };
  }
  return best?.hex ?? null;
}

export async function accentFromLogo(
  logoUrl: string,
  isBlockedHost: (host: string) => boolean,
): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(logoUrl);
  } catch {
    return null;
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || isBlockedHost(url.hostname)) {
    return null;
  }

  let buf: Buffer;
  let contentType = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VitalityProBrandBot/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    contentType = res.headers.get('content-type') ?? '';
    const ab = await res.arrayBuffer();
    if (ab.byteLength > 3_000_000) return null; // 3MB cap
    buf = Buffer.from(ab);
  } catch {
    return null;
  }

  // SVG: parse colors straight from the markup (no decode needed).
  if (contentType.includes('svg') || /\.svg(\?|$)/i.test(url.pathname)) {
    return fromSvg(buf.toString('utf8'));
  }

  // Raster: downscale, then pick the dominant saturated hue bucket.
  try {
    const { data, info } = await sharp(buf)
      .resize(48, 48, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels; // 4 (RGBA)
    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += channels) {
      const a = channels === 4 ? data[i + 3] : 255;
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const hsl = rgbToHsl(r, g, b);
      if (!isBrandy(hsl)) continue;
      const key = Math.floor(hsl.h / 30); // 12 hue buckets
      const acc = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      acc.count += 1;
      acc.r += r;
      acc.g += g;
      acc.b += b;
      buckets.set(key, acc);
    }
    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const acc of Array.from(buckets.values())) {
      if (!best || acc.count > best.count) best = acc;
    }
    if (!best || best.count < 3) return null;
    return toHex(best.r / best.count, best.g / best.count, best.b / best.count);
  } catch {
    return null;
  }
}
