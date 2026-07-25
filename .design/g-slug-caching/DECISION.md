# `/g/[slug]` caching architecture — decision

**Author:** Elena (Solutions Architect) · **Date:** 2026-07-25
**Status:** Approved recommendation — build-ready. Not yet implemented.
**Scope:** `app/g/[slug]/{page,exercises/page,build/page,poster/page}.tsx`, `lib/tenant.ts`,
`lib/tenant-library.ts`, `lib/tenant-equipment.ts`, `middleware.ts`.

I read all four `app/g/[slug]/*` route files, `lib/tenant.ts`, `lib/tenant-library.ts`,
`lib/tenant-equipment.ts`, `lib/db.ts`, `lib/current-tenant.ts`, `lib/workout-generator.ts`,
`lib/seed.ts`, and `middleware.ts` before deciding. Next.js is 14.2.35 (App Router).

---

## The one decision

**Ship ISR (`revalidate`) on the two routes where it's safe, and stop the Server Component from
reading `searchParams` at all — push `v`/`sw` interactivity into a client component that reuses the
existing pure generator code. Do NOT restructure `/build` or `/poster`; give those the narrower,
lower-risk fix of wrapping their DB reads in `unstable_cache`.**

This is not a menu — here's why every other option on the requisition's list loses:

- **`unstable_cache` around the 3 DB reads, alone, on the current `force-dynamic` page** — rejected
  as the *primary* fix. It makes each invocation cheaper (skips the Neon round-trip on a cache hit)
  but does **not** reduce invocation count or Observability Event count, because `force-dynamic`
  still forces Next to execute the whole Server Component function on every request. The incident
  was driven by *invocations* (3.49M) and *events* (9.13M), not primarily DB compute — this fix
  treats the symptom, not the bill driver. (It's still useful, just not as the headline fix — see
  below, it's exactly right for `/build` and `/poster`.)
- **`Cache-Control`/`s-maxage` headers hand-set on a dynamic response** — redundant with `revalidate`
  once the route is static/ISR-eligible, and does nothing on its own while `force-dynamic` +
  `searchParams` remain in play; Next won't let a route serve a cached response while a Dynamic API
  is read in it.
- **Splitting static shell from dynamic workout via a nested dynamic segment / streaming** — over-
  engineered for this page; achieves the same outcome as "move `v`/`sw` to the client" but with more
  moving parts (Suspense boundaries, an extra server round-trip for the dynamic slice) for no benefit,
  since the workout-generation code is already pure and can run in the browser for free.
- **Moving the variant/swap seed to the client** — this is not a separate option, it's the mechanism
  the winning design uses. Folded in below.

## Why this works — the key mechanical fact

In App Router, a page's cache key is fragmented by query string **only if the Server Component
reads `searchParams`**. If it doesn't, Next/Vercel serves the same cached ISR entry regardless of
what's appended to the URL. Today's `page.tsx` reads `searchParams.v` / `searchParams.sw`, which is
*why* it can never be static — and it's also why a bot appending `?v=1`, `?v=2`, … `?v=999` looks
like 999 distinct expensive requests instead of one cheap cached one.

Remove the `searchParams` read from the Server Component, and:
1. The route becomes ISR-eligible (`revalidate = N`), so the base render happens once per tenant per
   revalidation window, cached at the edge — not once per request.
2. A crawler hitting `/g/<realgym>?v=<anything>&<junk>=<anything>` gets the **same cached response**
   as `/g/<realgym>` — the `?v=` 1–999 cache-buster surface stops being a cost multiplier entirely,
   by construction, not by rate-limiting.
3. `generateWorkout`, `seededRng`, `hashString` (`lib/workout-generator.ts`, `lib/seed.ts`) have zero
   server-only imports — no DB, no `next/headers`, no Clerk. They can run unmodified in a client
   component. So "Refresh all" / "Swap" can recompute the workout **instantly in the browser** from
   the pool already delivered in the initial HTML, with zero additional server cost per click —
   n	ot "cheaper," literally free.

---

## Scope: which of the 4 routes get which treatment

| Route | Reads `searchParams`? | Reads cookies (`currentTrainer`)? | Treatment |
|---|---|---|---|
| `app/g/[slug]/page.tsx` | Yes (`v`, `sw`) | No | **Full ISR + client-side interactivity** (this decision's main work) |
| `app/g/[slug]/exercises/page.tsx` | No | No | **Full ISR** — trivial, no other changes needed |
| `app/g/[slug]/build/page.tsx` | Yes, extensively (`focus`,`len`,`mins`,`intensity`,`v`,`mode`,`tags`,`sw`,`style`,`amrapMin`,`emomMin`) | Yes | **Stay `force-dynamic`.** Only `unstable_cache` on its DB reads. |
| `app/g/[slug]/poster/page.tsx` | Yes (`layout`, cosmetic only) | Yes | **Stay `force-dynamic`.** Only `unstable_cache` on its DB reads. |

**Why `/build` and `/poster` don't get the ISR treatment — decisively, not "maybe later":**
`/build` is not incidental dynamism, it's the *point* of the page. Its own comment says "Deterministic
seed → the same URL always yields the same workout, so a printed QR reproduces it exactly when
scanned" and it server-renders so gym-aliased exercise names appear in the raw HTML (SEO + no-JS
correctness for a scanned QR). Stripping `searchParams` there would break the actual product
requirement (durable, shareable, printable permalinks), not just an implementation detail. `/poster`
similarly depends on `currentTrainer()` (a per-visitor cookie read) for the back-link, which is
incompatible with static caching without a further split not justified by its traffic profile.

Both routes are also not the routes that caused the incident — the bot flood was 100% `/g/vitality`
(the base tenant page). Applying the cheaper, lower-risk `unstable_cache` treatment to `/build` and
`/poster` gets most of the remaining cost benefit (skips the Neon round-trip on repeat hits) without
touching correctness-critical query-string handling. If bot traffic later targets `/build` or
`/poster` specifically, the proven circuit breaker is the existing `middleware.ts` `RETIRED_TENANTS`
pattern (generalize it to a rate limiter) — not a render-strategy rewrite. That's a future,
data-triggered decision, not this one.

---

## Build-ready spec

### 1. `app/g/[slug]/page.tsx` — Iris's lane (route-segment / render strategy)

- Remove `export const dynamic = 'force-dynamic'`.
- Add `export const revalidate = 3600;` (1 hour — see staleness discussion below).
- Remove the `searchParams` prop entirely from the function signature. The Server Component now
  computes only the **canonical default** workout: `variant = 1`, `swaps = new Map()`, seed =
  `` `${tenant.slug}|${today}` `` (drop `variant` from the seed since it's now always `1` for the
  server render — keep the format compatible with what the client component will reproduce for
  `v=1`).
- Everything else in the current function body (fetch tenant/library/equipment, build `pool`,
  `generateWorkout`, `byId`, `presc`) stays — it's the SSR fallback / first-paint content.
- New: extract the "TODAY'S SUGGESTION" block (the `workout.length > 0 && (...)` JSX, the
  Refresh/Swap links, `SyncroFitButton`, `SaveCircuitBox`) into a client component,
  **`components/workout/TodaySuggestion.tsx`**, passed:
  - `slug: string`
  - `today: string` (ISO date, computed server-side so client and server agree on "today")
  - `pool: Exercise[]` (the already tenant/equipment-filtered pool — this is the payload that lets
    swap/refresh run client-side with zero network call)
  - `libraryById: Record<string, { name: string }>` (or ship `library` and build the map
    client-side) — needed for alias display names
  - `initialWorkout: Exercise[]` (the server-computed default, for first paint / no-JS / SEO)
  - `wp` (workout params, for the `presc` string — this is pure/derivable client-side too via
    `workoutParams(profile)`, ship `profile` instead of precomputed `wp` if simpler)
  - branding-derived `name`, `tenantOrgLine` etc. needed for `SyncroFitButton`'s `syncrofitRunUrl`
    call — keep that call server-side for the *default* case and recompute client-side on swap
    (it's pure, same treatment as `generateWorkout`).

- **`components/workout/TodaySuggestion.tsx`** ('use client'):
  - On mount, read `useSearchParams()` for `v`/`sw`. If present and not the defaults, recompute
    `workout` immediately with the exact same logic as today's server code (`hashString`,
    `seededRng`, `generateWorkout`, the swap-apply loop) — this is a straight port, not a
    rewrite, so output is byte-identical to what the old server path produced for the same inputs.
  - Local React state holds `variant` and the `swaps` map. Clicking "Refresh all" / "Swap" updates
    state and recomputes the workout in-memory — no `fetch`, no navigation.
  - **Sync the URL without triggering a server round-trip:** use
    `window.history.replaceState(null, '', newUrl)` directly — **not** `next/navigation`'s
    `router.push`/`replace`. In App Router, any navigation via the Next router re-runs the Server
    Component for the route; the whole point of this design is that clicking Refresh/Swap must
    never do that. `history.replaceState` updates the address bar (so the link stays copyable/
    bookmarkable) without invoking Next's router at all.
  - This satisfies both correctness (a bookmarked `?v=57` link still resolves — client-side, on
    load) and cost (clicking never re-hits the server).

- Payload note for Iris: audit what fields `pool` actually needs client-side (`id`, `name`,
  `muscle_group`, `equipment`, `image_url`, `tags` — drop `default_cue` if `ExerciseRow` doesn't use
  it) before shipping the props payload, so a large gym's library doesn't bloat the HTML/RSC payload
  unnecessarily. Not a blocker, just don't ship dead fields.

### 2. `app/g/[slug]/exercises/page.tsx` — Iris's lane

- Remove `export const dynamic = 'force-dynamic'`, add `export const revalidate = 3600;`. No other
  changes — this page never reads `searchParams`, so this is a one-line-diff win. **Ship this one
  first** — it's the lowest-risk validation that the ISR mechanism behaves as expected in this repo
  before touching the interactive home page.

### 3. `app/g/[slug]/build/page.tsx`, `app/g/[slug]/poster/page.tsx` — Priya's lane (DB-layer only, no render change)

Leave `dynamic = 'force-dynamic'` in place on both. No `searchParams` changes.

### 4. `lib/tenant.ts`, `lib/tenant-library.ts`, `lib/tenant-equipment.ts`, `lib/taxonomy-db.ts` — Priya's lane

Wrap the four DB-reading functions the `/g/[slug]/*` routes call — `fetchTenantBySlug`,
`tenantLibrary`, `tenantEquipmentSlugs`, and `fetchRegionHierarchy` (used by `/build`) — in
`unstable_cache`, e.g.:

```ts
import { unstable_cache } from 'next/cache';

export const fetchTenantBySlug = unstable_cache(
  async (slug: string): Promise<Tenant | null> => { /* existing body */ },
  ['tenant-by-slug'],
  { revalidate: 3600, tags: ['tenants'] }, // refine to a per-tenant tag once id is known — see below
);
```

For `tenantLibrary(tenantId)` / `tenantEquipmentSlugs(tenantId)`, tag each cache entry
`` `tenant:${tenantId}` `` so a targeted `revalidateTag` (below) doesn't require an hour-long wait.

**Important, note this explicitly in the PR so it doesn't look like a contradiction:** `lib/db.ts`
already forces the underlying Neon HTTP driver to `cache: 'no-store'` on its own `fetch` calls, with
a comment explaining that's deliberate (Next's default fetch caching would otherwise freeze query
results). That's unrelated and stays as-is — `unstable_cache` caches the **return value of the
wrapped function**, independent of whatever cache mode the fetch inside it uses. No conflict.

