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
| `/exercises` | The 188-move illustrated library; search, tap for detail, + to a routine |
| `/routines` | Reusable blueprints — build, favorite, delete, send to SyncroFit |
| `/routines/[routineId]` | Routine detail — reorder, send to SyncroFit, **SyncroFit Activity** card |
| `/plan` | Weekly plan across the 4 pillars (strength/cardio/balance/flexibility) |
| `/daily5` | Daily mobility checklist + streak |
| `/log`, `/workout/[workoutId]` | Logging surfaces (progressive-overload spine) |
| `/settings` | Profile — trainer/trainee, saved routines, history |
| `/setup` | First-run profile wizard |

### Vitality Pro — trainer admin (Clerk-protected)
| Route | What it is |
|---|---|
| `/sign-in`, `/sign-up` | Clerk auth |
| `/onboarding` | Create a gym → Clerk Organization + tenant row + slug |
| `/dashboard` | Trainer home |
| `/dashboard/exercises` | Custom exercises + per-gym renames (aliases); governed muscle-group/tag pickers |
| `/dashboard/equipment` | Custom equipment (dedup + "did you mean?") |
| `/g/<slug>/branding` | Brand autopilot (paste URL → logo/colors/name) + pickers |
| `/admin/equipment` | Global equipment-catalog moderation (admins only) |
| `/admin/taxonomy` | Muscle-group + tag moderation, ranked by gyms proposing (admins only) |

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

- **exercises** — the master library. `is_global` rows = shared 188; a gym's
  custom moves carry `tenant_id`. `equipment` is the 9-value enum;
  `equipment_catalog_id` links custom-equipment moves.
- **routines / routine_exercises / workouts / log_entries** — training data;
  `log_entries` is the progressive-overload spine (`side` for unilateral).
- **mobility_logs** — Daily 5.
- **tenants** — white-label gyms (`slug`, `branding` jsonb, `clerk_org_id`, `plan`).
- **exercise_aliases** — per-tenant local renames.
- **equipment_catalog** + **tenant_equipment** — global deduped equipment
  taxonomy (status: core/approved/pending/rejected/merged) + per-gym usage.
- **taxonomy_terms** + **tenant_terms** — the same governed model for every other
  vocabulary a trainer can extend (muscle groups, tags). `exercises.muscle_group`
  and `exercises.tags` hold display values validated against it on write.
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

`exercises` (the 188 + equipment order/labels) · `workout-generator`
(time-budgeted, accepts a custom pool + seeded RNG) · `exercise-mode` /
`exercise-intensity` / `pillars` (classifiers) · `tenant` / `current-tenant` /
`tenant-library` / `scoped-db` (multi-tenancy) · `taxonomy` (the vocabulary
governance engine — normalize, synonym folding, fuzzy dedup, promotion rules) /
`taxonomy-db` (its server-side reads/writes) / `equipment-normalize` (a shim over
it) · `exercise-dedup` (near-duplicate move names → offer the alias, never fork) ·
`syncrofit` / `syncrofit-events` (integration) · `profile` (params + choices).

### How a trainer-extensible field stays clean

Every vocabulary a trainer can extend runs the same four rules (`lib/taxonomy`):
normalize → fold known synonyms → fuzzy-match for typos → tier the result as
**canon** (curated, global), **proposed** (live for that gym now, `pending`
globally), or **local** (an alias, never leaves the gym). Trainers are never
blocked — only promotion to the shared vocabulary is gated, and a term
`PROMOTION_THRESHOLD` gyms propose independently promotes itself, so the review
queue stays small. Merges rewrite the referencing exercises, so nothing orphans.
