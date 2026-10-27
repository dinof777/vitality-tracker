import { NextResponse } from 'next/server';

// Anonymous per-device identity for the consumer app. The public app has no
// account and no login (a deliberate product promise), but its four data
// tables — routines, workouts, log_entries, mobility_logs — still need an
// owner, or every visitor writes into one shared pile. See
// supabase/migrations/0014_device_identity.sql and SECURITY.md.
//
// The identity is a uuid in an httpOnly cookie, minted server-side the first
// time a browser writes anything. WHAT IT IS NOT: a credential. It separates
// one browser's data from another's; it does not withstand someone who obtains
// the cookie value, and it is not an authorization boundary. httpOnly keeps it
// out of reach of page JavaScript (so an XSS cannot read it), SameSite=Lax
// keeps it off cross-site requests, and nothing user-supplied is ever accepted
// as a device id — only this cookie.
//
// Clearing cookies starts a fresh identity, which is also the deletion path:
// the old rows become unreachable orphans like the pre-0014 pile.

export const DEVICE_COOKIE = 'vt_device';

// Two years. Long enough that a phone kept on the Home Screen does not
// silently lose its training history between gym visits.
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 730;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function newDeviceId(): string {
  return crypto.randomUUID();
}

// Read the device id off a request's Cookie header. Anything that is not a
// well-formed uuid is treated as absent rather than passed to SQL — the shape
// check is the only validation there can be on a value we minted ourselves.
export function readDeviceId(req: Request): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== DEVICE_COOKIE) continue;
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
    return isDeviceId(value) ? value : null;
  }
  return null;
}

// For a WRITE route: use the browser's existing identity, or mint one. The
// caller must pass the result's `minted` flag to attachDeviceCookie on its own
// response, or the new id is forgotten the moment the response is sent.
export function resolveDeviceId(req: Request): { deviceId: string; minted: boolean } {
  const existing = readDeviceId(req);
  if (existing) return { deviceId: existing, minted: false };
  return { deviceId: newDeviceId(), minted: true };
}

// Persist a freshly-minted id in the browser. Minting happens in the write
// route itself rather than in middleware on purpose: middleware runs on every
// path, including the cacheable 410 for retired gym slugs, and attaching a
// Set-Cookie to a `public, s-maxage` edge response is a cache-correctness bug
// waiting to happen.
export function attachDeviceCookie<T extends NextResponse>(res: T, deviceId: string): T {
  res.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
