# SITE.md — Vitality

The architecture map for the app: what every surface is, the data model behind
it, and how the pieces connect. Pairs with `DESIGN.md` (the visual system) and
the generated `/llms.txt` (the AI-crawler manifest). Keep this current when
routes, tables, or integrations change.

- **Live:** https://vitality-tracker-mauve.vercel.app
- **Stack:** Next.js 14 (App Router, TypeScript) · Tailwind v3 · Neon serverless
  Postgres · Clerk (auth) · Vercel (hosting) · mobile-first PWA (`max-w-md`)
- **Repo:** dinof777/vitality-tracker

## Two products, one codebase

1. **The training app** — the original single-user workout PWA (public, no login).
2. **Vitality Pro** — a multi-tenant, white-label layer where each gym/trainer
   gets a branded space at `/g/<slug>`, behind Clerk auth for trainers.

---

## Routes

### Training app (public)
| Route | What it is |
|---|---|
| `/` | Home — build today's workout (length · focus · intensity · equipment) or run a scheduled plan day |
| `/exercises` | The 227-exercise illustrated library; search, tap for detail, + to a routine |
| `/routines` | Reusable blueprints — build, favorite, delete, send to SyncroFit |
| `/routines/[routineId]` | Routine detail — reorder, send to SyncroFit, **SyncroFit Activity** card |
| `/plan` | Weekly plan across the 4 pillars (strength/cardio/balance/flexibility) |
| `/daily5` | Daily mobility checklist + streak |
| `/log`, `/workout/[workoutId]` | Logging surfaces (progressive-overload spine) |
| `/settings` | Profile — trainer/trainee, saved routines, history |
| `/setup` | First-run profile wizard |
| `GET /api/taxonomy/regions` | Public, no auth — the admin-managed muscle-group region hierarchy (`{ region, groups[] }[]`), for the builder's REGION tiles |

### Vitality Pro — trainer admin (Clerk-protected)
| Route | What it is |
|---|---|
| `/sign-in`, `/sign-up` | Clerk auth |
| `/onboarding` | Create a gym → Clerk Organization + tenant row + slug |
| `/dashboard` | Trainer home |
| `/dashboard/exercises` | Custom exercises + per-gym renames (aliases); governed muscle-group/tag pickers |
| `/dashboard/equipment` | Custom equipment (dedup + "did you mean?") |
| `/g/<slug>/branding` | Brand autopilot (paste URL → logo/colors/name) + pickers |
| `/admin/equipment` | Global equipment-catalog moderation queue — approve/reject/merge a gym's proposed piece (admins only) |
| `/admin/taxonomy` | Muscle-group + tag lifecycle at both scopes — rename, merge, archive/delete, promote/demote scope, via the disclosure-row pattern; muscle groups can also be grouped into a parent region ("Upper Body" → Chest/Back/Shoulders…), 2 levels max (admins only) |
| `/admin/exercises` | Exercise lifecycle at both scopes — edit any exercise, archive/delete, move it between shared and gym-owned, via the same disclosure-row pattern (admins only) |

### Vitality Pro — public tenant surfaces
| Route | What it is |
|---|---|
| `/g/<slug>` | The gym's branded landing |
| `/g/<slug>/exercises` | The gym's library (global + custom, aliases applied) |
| `/g/<slug>/build` | Generate a workout from the gym's library → QR + Send to SyncroFit |

### Infra
`/llms.txt` (dynamic), `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`.

---

## Data model (Neon Postgres)

`supabase/schema.sql` is the full current state — run it to stand up a fresh
database. `supabase/migrations/NNNN_*.sql` are the incremental steps for a
database that already exists; every change lands in both so they can't drift.

- **exercises** — the master library. `is_global` rows = shared 227; a gym's
  custom exercises carry `tenant_id`. `equipment` is the 9-value enum;
  `equipment_catalog_id` links custom-equipment exercises.
- **routines / routine_exercises / workouts / log_entries** — training data;
  `log_entries` is the progressive-overload spine (`side` for unilateral).
- **mobility_logs** — Daily 5.
- **tenants** — white-label gyms (`slug`, `branding` jsonb, `clerk_org_id`, `plan`).
- **exercise_aliases** — per-tenant local renames of an *exercise's* display
  name. This is the mechanism that's genuinely "local, never leaves the gym" —
  see the taxonomy note below, which doesn't have an equivalent.
- **equipment_catalog** + **tenant_equipment** — global deduped equipment
  taxonomy (status: core/approved/pending/rejected/merged) + per-gym usage.
  Predates `taxonomy_terms` and hasn't been migrated onto it — see below.
- **taxonomy_terms** + **tenant_terms** — the same governed model for every
  other vocabulary a trainer can extend (muscle groups, tags). `exercises.muscle_group`
  and `exercises.tags` hold display values validated against it on write.
  `taxonomy_terms.parent_id` (self-referencing, `muscle_group` kind only) groups
  muscle groups into an admin-managed region — "Upper Body" is an ordinary
  `muscle_group` row that happens to have children. Strictly 2 levels, enforced
  in app code (`checkSetParent` in `lib/taxonomy.ts`), not a DB trigger. The
  workout builder reads the tree (`fetchRegionHierarchy` in `lib/taxonomy-db.ts`,
  or `GET /api/taxonomy/regions`) to offer a REGION tile per parent whose
  `groups` expand to its children — see `lib/profile.ts#regionFocus`.
- **syncrofit_events** — inbound import/completion feedback from SyncroFit.

Multi-tenancy: app-level scoping — every tenant query filters by
`currentTenant().id` (resolved from the Clerk org). `lib/scoped-db.ts` is the
mandatory query helper; isolation is unit-tested.

---

## Integrations

