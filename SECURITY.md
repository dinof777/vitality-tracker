# Live Elevated (vitality-tracker) — auth & data-access model

**Written:** 2026-10-08. Every claim below was resolved from the files named beside it, in this
repo, at commit `64cbed3`. Where something could not be verified from the code, it says so.

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
first caller that does will get a SQL error at runtime, not a quiet leak. Either add the columns
or drop the three names from the whitelist.

## 4. The real exposure: the public app has no per-user identity

This is the finding that matters, and it is **not** an RLS problem — RLS could not fix it, because
there is no identity to write a policy against.

`routines`, `workouts`, `log_entries` and `mobility_logs` (`supabase/schema.sql`) have **no
`user_id`, no `tenant_id`, and no device column**. The routes that read and write them —
`/api/log`, `/api/log/[entryId]`, `/api/workouts`, `/api/workouts/finish`, `/api/routines`,
`/api/routines/[routineId]`, `/api/routines/[routineId]/exercises`, `/api/overload/[exerciseId]`,
`/api/exercises/[exerciseId]/last`, `/api/mobility` — have **no authentication and no scoping of
any kind**.

Those tables were designed when this was a single-user tracker for one person. The app is now
public with no login (`STATUS.md` §1: *"anyone can open it, no account, no login"*), and
`components/workout/WorkoutSession.tsx` posts real sets to `/api/log`. So every visitor writes
into one shared pile. Concretely, on the live site:

| Route | Consequence |
|---|---|
| `GET /api/workouts` | Returns the 50 most recent sessions **globally**. A visitor's history list shows strangers' workouts. |
| `GET /api/overload/[exerciseId]` | Max weight per day across **all** visitors' sets. The progressive-overload sparkline — the app's headline feature — plots everyone's weights blended together. Wrong feature *and* a leak. |
| `GET /api/mobility?date=` / `POST /api/mobility` | `mobility_logs.logged_date` is `unique` **globally**. Two visitors on the same day overwrite each other's Daily 5; the streak is shared by everyone. |
| `DELETE /api/routines` | Unauthenticated, no body, deletes every `from_plan = true` routine — wipes the weekly plan for all users. One `curl` away. |
| `POST /api/log`, `DELETE /api/log/[entryId]`, `PATCH`/`DELETE /api/routines/[id]` | Unauthenticated write and delete of other people's logged training data. |

Workout and body data is personal health data. Under the standing PII floor it should not be
readable by an unrelated visitor, which it currently is.

**This needs a product decision before any code changes**, because the two ways out differ a lot
in scope:

- give the public app an **anonymous per-device identity** (a cookie/localStorage id, stamped onto
  these four tables and filtered in every query) — keeps the no-login promise; or
- require a **Clerk account** for logging — loses the no-login promise, gains real identity.

Either way the fix is "add an owner column and filter on it," not "enable RLS." Owner of the
decision: Elena (architecture). Owner of the implementation once decided: Nolan (TypeScript/Node
route handlers).

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
