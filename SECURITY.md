# Live Elevated (vitality-tracker) — auth & data-access model

**Written:** 2026-10-08 at commit `64cbed3`. **§4 rewritten 2026-10-10** when the exposure it
described was fixed (migration `0014_device_identity.sql` + `lib/device.ts`). Every claim below
was resolved from the files named beside it, in this repo. Where something could not be verified
from the code, it says so.

Re-resolve the route table with:

```bash
cd /Users/dinoflora/dev/vitality-tracker && grep -rlE 'currentTrainer|currentTenant|isAdmin' app/api --include=route.ts | sort
```

---

## 1. There is no Supabase, and Postgres RLS is not the boundary

The project plan and several board cards describe this app as Supabase-backed and ask for Row
Level Security policies. **That is not what shipped.** The data layer is:

- **Neon serverless Postgres**, reached through `@neondatabase/serverless` (`lib/db.ts`).
- The only credential is **`DATABASE_URL`**, a server-only env var. It is not `NEXT_PUBLIC_`,
  and `lib/db.ts` is imported exclusively by route handlers and server modules — no database
  credential reaches the browser.
- There is **no Supabase client, no anon key, and no PostgREST**. Nothing speaks to Postgres
  except this app's own server code.

That matters for how you reason about RLS. Supabase's RLS is load-bearing because Supabase
*publishes the database* — the browser holds an anon key and talks to PostgREST directly, so the
only thing standing between a hostile client and a row is a policy. **Here there is no
direct-to-database path from an untrusted client at all.** The app connects as a single
privileged role from trusted server code.

So RLS is not "missing" in the Supabase sense — it is not the control in play. Adding it would
require connecting as a non-superuser role and setting a per-request identity
(`set local app.user_id = …`) inside every transaction. That is a real architectural change, not
a dashboard checkbox, and it is worth doing only *after* the app has a per-user identity to key
policies on. **It does not have one** — see §4, which is the actual exposure.

**Authorization in this app is enforced in application code, not in the database.**

## 2. Who signs in

**Clerk** (`middleware.ts`), and only for the trainer side:

| Surface | Protected? | By what |
|---|---|---|
| `/dashboard*`, `/onboarding*`, `/admin*`, `/g/*/branding` | Yes | `clerkMiddleware` + `auth.protect()` |
| The public training app (`/`, `/workout`, `/daily5`, `/routines`, `/settings`, …) | No — by design | — |
| Public white-label gym pages (`/g/<slug>`) | No — by design | — |
| `/api/*` | **Not by middleware** | Each route guards itself, or doesn't — see §3 |

Two things to know about this middleware:

- It **fails open**. With no `CLERK_SECRET_KEY` set, the export falls back to a plain pass-through
  so production stays up. Every protected route is then unprotected. Deliberate, and commented as
  such — but it means "the middleware protects `/admin`" is only true while that env var is set.
- `STATUS.md` item 1 records that production is running on Clerk **development** keys
  (`pk_test`, `clerk.accounts.dev`). That is a separate open blocker owned by Dino; it is not
  re-litigated here.

Platform-admin rights are an **email allowlist**, not a Clerk role: `ADMIN_EMAILS`, defaulting to
the owner (`lib/is-admin.ts`). The comparison is a pure, unit-tested function (`isAdminEmail`).

## 3. How tenant (gym) isolation is enforced — and it is

Multi-tenant data lives in tables carrying a `tenant_id` referencing `tenants(id)`:
`clients`, `tenant_workouts`, `share_links`, `client_profiles`, `client_metrics`, `tenant_terms`,
`tenant_equipment`, `exercise_aliases`, and `exercises` (nullable there — `null` + `is_global`
means the shared library).

Three mechanisms, all in application code:

1. **`lib/current-tenant.ts`** resolves the signed-in trainer to a tenant via their Clerk org
   (`tenants.clerk_org_id`). `currentTrainer()` additionally returns `isOwner` from the Clerk org
   role, so a gym admin sees every trainer's data and a plain trainer sees only their own.
2. **Per-row ownership checks.** `authorizeClient()` (`lib/client-portal-db.ts`) is the pattern:
   it refuses unless the row matches *both* the caller's `tenant_id` *and*
   (`isOwner` or `owner_user_id = caller`). Every `/api/tenant/clients/*` route calls it before
   touching a row, and returns `404` rather than `403` on a miss, so it does not confirm the id
   exists. This is a correct IDOR guard.
3. **`lib/scoped-db.ts`** — query builders that force `where tenant_id = $1` into every statement,
   with table and column names whitelisted so only known identifiers are interpolated and values
   always go through `$n` placeholders.

