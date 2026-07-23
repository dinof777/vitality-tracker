// Single source of truth for the app's public, canonical site URL. Used by
// Next metadata (metadataBase, OpenGraph/canonical), the PWA manifest
// (start_url/id), sitemap.xml, robots.txt, and /llms.txt — so a domain
// change is a one-line edit instead of a grep-and-replace.
//
// The app is live on the vercel.app URL today; liveelevated.fit is the
// canonical target for once DNS points at it. Override via
// NEXT_PUBLIC_SITE_URL if a deploy needs a different origin (e.g. preview).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liveelevated.fit';
