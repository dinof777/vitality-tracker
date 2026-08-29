# A branded gym page now carries the gym's name, not the platform's

**Date:** 2026-08-29 · **Branch:** `fix/branded-gym-page-titles` · **Board item:** STATUS.md,
Queued finding #6.

---

## 1. The live title, before

Verified from the public side first, before touching any code — one `curl` against the real
deployed site, not a local render:

```
$ curl -s https://www.liveelevated.fit/g/ironforge | grep -io '<title>.*</title>'
<title>Live Elevated</title>
```

Verbatim: **`<title>Live Elevated</title>`** — on `/g/ironforge`, a real, working, branded gym
page whose body says "Iron Forge" throughout. The finding on the board is real and is still live.

Everything else the page emits to identify itself was wrong in the same way:

```
<meta name="description" content="Mobile-first workout tracker for the Live Elevated training philosophy."/>
<meta property="og:title" content="Live Elevated"/>
<meta property="og:description" content="Mobile-first workout tracker for the Live Elevated training philosophy."/>
<meta property="og:site_name" content="Live Elevated"/>
<meta name="twitter:title" content="Live Elevated"/>
<meta name="twitter:description" content="Mobile-first workout tracker for the Live Elevated training philosophy."/>
```

So the leak is not only the browser tab: **the share card a gym posts to social carries the
platform's name, description and site name too.** All six were fixed in this pass.

**The non-branded pages, for comparison** — every one of them serves the identical string:

| Page | Title served |
|---|---|
| `/` | `Live Elevated` |
| `/exercises` | `Live Elevated` |
| `/pro` | `Live Elevated` |
| `/welcome` | `Live Elevated` |
| `/g/ironforge` | `Live Elevated` ← the defect |

That table is the whole diagnosis. On the platform's own pages that string is correct. It reaches
`/g/ironforge` for exactly one reason: **no route under `app/g/[slug]/` exported
`generateMetadata` at all**, so every branded page silently inherited `app/layout.tsx`'s platform
defaults. Nothing was overriding the gym — nothing was ever set.

## 2. What I searched for before writing anything

Reported as commands and results, per the search-before-you-build rule:

| Searched for | Command | Found |
|---|---|---|
| Any existing per-page metadata anywhere in the app | `grep -rn "generateMetadata" app lib` | **Nothing.** Zero matches in the entire repo — the root layout's static `metadata` export was the only metadata in the codebase. |
| Where the platform title is actually set | `grep -rn "export const metadata" app` | `app/layout.tsx` only — `title: "Live Elevated"`, plus matching `openGraph`, `twitter`, `applicationName`, `appleWebApp`. |
| An existing shared gym list to extend rather than duplicate | read `lib/tenant-directory.ts` | `SHOWCASE_TENANTS` (slug + display name), `RETIRED_TENANT_SLUGS`, `isRetiredTenant`, `liveShowcaseTenants`, `tenantSlugFromPath`. Created today; already read by `app/llms.txt/route.ts` and `middleware.ts`. |
| Where a gym's real name comes from at render time | read `lib/tenant.ts`, `app/g/[slug]/*/page.tsx` | `fetchTenantBySlug()` → `tenant.branding.brandName ?? tenant.name`. Every one of the four server routes already computed exactly this line, locally, for the page body — and then threw it away instead of putting it in the head. |
| Every branded surface that would need the fix | `find app/g -type f` | Five: `page.tsx`, `exercises/`, `build/`, `poster/`, `branding/`. |

**Conclusion: extend, don't add.** No second gym list was created. The name is derived in one new
shared module that reads the two sources that already existed.

## 3. The shared source of truth I reused

Two of them, layered, because they answer different halves of the question:

1. **`lib/tenant.ts` → `fetchTenantBySlug()`** — the tenants table is the real, live source of a
   gym's display name (`branding.brandName ?? name`). It is `unstable_cache`-wrapped and already
   called by each of these routes for the page body, so metadata adds no new DB round-trip on the
   cached path.
2. **`lib/tenant-directory.ts` → `showcaseTenantName(slug)` (new, 12 lines)** — the fallback when
   the DB is unreachable. This is the module created today so `/llms.txt` and `middleware.ts`
   could not drift; the metadata layer is now its **third consumer**, and it reads the same
   `SHOWCASE_TENANTS` array the manifest does. The alternative — a `{ ironforge: 'Iron Forge' }`
   map next to the metadata code — is precisely the second gym list that module exists to prevent.

The glue is one new server module, **`lib/tenant-metadata.ts`**, holding the title format, the
per-surface descriptions and the name resolution. All five routes call it in one line each, so
the format is defined once:

```ts
export function generateMetadata({ params }: { params: { slug: string } }) {
  return tenantMetadata(params.slug, 'exercises');
}
```

`lib/tenant-directory.ts` stays edge-safe (no DB, no `next/*`) — `tenant-metadata.ts` imports it,
never the reverse, so `middleware.ts` is untouched.

## 4. The title format I chose, and why

**Decided: the gym's name alone. No platform suffix.** Sub-pages get the section after an
em-dash.

| Surface | Title |
|---|---|
| `/g/ironforge` | `Iron Forge` |
| `/g/ironforge/exercises` | `Iron Forge — Exercise library` |
| `/g/ironforge/build` | `Iron Forge — Build a workout` |
| `/g/ironforge/poster` | `Iron Forge — QR poster` |
| `/g/ironforge/branding` | `Iron Forge — Branding` |

