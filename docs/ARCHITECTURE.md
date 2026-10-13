# Architecture — vitality-tracker (Live Elevated)

**Snapshot of:** branch `docs/architecture-map` based on `origin/main` @ `c471a0e` (2026-10-13)
**Re-resolve:** `cd /Users/dinoflora/dev/vitality-tracker && git fetch && git rev-parse --short origin/main`; versions: `cd /Users/dinoflora/dev/vitality-tracker && cat package.json`; route-handler count (resolved 34): `cd /Users/dinoflora/dev/vitality-tracker && git ls-files app | grep -c 'route.ts$'`; page count (resolved 36): `cd /Users/dinoflora/dev/vitality-tracker && git ls-files app | grep -c 'page.tsx$'`; test files (resolved 38): `cd /Users/dinoflora/dev/vitality-tracker && git ls-files '*.test.*' | wc -l`; migrations (resolved 13 SQL files): `cd /Users/dinoflora/dev/vitality-tracker && ls supabase/migrations`; env var names (resolved 9): `cd /Users/dinoflora/dev/vitality-tracker && grep -rhno 'process\.env\.[A-Z_]*' app lib components middleware.ts scripts next.config.mjs | sort -u`. No install, build or test was run to produce this page.
**Expires:** 2027-01-13, or after any Next.js/Clerk upgrade or new migration. Past that, re-run the commands above before trusting a count or version.
**Owner:** Wren (docs); keep in step with `SITE.md`, which is the route/data-model map.
**Prefix rule:** a claim you could not verify live is written `unverified: …`, not asserted.
**Not repeated here:** [`FLEET.md`](/Users/dinoflora/dev/mission-control/FLEET.md) (which repo does what), [`INVENTORY.md`](/Users/dinoflora/dev/mission-control/INVENTORY.md) (where does X happen), [`SITE.md`](/Users/dinoflora/dev/vitality-tracker/SITE.md) (every route, the data model, lifecycle and taxonomy rules), [`DESIGN.md`](/Users/dinoflora/dev/vitality-tracker/DESIGN.md) (visual system), [`STATUS.md`](/Users/dinoflora/dev/vitality-tracker/STATUS.md) (blockers, in flight), [`supabase/migrations/README.md`](/Users/dinoflora/dev/vitality-tracker/supabase/migrations/README.md) (migration process). `README.md` is the unedited create-next-app boilerplate; ignore it.

---

## 1. What it is

Live Elevated is a mobile-first workout PWA in two products on one codebase: the **training app** (public, no login: builds workouts from an illustrated exercise library, logs sets, plans the week, hands workouts to the SyncroFit timer app) and **Live Elevated Pro** (a multi-tenant, white-label layer where a gym or trainer gets a branded space at `/g/<slug>` behind Clerk login, with client rosters and a private trainee progress portal). The repo is named `vitality-tracker`; the product is Live Elevated. It is not a native app and not the SyncroFit timer (that is `~/dev/syncrofit`).

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Language / runtime | TypeScript 5, Node (this Mac: v26.9.0 from `node -v`) | Node version Vercel uses: unverified: set in the Vercel dashboard; Dino can confirm. |
| Framework | Next.js **14.2.35** App Router, React 18, Tailwind 3.4 | `next` is pinned exactly (no caret) and `eslint-config-next` matches. Not the Next 15/16 used by sibling repos; do not copy their patterns. |
| Auth | Clerk (`@clerk/nextjs` ^6.39.5); Organizations = tenancy | `middleware.ts` degrades to pass-through if `CLERK_SECRET_KEY` is missing. |
| Data | Neon serverless Postgres (`@neondatabase/serverless`), plain SQL, no ORM | Schema in `supabase/schema.sql`. The folder is named `supabase/` for historical reasons; the database is Neon (SITE.md). |
| Other | framer-motion, sharp, qrcode | |
| Tests | Vitest ^4.1.8, 38 test files | `npm run build` runs `prebuild` = `vitest run`, so **a failing test fails the build and the deploy**. Typecheck is clean per STATUS.md (2026-08-29); there is no `typecheck` script, run `npx tsc --noEmit`. |
| Hosting | Vercel | See §3. |

## 3. Where it runs