**On-demand invalidation (the freshness half of this design).** Time-based `revalidate: 3600` alone
means a gym's branding/library/equipment edit can take up to an hour to show on their public page —
find every write path and revalidate immediately after a successful mutation:

- `app/api/tenants/[slug]/route.ts` (branding)
- `app/api/tenant/aliases/route.ts` (exercise aliases → affects display names in `tenantLibrary`)
- `app/api/tenant/equipment/route.ts`, `app/api/admin/equipment/route.ts`
- `app/api/tenant/exercises/route.ts`, `app/api/admin/exercises/route.ts`
- `app/api/tenant/taxonomy/route.ts`, `app/api/admin/taxonomy/route.ts` (feeds `fetchRegionHierarchy`, used by `/build`)

After each successful write, call:

```ts
revalidatePath(`/g/${slug}`);
revalidatePath(`/g/${slug}/exercises`);
revalidateTag(`tenant:${tenantId}`);
```

This makes the common case (gym edits their own stuff) near-instant, while the 1-hour `revalidate`
is the safety net for any drift path that doesn't go through these routes.

### 5. Staleness — the explicit answer to "how stale is acceptable"

- **Branding/library/equipment edits by the gym:** near-zero, via the on-demand hooks above. This is
  the case that matters (a gym owner changing their own page and expecting to see it).