**Why not `Iron Forge · Live Elevated`:** because that is the same defect, smaller. The product's
promise is "your gym, your branding"; the tab is the single most public place that promise is
visible — every open window, every bookmark, every screenshot a gym takes of its own app. A
white-label vendor's name does not belong in a customer's tab, and a gym showing this app to its
own members should not be advertising the platform for free. The platform's name still appears
correctly on the platform's own pages, which is where it sells.

The em-dash separator is not a new invention: `/llms.txt` already writes these same gyms as
`Iron Forge — exercise library`, so the two surfaces read the same way.

## 5. The other identifiers on the page

Checked and fixed in the same pass, all from the gym's name:

| Tag | Before | After |
|---|---|---|
| `<title>` | `Live Elevated` | `Iron Forge` |
| `description` | "Mobile-first workout tracker for the Live Elevated training philosophy." | "Iron Forge's workout app — today's session, built from the gym's own exercise library." |
| `og:title` | `Live Elevated` | `Iron Forge` |
| `og:description` | platform copy | gym copy (as above) |
| `og:site_name` | `Live Elevated` | `Iron Forge` |
| `og:url` | `https://liveelevated.fit` | `/g/ironforge` |
| `twitter:title` / `twitter:description` | `Live Elevated` / platform copy | gym name / gym copy |
| `applicationName`, `appleWebApp.title` | `Live Elevated` | `Iron Forge` |

Per-surface descriptions, not one generic sentence repeated five times — the exercise library page
says what the exercise library is.

**One deliberate non-change:** an unknown slug returns `{}`, leaving the platform defaults intact.
The page is about to `notFound()` anyway, and inventing a gym name out of the URL string is how a
`/g/<anything>` bot flood would get itself a branded-looking 404.

## 6. Files changed

| File | Change |
|---|---|
| `lib/tenant-directory.ts` | **+13** — `showcaseTenantName(slug)`. Nothing existing altered. |
| `lib/tenant-metadata.ts` | **new** — title format, per-surface copy, name resolution, `tenantMetadata()`. |
| `app/g/[slug]/page.tsx` | +1 import, +4 `generateMetadata`. |
| `app/g/[slug]/exercises/page.tsx` | same. |
| `app/g/[slug]/build/page.tsx` | same. |
| `app/g/[slug]/poster/page.tsx` | same. |
| `app/g/[slug]/branding/layout.tsx` | **new** — `page.tsx` there is a Client Component and cannot export `generateMetadata`; a layout can. |
| `app/g/[slug]/metadata.test.ts` | **new** — 8 tests. |
| `vitest.config.ts` | `oxc: { jsx: { runtime: 'automatic' } }` — see Gotchas. |

No database writes. No change to `middleware.ts`, `app/layout.tsx`, or any non-branded page.

## 7. The test, and proof it bites

`app/g/[slug]/metadata.test.ts` — 8 tests. Each dynamic-imports the **real route module** and
calls its actual `generateMetadata` with `fetchTenantBySlug` mocked to return the Iron Forge
tenant row; it asserts the title **contains the gym's name** and **does not contain the
platform's**, across all five branded surfaces, plus the description/OG tags, plus the shared
directory lookup, plus the unknown-slug fallback.

**Proof it bites.** The pre-fix behaviour is exactly "every branded page inherits the platform
metadata", which is `tenantMetadata()` returning `{}`. Reintroducing that one line and re-running:

```
$ npx vitest run "app/g/[slug]/metadata.test.ts"
 × titles the gym home with the gym's name
 × titles the exercise library with the gym's name
 × titles the workout builder with the gym's name
 × titles the QR poster with the gym's name
 × titles the branding settings with the gym's name
 × keeps the platform's name out of the description and Open Graph title too
⎯⎯⎯ Failed Tests 6 ⎯⎯⎯
AssertionError: expected '' to contain 'Iron Forge'
AssertionError: expected '' to contain 'Iron Forge'
 Test Files  1 failed (1)
      Tests  6 failed | 2 passed (8)
```

**6 of the 8 fail** against the defect. The two that still pass are the directory-lookup guard and
the unknown-slug guard, which are true either way by construction. The line was then removed and
the suite is green again.

## 8. Gate counts, before and after

| Gate | Before | After |
|---|---|---|
| `npx tsc --noEmit` | exit **0** | exit **0** — still green, no new errors |
| `npm test` | **37 files, 441 tests**, all pass | **38 files, 449 tests**, all pass, 0 failed, 0 skipped |
| `npm run lint` | exit 0 | exit **0** — "No ESLint warnings or errors" |
| `npm run build` | exit 0, 43 pages | exit **0** (its `prebuild` runs the full suite first) |

## 9. What is NOT proven, and what has to happen next

**The live title is unchanged as of this writing, and this document does not claim otherwise.**
Production serves from `main`; this work is on `fix/branded-gym-page-titles`, pushed to origin and
nothing more. Per the brief, this branch was not merged and `main` was not touched.

Re-running the same command that opened this document will still return `<title>Live
Elevated</title>` until someone merges. The check to run **after** the merge deploys:

```
curl -s https://www.liveelevated.fit/g/ironforge | grep -io '<title>.*</title>'
```

Expected: `<title>Iron Forge</title>`.

Also not done, deliberately and per the brief's floor: no dev server was started, no process was
killed, no database was written, and the Clerk development-keys finding (Blocked #1) was not
touched.

**Owner of the merge:** Cal (infrastructure / merge-and-deploy). The wording call behind §4 is
Ivy's lane and is recorded here rather than asked, per the brief's instruction to decide it.