**Verified:** all 11 `/api/tenant/*` routes guard on `currentTenant()`/`currentTrainer()`, all 3
`/api/admin/*` routes guard on `isAdmin()`, `/api/tenants/[slug]` guards on both, `/api/share`
guards on `currentTrainer()`, and `/api/syncrofit/events` guards on a bearer token compared
against `SYNCROFIT_WEBHOOK_SECRET`. **No unauthenticated route reads or writes a `tenant_id`
table.** There is no cross-gym leak.

**One latent inconsistency.** `scoped-db.ts`'s `TENANT_TABLES` whitelist includes `routines`,
`workouts` and `log_entries`, but those three tables have **no `tenant_id` column** (see
`supabase/schema.sql`). Its header comment describes this as planned Phase 1 work that did not
land. Nothing currently calls the builders for those tables, so this is not a live bug — but the
first caller that does will get a SQL error at runtime, not a quiet leak. As of 0014 those three
are owned by `device_id` (§4), not by a gym, which makes the whitelist entry more clearly wrong
rather than merely premature: drop the three names, or decide a routine belongs to a gym and add
`tenant_id` deliberately. Queued in `STATUS.md`, not fixed here.

## 4. The public app's identity: anonymous per-device, closed 2026-10-10

### 4a. What was wrong (the original finding, kept for the record)

This was the finding that mattered, and it was **not** an RLS problem — RLS could not have fixed
it, because there was no identity to write a policy against.

`routines`, `workouts`, `log_entries` and `mobility_logs` (`supabase/schema.sql`) had **no
`user_id`, no `tenant_id`, and no device column**. The routes that read and write them —
`/api/log`, `/api/log/[entryId]`, `/api/workouts`, `/api/workouts/finish`, `/api/routines`,
`/api/routines/[routineId]`, `/api/routines/[routineId]/exercises`, `/api/overload/[exerciseId]`,
`/api/exercises/[exerciseId]/last`, `/api/mobility` — had **no authentication and no scoping of
any kind**.

Those tables were designed when this was a single-user tracker for one person. The app is now
public with no login (`STATUS.md` §1: *"anyone can open it, no account, no login"*), and
`components/workout/WorkoutSession.tsx` posts real sets to `/api/log`. So every visitor wrote
into one shared pile. Concretely, on the live site, until 0014:

| Route | Consequence |
|---|---|
| `GET /api/workouts` | Returns the 50 most recent sessions **globally**. A visitor's history list shows strangers' workouts. |
| `GET /api/overload/[exerciseId]` | Max weight per day across **all** visitors' sets. The progressive-overload sparkline — the app's headline feature — plots everyone's weights blended together. Wrong feature *and* a leak. |
| `GET /api/mobility?date=` / `POST /api/mobility` | `mobility_logs.logged_date` is `unique` **globally**. Two visitors on the same day overwrite each other's Daily 5; the streak is shared by everyone. |
| `DELETE /api/routines` | Unauthenticated, no body, deletes every `from_plan = true` routine — wipes the weekly plan for all users. One `curl` away. |
| `POST /api/log`, `DELETE /api/log/[entryId]`, `PATCH`/`DELETE /api/routines/[id]` | Unauthenticated write and delete of other people's logged training data. |

Workout and body data is personal health data. Under the standing PII floor it should not have
been readable by an unrelated visitor, which it was.

### 4b. The decision

Two ways out, differing a lot in scope: an **anonymous per-device identity**, or requiring a
**Clerk account** to log a workout. Asked on MC card `99e9dadb` and answered by Dino on
2026-10-08: **anonymous per-device identity** — the no-account, no-login promise the public app is
built on is kept. Either way the fix is "add an owner column and filter on it," never "enable
RLS."

### 4c. What shipped

**`device_id text` on all four tables** (`supabase/migrations/0014_device_identity.sql`), carrying
a uuid minted server-side and held in an **httpOnly `vt_device` cookie**. `lib/device.ts` is the
only place that reads or mints it:

- `readDeviceId(req)` parses the cookie and returns `null` for anything that is not a well-formed
  uuid, so a crafted cookie value never reaches SQL. Unit-tested in `lib/device.test.ts`,
  including the `' or 1=1 --` case.
- `resolveDeviceId(req)` is for writes: reuse the existing identity, or mint one. The route then
  calls `attachDeviceCookie()` on its own response to persist it. **Minting lives in the write
  routes, not in `middleware.ts`** — middleware runs on every path including the cacheable `410`
  for retired gym slugs, and attaching a `Set-Cookie` to a `public, s-maxage` edge response is a
  cache-correctness bug waiting to happen.