- **SyncroFit** (interval-timer iOS app) — workouts hand off as timed circuits
  via deep link (`syncrofit://run` / legacy `intervaltimer://import-circuit`);
  `circuit.id` = the routine id so feedback correlates. SyncroFit POSTs
  `circuit.imported` / `circuit.completed` to `POST /api/syncrofit/events`, which
  surfaces as engagement analytics on the routine card + routines list.
- **Clerk** — trainer auth; Organizations = tenancy.
- **Gemini (nano-banana)** — generated the lime-on-carbon exercise illustrations.

---

## Key libraries (`lib/`)

`exercises` (the 227 + equipment order/labels) · `workout-generator`
(time-budgeted, accepts a custom pool + seeded RNG) · `exercise-mode` /
`exercise-intensity` / `pillars` (classifiers) · `tenant` / `current-tenant` /
`tenant-library` / `scoped-db` (multi-tenancy) · `taxonomy` (the vocabulary
governance engine — normalize, synonym folding, fuzzy dedup, promotion rules) /
`taxonomy-db` (its server-side reads/writes) / `equipment-normalize` (a shim over
it) · `exercise-dedup` (near-duplicate exercise names → offer the alias, never fork) ·
`syncrofit` / `syncrofit-events` (integration) · `profile` (params + choices) ·
`lifecycle` (add/update/delete/move-scope rules, pure + unit-tested) /
`lifecycle-db` (its usage-count queries).

### Lifecycle: add · update · delete · move scope

Everything a trainer or admin owns (exercises, muscle groups, tags) has the same
four operations, governed by `lib/lifecycle`:

- **Delete means archive when it's in use.** `routine_exercises` and `log_entries`
  CASCADE off `exercises`, so hard-deleting a trained exercise destroys the history
  it's the evidence for. Unused records are really deleted; anything referenced
  sets `archived_at` — it leaves pickers, filters and generation but every
  routine and logged set still resolves, and it can be restored.
- **Scope moves both ways.** Promoting (one gym → shared) is always allowed:
  strictly more people can see it. **Demoting is blocked while other gyms depend
  on it**, and the refusal names them — merge first, then move.
- Renaming a term carries its exercises with it (muscle groups are stored by
  display value, tags by slug), so a rename can't orphan anything.

Trainers get add/update/delete for their own gym's exercises at
`/dashboard/exercises`; admins get all four plus scope at `/admin/exercises` and
`/admin/taxonomy`. Both admin screens are built on the same shared component
pair — see "Disclosure row" in `DESIGN.md` §6.

### How a trainer-extensible field stays clean

Every vocabulary a trainer can extend runs the same three rules (`lib/taxonomy`):
normalize → fold known synonyms → fuzzy-match for typos, then tier the result.

For muscle groups and tags (`taxonomy_terms`) there are really only **two**
tiers in play: **canon** (curated, `core`/`approved` status, global) and
**proposed** (this gym's addition — `pending` status globally, live for them
immediately). There is no third "local" taxonomy tier: a new term is always a
shared `taxonomy_terms` row from the moment it's created, just linked to one
gym via `tenant_terms` until `PROMOTION_THRESHOLD` gyms independently propose
the same thing and it self-promotes. ("Local, never leaves the gym" describes
`exercise_aliases` — a per-tenant rename of an *exercise's* display name — not
a taxonomy term. Don't conflate the two mechanisms.)

Trainers are never blocked — only promotion to the shared vocabulary is gated,
and the review queue stays small because most gaps self-promote before an admin
ever sees them. Merges rewrite the referencing exercises, so nothing orphans.

Equipment runs the same engine (`lib/equipment-normalize` is a thin shim over
`lib/taxonomy`) but still lives in its own table, `equipment_catalog` — it
predates `taxonomy_terms` and hasn't been migrated onto it. `TermKind` includes
`'equipment'` for when that migration happens; today only `muscle_group` and
`tag` actually read/write `taxonomy_terms`.

### Adding a new trainer-extensible vocabulary field

This pattern has been generalized twice now (equipment → muscle groups/tags)
and will likely be reused for the next one. Steps, in order:

1. **Add the kind** — extend `TermKind` in `lib/taxonomy.ts`, and add a
   synonym map for it (`Record<string, string>`, empty object is fine to
   start) wired into the `SYNONYMS` lookup.
2. **Add the label** — add the field's singular/plural to `FIELD_LABEL` /
   `FIELD_LABEL_PLURAL` in `lib/vocabulary.ts`. Surfaces import the label from
   here; never hardcode it inline.
3. **Add a drift guard** — add a case to `lib/vocabulary.test.ts` that fails
   the build if a surface hardcodes the field's name instead of importing the
   label (follow the existing `findOffenders`-style checks in that file).
   Centralizing a label without a matching guard is exactly how the pre-M2
   wording drift happened — don't skip this step. (This file belongs to Theo;
   coordinate rather than editing it yourself.)
4. **Add the DB column/constraint** — a migration adding the `kind` value to
   `taxonomy_terms`'s `kind` check constraint (or a new table, if the field
   doesn't fit the shared shape), following `supabase/migrations/0001_taxonomy.sql`.
5. **Wire the API routes** — a trainer-scoped route (model:
   `app/api/tenant/taxonomy/route.ts`) using `addTerm` / `tenantTerms` from
   `lib/taxonomy-db.ts`; an admin route (model:
   `app/api/admin/taxonomy/route.ts`) for rename/merge/promote/demote/delete.
6. **Add lifecycle coverage** — a usage-count query in `lib/lifecycle-db.ts`
   (model: `termUsage`) feeding `deleteEffect` / `checkScopeMove` from
   `lib/lifecycle.ts`, and an admin UI built on `LifecycleRow` +
   `ScopeSelect` (see `DESIGN.md` §6) rather than a bespoke list.