- **The "today" date-seeded suggestion rolling over at midnight:** up to ~1 hour of skew is
  acceptable and expected — ISR's lazy revalidation means the first request after `revalidate`
  seconds triggers a background regen and still serves the stale copy once. A workout suggestion
  showing "yesterday's seed" for up to an hour after midnight is a non-issue for this product; call
  it an accepted trade-off, not a bug.

---

## Bot resilience — direct answer to the requisition's Q2

**No, an uncached crawler hitting `/g/<realgym>?v=<anything>` does not cost compute per hit after
this ships**, for the reason in "Why this works" above: once the Server Component stops reading
`searchParams`, Next/Vercel's cache key for that route is the pathname only. A bot varying `v` from
1 to 999 (or appending arbitrary junk params) gets the identical cached HTML — one function
invocation per tenant per revalidation window, not per query-string variant. This is a structural
fix, not a rate limit — it holds regardless of request rate.

**Residual, distinct risk (flagged, not fixed here):** a bot enumerating *nonexistent* slugs
(`/g/asdf1`, `/g/asdf2`, …) still costs one invocation per *unique* fake slug on first hit (each is a
cache miss until Next caches that 404), because `dynamicParams` defaults to true and `notFound()` is
still reached through `fetchTenantBySlug`. This is a different bot pattern than the one in the
incident (which hammered one real, known slug with varying `?v=`) and is materially cheaper per-bot
(no `?v=` amplification) — watch it in the post-ship metrics; if it shows up, the fix is extending
the existing `middleware.ts` `RETIRED_TENANTS` pattern into a generic rate limiter, not more render
rework. Not in scope now.

