import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isRetiredTenant, tenantSlugFromPath } from '@/lib/tenant-directory';

// Only the trainer admin area needs a login. The single-user app, the public
// white-label tenant pages (/g/<slug>) and public APIs stay open — clients
// never sign in.
const isProtected = createRouteMatcher(['/dashboard(.*)', '/onboarding(.*)', '/admin(.*)', '/g/(.*)/branding']);

// Retired public tenant slugs live in lib/tenant-directory (RETIRED_TENANT_SLUGS) so this
// guard and /llms.txt cannot disagree about which gyms exist. Serving the 410 at the EDGE
// means bot floods never reach the serverless renderer: `/g/[slug]` is `force-dynamic`
// (3 DB calls + a workout build + an Observability Event per hit), and `/g/vitality` alone
// was ~10 req/s of bot traffic and essentially the entire Vercel bill. Handled here, those
// requests cost an Edge Request (free tier) instead of a Fluid function invocation.
function edgeGuard(req: NextRequest): NextResponse | null {
  const slug = tenantSlugFromPath(req.nextUrl.pathname);
  if (slug && isRetiredTenant(slug)) {
    // Cacheable so even repeat bot hits are served from the edge cache.
    return new NextResponse('This demo is offline.', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400, s-maxage=86400' },
    });
  }
  return null;
}

// Fail-safe: without a Clerk secret key, pass everything through rather than
// throwing (keeps production up if the key is ever missing).
export default process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(async (auth, req) => {
      const blocked = edgeGuard(req);
      if (blocked) return blocked;
      if (isProtected(req)) await auth.protect();
    })
  : (req: NextRequest) => edgeGuard(req) ?? NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files unless in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
