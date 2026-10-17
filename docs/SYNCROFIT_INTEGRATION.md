# The SyncroFit integration

**Written:** 2026-10-08 · **Contract version pinned:** 2 (`contracts/syncrofit.json`, dated 2026-07-23)

SyncroFit is the interval-timer phone app that actually *runs* a Live Elevated workout — it calls
out every exercise, set and rest so you don't touch your phone mid-set. This document is the one
place that describes how the two apps talk, what we send, what comes back, and what is still
missing.

It exists because the integration had been built without a written home: the code, the contract
and the tests were all real and all good, but nothing tied them together, so every SyncroFit
question arrived as an orphaned bug with no context.

---

## 1. Correcting the record first

The card that commissioned this document described the integration as having "no schema contract,
no API spec". **That was already wrong when it was written.** What actually exists on disk:

| Claimed missing | Reality |
|---|---|
| No schema contract | `contracts/syncrofit.json` — a vendored copy of SyncroFit's own canonical contract, v2 |
| No API spec | The same file specifies both directions: 5 outbound URL formats and the inbound webhook |
| Nothing tracking drift | `npm run check:syncrofit` compares our copy against the hosted contract; `npm run sync:syncrofit` pulls a newer one |
| No tests | `lib/syncrofit-contract.test.ts` — now 19 conformance tests, failing the build on any drift |
| Sync direction undecided | Decided and built (see §4). It was never written down, which is a different problem |

Two further corrections for anyone reading the project objective:

- **The database is Neon Postgres, not Supabase.** The `supabase/` directory name is a leftover;
  `supabase/schema.sql` and `supabase/migrations/` are plain Postgres applied by hand via
  `npm run migrate`. The project objective still says Supabase.