- No request ever supplies its own device id. Body and query string are not consulted.

Every one of the ten routes in the table above now filters on it, and **fails closed**: no cookie
means no rows, not all rows. Reads with no cookie return an empty result (`{workouts: []}`,
`{history: []}`, `{log: null}`, `{routine: null}`) — a browser that has never written anything
genuinely owns nothing. Single-row writes return `404` on a miss, never `403`, so they don't
confirm the id exists (same convention as `authorizeClient()`, §3). `routine_exercises` has no
`device_id` of its own: `PUT /api/routines/[routineId]/exercises` checks the parent routine's
owner before the `delete`, because otherwise that `delete` would empty any routine by id.

`mobility_logs` also needed its **`unique (logged_date)` dropped** and replaced with a partial
unique index on `(device_id, logged_date)`. That table-wide unique was the Daily 5 bug itself —
one row per calendar day for the whole internet.

### 4d. What this is not, and what it cost

- **`device_id` is an identity, not a credential.** It separates one browser's data from
  another's. It does not withstand someone who obtains the cookie value, and it is not an
  authorization boundary. `httpOnly` keeps it away from page JavaScript (an XSS cannot read it),
  `SameSite=Lax` keeps it off cross-site requests, `Secure` in production.
- **Pre-0014 rows keep `device_id = NULL` and are now unreachable.** They are the old shared pile:
  Dino's own training blended with strangers', with no column, timestamp or join that can separate
  them. Every scoped query (`device_id = $1`) matches none of them. Rejected the alternative —
  backfilling them all to one id — because that hands strangers' logged sets to whichever browser
  got that id. **Nothing is deleted**; the rows are still in the table, so a later card could
  adopt a date range into a device if Dino wants his own history back. The visible effect is that
  existing history disappears from the app's UI.
- **Cookies blocked entirely** (e.g. a locked-down private window): each write mints an id that is
  never stored, so the second set of a session fails its ownership check and
  `WorkoutSession.handleLogSet` falls back to its existing `'local'` on-device mode. Degraded, not
  broken — and the right outcome, since a browser that refuses to hold an identity cannot be given
  separated storage.
- **Clearing cookies starts a fresh identity**, which is also the deletion path the PII floor asks
  for: the old rows become unreachable orphans.
- **Not verified here:** nothing in this change was run against the live Neon database or the
  deployed site. The migration needs `npm run migrate` after merge, and it must land **before or
  with** the code — the scoped queries reference a column the production schema does not yet have.

## 5. Other standing items (recorded elsewhere, not re-opened here)

- **`/api/brand-scrape` SSRF, partial guard.** `isBlockedHost()` blocks `localhost`, `.local`,
  `.internal`, and private/link-local/loopback v4 and v6 literals — but it checks the *hostname
  string only*, and the fetch uses `redirect: 'follow'`. An attacker-controlled host that resolves
  to a private address, or that 302s to one, is not stopped. The code's own comment marks
  DNS-resolution pinning as a TODO. Already on the board as `STATUS.md` item 4, owner **Nolan**.
  Note the route is also **unauthenticated**, so it does not in fact "require a trainer account to
  reach" as item 4 states.
- **Clerk production keys** — `STATUS.md` item 1, owner **Dino** (a Vercel settings change).

## 6. Rules for anyone adding a route

1. **Touching a `tenant_id` table?** Resolve the caller with `currentTenant()` or
   `currentTrainer()` first, and filter on the resolved `tenant_id` — ideally via
   `lib/scoped-db.ts`. Never take a `tenantId` from the request body or query string.
2. **Touching a single row by id?** Check ownership the way `authorizeClient()` does, and return
   `404` on a miss, not `403`.
3. **Never `NEXT_PUBLIC_` a database credential.** `DATABASE_URL` is server-only;
   `lib/db.ts` must stay out of client components.
4. **Values go in `$n` placeholders.** Identifiers get whitelisted, never interpolated from input.
5. **A new route under `/api` is unauthenticated unless it guards itself.** `middleware.ts` does
   not protect `/api/*`.
6. **Touching `routines`, `workouts`, `log_entries` or `mobility_logs`?** Get the owner from
   `readDeviceId(req)` (reads) or `resolveDeviceId(req)` (writes) in `lib/device.ts`, and filter
   on it. Reads with no device id return **empty**, never everything. Writes return `404` on a
   miss. Never accept a device id from a body, query string or header — only the cookie.