- **Production:** Vercel, deployed from `main` of private repo `dinof777/vitality-tracker` (STATUS.md). Live at https://www.liveelevated.fit (STATUS.md, 2026-08-29). SITE.md still says the canonical domain was "pending DNS" and names https://vitality-tracker-mauve.vercel.app; unverified: which of those is current today (STATUS.md is newer; Dino or `curl -I` can confirm).
- **Environments:** one `.env.local` locally; whether it and production share the same Neon branch/database: unverified: ask Dino. Do not assume local is isolated (see §10).
- **Branches:** shipping to `main` is Dino's click (global rule); push work branches only. No `vercel.json` in the repo.
- Mac side: none.

## 4. Directory tree

```
vitality-tracker/
├── app/                   App Router (34 route.ts, 36 page.tsx)
│   ├── page.tsx, welcome/, setup/, plan/, daily5/, log/, workout/, routines/, exercises/, settings/, collections/, build/   Training app (public)
│   ├── pro/, sign-in/, sign-up/, onboarding/, dashboard/, admin/   Pro marketing + trainer/admin area (Clerk)
│   ├── g/                 Tenant public surfaces /g/<slug>[/exercises|/build|/poster], /g/<slug>/branding
│   ├── s/, portal/        Public tokenized share link (/s/<token>) and trainee portal (/portal/<token>)
│   ├── api/               admin, brand-scrape, exercises, log, me, mobility, onboarding, overload, routines,
│   │                      share, syncrofit, taxonomy, tenant, tenants, workouts
│   └── llms.txt/, robots.ts, sitemap.ts, manifest.ts, icon.tsx, apple-icon.tsx   Infra routes
├── components/            admin, charts, daily5, dashboard, home, layout, marketing, workout
├── lib/                   Domain logic (77 files, tests co-located as *.test.ts): db.ts, scoped-db.ts
│                          (mandatory tenant query helper), current-tenant.ts, taxonomy*, lifecycle*,
│                          syncrofit*, client-portal-*, workout generation
├── middleware.ts          Clerk guard + 410 edge guard for retired tenant slugs
├── supabase/              schema.sql (full current state) + migrations/0001..0013 + README.md
├── scripts/               run-migrations.mjs, sync-exercises-to-db.ts, sync/check-syncrofit-contract.mjs, measure-viewport.mjs
├── contracts/syncrofit.json   Vendored copy of SyncroFit's integration contract
├── public/                exercises/ (illustrations), marketing/, icon.svg
├── .design/               Per-feature design briefs (Ivy); docs/ = three FIX_*.md notes
├── .claude/launch.json    Dev-server launch config (npm run dev, port 3000)
├── .env.local.example     Names the one required variable (DATABASE_URL)
└── SITE.md, DESIGN.md, STATUS.md, README.md (boilerplate)
```

## 5. Data

Neon Postgres. Tables (SITE.md has the detail): exercises, routines, routine_exercises, workouts, log_entries, mobility_logs; tenants, clients, client_profiles, client_metrics, tenant_workouts, share_links; exercise_aliases, equipment_catalog, tenant_equipment, taxonomy_terms, tenant_terms; syncrofit_events. Schema file: `supabase/schema.sql` (full state, for a fresh DB). Migrations: `supabase/migrations/` (13 SQL files, `0001`–`0013`), applied by `npm run migrate`, which records each in `schema_migrations`. Every change must land in both the migration and `schema.sql`. Multi-tenancy is app-level, not database-enforced: every tenant query filters by `currentTenant().id` through `lib/scoped-db.ts`. Exercise library size: unverified: SITE.md says 227, STATUS.md says 291 (both dated; count the rows in `lib/exercises.ts`/the DB to settle). Which Neon branch is production: unknown, ask Dino.

## 6. Entry points

- **Routes:** about 36 pages and 34 API handlers; the described list is in `SITE.md`. Public: `/`, `/welcome`, `/exercises`, `/routines`, `/plan`, `/daily5`, `/log`, `/setup`, `/g/<slug>…`, `/s/<token>`, `/portal/<token>`, `/pro`, `/llms.txt`. Clerk-protected (by `middleware.ts`): `/dashboard`, `/onboarding`, `/admin`, `/g/<slug>/branding`. The file tree wins over SITE.md if they disagree.
- **Inbound webhook:** `POST /api/syncrofit/events` (SyncroFit sends `circuit.imported` / `circuit.completed`; `SYNCROFIT_WEBHOOK_SECRET` guards it).
- **npm scripts:** `dev`, `build` (runs tests first), `start`, `lint`, `test`, `test:watch`, `sync:syncrofit`, `check:syncrofit`, `measure:viewport`, `migrate`.