---

## Sequencing

1. **Already shipped, keep permanently:** `middleware.ts` edge 410 for `RETIRED_TENANTS`. It's a
   cheap, proven circuit breaker — leave it in place even after the ISR fix ships; it's the fastest
   lever if a new tenant slug gets discovered by bots before this design's protections apply to it
   (e.g., during the deploy window, or for a slug someone deliberately wants to kill fast).
2. **Ship first, lowest risk:** `app/g/[slug]/exercises/page.tsx` — one-line diff (`revalidate`
   instead of `force-dynamic`), no behavior change, validates the ISR mechanism in this app before
   the riskier change.
3. **Ship second:** `app/g/[slug]/page.tsx` + new `TodaySuggestion` client component — the real fix
   for the incident's route. Needs the verification plan below run before calling it done, since it
   changes how the interactive controls work (URL-driven links → client state).
4. **Ship opportunistically, any order, low risk:** `unstable_cache` wrapping in
   `lib/tenant.ts`/`lib/tenant-library.ts`/`lib/tenant-equipment.ts`/`lib/taxonomy-db.ts`, plus the
   on-demand `revalidatePath`/`revalidateTag` hooks in the admin API routes. No render-strategy
   change, so it's safe to land independently of steps 2–3.
5. **Not now, data-triggered only:** generalizing the middleware bot-guard into a rate limiter for
   `/build`/`/poster`/unknown-slug enumeration. Revisit only if post-ship Observability data shows a
   new cost driver in one of those routes.