- **The app is Live Elevated** (<https://www.liveelevated.fit>), a public two-sided product, not
  the single-user personal tracker the objective describes.

So the real gap this card closes is **documentation and one genuine defect**, not an undefined
integration.

---

## 2. What we send SyncroFit (outbound)

### Transport

A **user-initiated deep link**. The user taps `⏱ SEND TO SYNCROFIT`
(`components/workout/SyncroFitButton.tsx`) and we navigate to:

```text
syncrofit://run?circuit=<url-encoded PartnerJSONCircuit JSON>
```

Built by `syncrofitRunUrl()` (ad-hoc workouts) and `syncrofitRunUrlFromRoutine()` (saved
routines), both in `lib/syncrofit.ts`.

The legacy `intervaltimer://import-circuit?data=<base64>` format is still in the file
(`syncrofitUrlFromWorkout`) but is **deprecated** in the contract: it carries no webhook, so no
feedback can flow. Prefer `syncrofit://run`.

### The circuit payload

Required: `name`, `exercises`. Strongly recommended and always sent: `id`, `webhook`.

| Field | What we send |
|---|---|
| `id` | Our own correlation id — routine id, workout id, share token, or `<slug>-build`. Echoed back verbatim on every webhook event |
| `name` | Workout or routine name |
| `description` | `"Sent from Live Elevated"` |
| `from` | `{ name, organization }` — the gym's own name on a branded send, Live Elevated otherwise |
| `restBetweenExercises` | `params.setupSec` |
| `webhook` | `<SITE_URL>/api/syncrofit/events` — **per-circuit, not a global partner URL** |
| `mode` | `intervals` \| `forTime` \| `amrap` \| `emom`. Omitted at the contract default (`intervals`) |
| `amrapMinutes` / `emomMinutes` | Clamped to the contract's 1..60 |
| `setOrder` | `straightSets`, sent explicitly whenever mode is intervals — Vitality routines are set-by-set, the opposite of SyncroFit's `circuit` default |
| `exercises[]` | Below |

Per exercise: `name`, `notes` (cue + prescription), `sets`, `reps`, `actionTime`, `restTime`,
`betweenSetRest`, and optionally `actionImageURL` and `requiredEquipment`.

### Exercise images — the part that was broken

The library stores `image_url` as a **site-relative path** (`/exercises/goblet-squat.jpg`; all 291
are `.jpg` under `public/exercises/`, which satisfies the contract's jpg/png/gif requirement).
SyncroFit needs an **absolute HTTPS URL** it can download on import, so `absImageUrl()` resolves
the relative path against an origin, and drops the image entirely rather than ever sending a
non-HTTPS URL.

**The defect:** that fallback origin was a second hardcoded domain in `lib/syncrofit.ts` —
`https://vitality-tracker-mauve.vercel.app` — while the app's canonical address lives in
`lib/site.ts` as `SITE_URL`. Seven of the eight call sites passed `''` for the origin, so they all
fell through to the preview domain. Two of them (`app/s/[token]`, `app/dashboard/workouts/[id]`)
had already computed the real request origin for their QR codes and then discarded it.

The same hardcoded constant also built the **webhook URL**, so completion feedback was addressed
to the preview deployment too.

**Fixed** (2026-10-08) by:

1. `lib/syncrofit.ts` — the fallback origin is now `SITE_URL`, so there is one source of truth
   for the app's public address and `NEXT_PUBLIC_SITE_URL` overrides both images and webhook.
2. Passing the real request origin at the three server call sites that already had it:
   `app/s/[token]/page.tsx`, `app/dashboard/workouts/[id]/page.tsx`, `app/g/[slug]/build/page.tsx`.

The client-component call sites (`StartSheet`, `TodaySuggestion`, `CustomWorkoutBuilder`,
`app/routines/[routineId]`) were deliberately left on the fallback. `StartSheet` already passes
`window.location.origin`; the others build their URL during render, where `window` is undefined
during SSR, and the fallback is now correct anyway. Adding an origin parameter to
`syncrofitRunUrlFromRoutine` was considered and rejected as unnecessary churn for no behaviour
change.

> **One thing still unverified.** `SITE_URL` defaults to `https://liveelevated.fit` (apex, no
> `www`), and `STATUS.md` records that the apex *redirects* to `www.liveelevated.fit`. Whether
> SyncroFit's image downloader follows a 301 is not something this repo can answer, and network
> access was denied in the session that made this fix, so neither domain was probed live. If
> images come back blank, the fix is one environment variable:
> `NEXT_PUBLIC_SITE_URL=https://www.liveelevated.fit`. See the smoke test in §5.

---

## 3. What comes back (inbound)

SyncroFit POSTs JSON to the `webhook` URL embedded in the circuit we sent.

- **Endpoint:** `app/api/syncrofit/events/route.ts` (`POST`; `GET` is a health check)
- **Events:** `circuit.imported`, `circuit.completed`
- **Auth:** optional shared secret. Set `SYNCROFIT_WEBHOOK_SECRET` on both sides and SyncroFit
  sends `Authorization: Bearer <secret>`. **Until it is set the endpoint accepts unauthenticated
  posts** — deliberate, so the loop worked immediately, but it means anyone who learns a circuit id
  can inflate that circuit's import and completion counts. Worth closing now the loop works.
- **Consent-gated:** events only flow if the user enables SyncroFit's *Settings → Privacy &
  Safety → Share with third-party app makers*. Silence is a legitimate state, not a bug.
- **Identity:** `user.scopedId` is a 16-hex per-partner SHA256 hash. It cannot be correlated with
  any other app, by design.

Stored in `syncrofit_events` (`supabase/schema.sql`), keyed on `circuit_id` — the id we sent.
Read back by `lib/syncrofit-events.ts` for the routine activity feed and the engagement badges.

---

## 4. Push, pull or webhook? — decided

**Both directions are already settled in code; this records the decision.**

| Direction | Mechanism | Why |
|---|---|---|
| Live Elevated → SyncroFit | **User-initiated push** via deep link | No account linking, no API key, no background sync, nothing to babysit. The user is holding the phone at the gym and taps a button; the workout arrives instantly. Neither app needs to know the other's users |
| SyncroFit → Live Elevated | **Webhook** (`POST`, per-circuit URL) | Fire-and-forget, 5s timeout, consent-gated. We learn a workout was imported or completed without polling anything |

**Rejected: a pull/polling model.** It would need an authenticated SyncroFit API, stored
credentials, an account-linking flow and a scheduled job — all to replace a button tap. There is
no shared user identity between the apps (deliberately: the scoped hash prevents it), so there is
nothing to poll *for*.

**Consequence worth stating plainly:** the handoff is **stateless and one-shot**. We do not know
whether SyncroFit is installed (the deep link fails silently, which `SyncroFitButton` detects by
watching for backgrounding), and we cannot revoke or update a circuit after it is sent. A workout
edited here does not change a circuit already imported there — the user re-sends it.

---

## 5. Manual smoke test

Run after any change to `lib/syncrofit.ts`, `contracts/syncrofit.json`, or the webhook route.
Needs a phone with SyncroFit installed.

**Automated gates first** (these need no phone):

```bash
cd /Users/dinoflora/dev/vitality-tracker && npm run check:syncrofit && npx vitest run lib/syncrofit-contract.test.ts && npx tsc --noEmit && npm run lint
```

Expect: "In sync with the hosted contract (v2)", 19 tests passing, and no output from the last two.

**Then, on the phone:**

1. Open <https://www.liveelevated.fit/build> on the phone and generate a workout.
2. Confirm the exercises on screen show their illustrations — if they're blank *here*, the problem
   is the images, not the integration.
3. Tap **⏱ SEND TO SYNCROFIT**. SyncroFit should open with the workout already loaded.
   - Nothing happens → the app isn't installed; the button says so after ~1.6s.
   - On a desktop browser it will never work, and the page says so up front.
4. **The image check — this is the one that was broken.** Press start. Each work phase should show
   that exercise's photo as the background, not the default. A blank background with a correct
   exercise *name* means the image URL didn't resolve — check the §2 note about apex vs `www`.
5. Check the set/rest structure matches: `sets` × `reps`, rest between sets, and for a routine that
   the order is straight sets (all of exercise 1, then all of exercise 2), not interleaved rounds.
6. Finish the workout (or skip to the end).
7. **The feedback check.** Back on the web app, open the routine you sent and look at its SyncroFit
   Activity card: an **import** and a **completion** should both be listed.
   - Nothing at all → check SyncroFit's *Settings → Privacy & Safety → Share with third-party app
     makers* is on. Without it, no events are sent and this is expected.
   - Imports but no completions → the completion event, not the handoff, is at fault.
8. Repeat step 3 once from a **branded gym page** (`/g/<slug>/build`) and confirm the circuit is
   attributed to the gym's name, not "Live Elevated".

---

## 6. Audit: fields SyncroFit touches, and whether a write path exists

Outbound — everything the contract defines that we populate:

| Field | Source | Write path |
|---|---|---|
| `name`, `notes`, `sets`, `reps`, `actionTime`, `restTime`, `betweenSetRest` | `exercises` / `routine_exercises` + `WorkoutParams` | ✅ |
| `actionImageURL` | `exercises.image_url` → `absImageUrl()` | ✅ **fixed 2026-10-08** — existed, resolved against the wrong origin |
| `requiredEquipment` | `exercises.equipment` → `SF_EQUIPMENT` | ✅ every enum value mapped, test-enforced |
| `id`, `webhook`, `from`, `mode`, `amrapMinutes`, `emomMinutes`, `setOrder` | computed | ✅ |
| `restImageURL`, `coachVoiceURL`, `optionalEquipment` | — | ⬜ not used. No rest-phase imagery or coach audio exists to send; no gap |

Inbound — two real gaps found, **neither fixed here** (both need a decision, and both are outside
the one defect this card named):

| Field | Status |
|---|---|
| `event`, `circuit.id`, `circuit.name`, `user.scopedId`, `user.displayName`, `startedAt`, `completedAt`, `durationSeconds`, `timestamp` | ✅ typed columns in `syncrofit_events` |
| **`result.amrapRounds` / `result.emomMinutesCompleted` / `result.mode`** | ⚠️ **Not captured.** `SyncrofitEventInput` reads only the legacy top-level `durationSeconds`; the whole v2 `result` object survives solely inside the `raw` jsonb. We *do* send `mode=amrap` and `mode=emom`, so the single number that makes those modes meaningful — rounds completed — is received and then discarded as far as any query is concerned |
| **`client_profiles.syncrofit_user_scoped_id`** | ⚠️ **Read but never written.** Surfaced by `app/api/tenant/clients/[clientId]/shared.ts`, typed in `lib/client-portal-db.ts`, and set by no insert or update anywhere in the repo — verified by grep. Migration `0013` calls the join logic "a later fast-follow"; it was never built, so the column is permanently null and a trainer can never see which SyncroFit user is their client |

Both are recorded in `STATUS.md` under findings. They want cards under the SyncroFit workstream
once that workstream exists.

---

## 7. Keeping the contract honest

`contracts/syncrofit.json` is **owned by the SyncroFit repo**, not this one. Under the cross-repo
rules, changing it from this side goes through a NEED document — do not edit it here.

- `npm run check:syncrofit` — compares our copy to the hosted contract. Run it before trusting
  anything in this document.
- `npm run sync:syncrofit` — pulls a newer contract. This will fail
  `lib/syncrofit-contract.test.ts`, which pins `EXPECTED_CONTRACT_VERSION = 2`, forcing a
  deliberate review of what changed before the pin moves.

`prebuild` runs the full suite, so a contract drift cannot reach a build unnoticed.