## 7. External services

| Service | Used for | Credential (name only) |
|---|---|---|
| Neon Postgres | All data | `DATABASE_URL` |
| Clerk | Trainer auth, Organizations as tenants | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| SyncroFit (`~/dev/syncrofit`) | Workout hand-off by deep link; webhooks back | `SYNCROFIT_WEBHOOK_SECRET`; contract fetched from `SYNCROFIT_CONTRACT_URL` or read from `SYNCROFIT_REPO` (sync scripts) |
| Vercel | Hosting | none in repo |
| Gemini ("nano-banana") | Generated the exercise illustrations once (SITE.md) | none read by code |
| Site config / admin | Canonical URL; who is an admin | `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS` |

Also read by code: `CHROME` (path used by `scripts/measure-viewport.mjs`). Clerk is on **development keys in production** as of 2026-08-29 (STATUS.md Blocked #1); unverified: whether that has since changed (Dino).

## 8. Scheduled jobs

None. No `vercel.json`, no `.github/`, and FLEET.md lists no scheduled jobs for this repo.

## 9. Local setup

```bash
cd /Users/dinoflora/dev/vitality-tracker && npm install
cd /Users/dinoflora/dev/vitality-tracker && cp .env.local.example .env.local   # then fill DATABASE_URL; .env.local already exists on this Mac, do not overwrite it
cd /Users/dinoflora/dev/vitality-tracker && npm run dev
cd /Users/dinoflora/dev/vitality-tracker && npm run lint && npx tsc --noEmit && npm test
cd /Users/dinoflora/dev/vitality-tracker && npm run check:syncrofit
```

- `npm run dev` serves http://localhost:3000 (`.claude/launch.json`).
- `.env.local` is git-ignored; `.env.local.example` only lists `DATABASE_URL`, but Clerk and the other names in §7 are also read. Without the Clerk secret the middleware passes everything through, so login-gated pages open unguarded locally.
- `npm run build` runs the whole Vitest suite first (`prebuild`). Test baseline: STATUS.md says all pass (2026-08-29); not re-run now.
- `npm run migrate` and `sync-exercises-to-db.ts` **write to whatever `DATABASE_URL` points at**. Do not run them until you know that database.

## 10. Boundaries and do-not-touch

- **Database writes are production-adjacent.** `DATABASE_URL` env resolution (environment first, then `.env.local`) means a local `npm run migrate` can hit the live database if `.env.local` points there. Migrations are idempotent and never edited after shipping; a migration lands as a reviewed PR before it touches the live DB (`supabase/migrations/README.md`). Take a restore point before any change that deletes or rewrites data.
- **Never edit a shipped migration; add a new one and fold it into `schema.sql`.** They drifted once (`exercises.tags`, repaired in `0001`).
- **Tenant isolation is by convention.** Use `lib/scoped-db.ts`; a raw query without the tenant filter leaks one gym's data to another. `client_profiles.notes` is trainer-private and must never appear in a trainee-facing read shape. Client names/contacts/body metrics are personal data: no PII in logs, URLs or fixtures.
- **`contracts/syncrofit.json` is a vendored copy.** Refresh it with `npm run sync:syncrofit`, not by hand; `npm run check:syncrofit` fails on drift. The source of truth is `~/dev/syncrofit/www/integration-contract.json`.
- **Retired tenant slugs** live in `lib/tenant-directory.ts` (`RETIRED_TENANT_SLUGS`) and are served a 410 at the edge in `middleware.ts`; this was done on purpose because bot traffic to one demo slug drove most of the Vercel bill. Do not "fix" the 410 or make `/g/[slug]` cheaper-looking by removing it.
- **Delete means archive when in use**: `routine_exercises` and `log_entries` cascade off `exercises`, so hard-deleting a trained exercise destroys history (SITE.md lifecycle section; logic in `lib/lifecycle.ts`).
- **Next.js is 14 here.** Do not apply Next 15/16 conventions from other repos.
- Owners: design system Ivy; site docs (`/llms.txt`, `SITE.md`) Kevin; tests Theo/Sami; the SyncroFit contract belongs to the syncrofit repo (see its `SITE.md`).