**iOS app:** confirmed out of scope. Every file touched by this design is under `app/g/[slug]/`,
`lib/tenant*.ts`, `lib/taxonomy-db.ts`, and `app/api/{tenant,admin,tenants}/**` — pure web-app
server/render code. Nothing here touches the companion iOS app or its App Store submission; safe to
ship on an independent timeline.

---

## Verification plan (proves the fix, doesn't just assume it)

Run in this order; each phase's checks should pass before moving to the next.

**Phase 2 (`/exercises`):**
- `curl -sI https://liveelevated.fit/g/<real-slug>/exercises` twice back-to-back — second response
  should show `x-vercel-cache: HIT` (or an `age` header > 0) instead of always `MISS`/`DYNAMIC`.
- Visual/manual check: page content unchanged for a known tenant.

**Phase 3 (`/g/[slug]` home):**
- Same `x-vercel-cache: HIT` check on `curl -sI https://liveelevated.fit/g/<real-slug>` repeated, AND
  on `https://liveelevated.fit/g/<real-slug>?v=999&sw=0:3&junk=1` — **the second URL must return the
  same cached response as the first**, proving the cache key ignores the query string.
- Browser check: open the page, open DevTools Network tab, click "Refresh all" and "Swap" several
  times — confirm the exercise list updates instantly with **no document/RSC request** in the
  Network tab (only the address bar `v=`/`sw=` changing).
- Reload the page with a `?v=57&sw=0:2` URL typed into the address bar directly — confirm it renders
  the correct (client-recomputed) workout, not the server's cached default. This is the regression
  check for "shared/bookmarked interactive link still works."
- Unit-test-level regression (Sami's lane if this needs a formal test): assert that for a fixed
  `(slug, today, variant, swaps)` input, the client-side recompute path and the pre-fix server logic
  produce identical exercise IDs — since it's a straight port of the same pure functions, this should
  be a trivial pass, but worth locking in as a regression guard.
- **The real proof:** Vercel Observability — confirm Function Invocations and Observability Events
  for `/g/[slug]` drop by a large margin (target: >90%) over the following 24–48h, while page views/
  unique visitors (if visible) hold flat or grow. Cost should drop without traffic dropping.

**Freshness check:**
- Edit a test tenant's equipment or branding via the dashboard; confirm `/g/<slug>` reflects the
  change within seconds (proves the `revalidatePath`/`revalidateTag` hooks fired), not up to an hour
  later.

**Phase 4 (`unstable_cache` on `/build`/`/poster` DB reads):**
- Compare rendered HTML for a fixed `/g/<slug>/build?focus=...&v=...` URL before and after — must be
  byte-identical (proves the cache wrapping didn't change output, only whether the DB round-trip
  happens).
- Confirm the QR-coded permalink on `/poster` still resolves to the same page after the change.

---

## Ownership split

| Work | Owner |
|---|---|
| `app/g/[slug]/page.tsx` render-strategy change (drop `force-dynamic`/`searchParams`, add `revalidate`) | **Iris** |
| New `components/workout/TodaySuggestion.tsx` client component (v/sw state, `history.replaceState`, pure-function reuse) | **Iris** |
| `app/g/[slug]/exercises/page.tsx` one-line ISR change | **Iris** |
| `unstable_cache` wrapping in `lib/tenant.ts`, `lib/tenant-library.ts`, `lib/tenant-equipment.ts`, `lib/taxonomy-db.ts` | **Priya** |
| `revalidatePath`/`revalidateTag` hooks in `app/api/tenants/[slug]`, `app/api/tenant/{aliases,equipment,exercises,taxonomy}`, `app/api/admin/{equipment,exercises,taxonomy}` | **Priya** |
| Regression test locking client-side vs. legacy server-side workout generation parity | **Sami** |
| Post-ship Observability verification | Whoever ships — report back to Dino with before/after numbers |
