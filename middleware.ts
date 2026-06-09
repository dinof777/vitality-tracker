import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Only the trainer admin area needs a login. The single-user app, the public
// white-label tenant pages (/g/<slug>) and public APIs stay open — clients
// never sign in.
const isProtected = createRouteMatcher(['/dashboard(.*)', '/onboarding(.*)', '/g/(.*)/branding']);

// Fail-safe: without a Clerk secret key, pass everything through rather than
// throwing (keeps production up if the key is ever missing).
export default process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(async (auth, req) => {
      if (isProtected(req)) await auth.protect();
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files unless in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
