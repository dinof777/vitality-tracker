// One place that decides what may be stored in exercises.image_url, so the
// trainer-facing write path (/api/tenant/exercises) and the admin write path
// (/api/admin/exercises) cannot drift — the same reason resolveFields() exists
// for the vocabulary fields.
//
// Two shapes are allowed, and only these two:
//
//   https://…         an absolute HTTPS URL on someone else's host
//   /exercises/x.jpg  a site-relative path served from this app's /public
//
// Everything else is refused, for two reasons that both matter downstream:
//
//   1. SyncroFit. lib/syncrofit.ts → absImageUrl() silently DROPS anything it
//      cannot turn into an https URL, so an http:// value would be accepted
//      here, render fine in Vitality, and then vanish on the hand-off — the
//      exact "images never reach SyncroFit" failure this validation exists to
//      close. Refusing it at write time makes the failure visible to the
//      person who can fix it, at the moment they can fix it.
//   2. Render safety. The stored value goes straight into an <img src> in
//      ExerciseThumb/ExerciseDetailSheet. Pinning the scheme keeps `data:`,
//      `javascript:` and protocol-relative `//host` out of the column
//      entirely rather than relying on each render site to re-sanitise.

/** Generous but finite — a signed storage URL with query params still fits. */
export const IMAGE_URL_MAX = 500;

export const IMAGE_URL_HELP =
  'Use an https:// link to a jpg, png or gif — or a path like /exercises/squat.jpg for art in this app.';

export type ImageUrlResult = { url: string | null } | { error: string };

/**
 * Normalise a submitted image URL. Blank (or missing) clears the field, which
 * is how a trainer removes a bad image — never an error.
 */
export function resolveImageUrl(raw: string | null | undefined): ImageUrlResult {
  const value = (raw ?? '').trim();
  if (!value) return { url: null };

  if (value.length > IMAGE_URL_MAX) {
    return { error: `That image link is too long (max ${IMAGE_URL_MAX} characters).` };
  }

  // Site-relative. `//host/x` is protocol-relative, not a path — exclude it.
  if (value.startsWith('/')) {
    if (value.startsWith('//')) return { error: IMAGE_URL_HELP };
    return { url: value };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { error: IMAGE_URL_HELP };
  }
  // http:// is refused rather than upgraded: guessing that a host also serves
  // https would store a link we never verified, and SyncroFit would drop it.
  if (parsed.protocol !== 'https:' || !parsed.hostname) return { error: IMAGE_URL_HELP };

  return { url: parsed.toString() };
}
