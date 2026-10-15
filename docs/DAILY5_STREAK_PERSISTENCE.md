# Daily 5 streak persistence — what happens, and what now restores it

Resolved 2026-10-08 by reading the code; the restore path below was built
2026-10-10 after Dino chose option A on card `41a6b996` ("make streaks
portable"), and **reworked 2026-10-15 onto the per-device identity from card
`99e9dadb`** after Dino chose "hold it and rework on top" — see
`DAILY5_STREAK_REWORK_ON_DEVICE_ID.md` for why the first version's own identity
mechanism was deleted rather than merged. Re-resolve with:

```
cd /Users/dinoflora/dev/vitality-tracker && npx vitest run lib/daily5.test.ts lib/daily5-sync.test.ts app/api/mobility/route.test.ts
```

## What it was: hybrid on paper, localStorage-only in practice

The card asked whether streak data is localStorage-only or mirrored to the
database. It was neither, cleanly. It was **one-way**:

| Direction | Path | Status before |
|---|---|---|
| Write → localStorage | `saveDay()` in `lib/daily5.ts` | live, authoritative |
| Write → database | `POST /api/mobility` from `app/daily5/page.tsx` | live, fire-and-forget, errors swallowed |
| Read → localStorage | `loadDay()` / `computeStreak()` | live, the **only** read path |
| Read → database | `GET /api/mobility` | implemented, **never called by any client** |

Every tick was already being saved. Nothing ever read it back, so the cloud
copy was a write-only archive: clearing Safari website data, reinstalling the
PWA, or opening on a second device showed a streak of **0** while
`mobility_logs` still held every completed day. For a feature whose whole job
is an accountability loop, that is the worst shape of failure — the data
survives and the motivation does not.

## Why the cloud copy could not simply be read back

`mobility_logs` declared `logged_date date not null unique` — **globally
unique, with no column saying whose day it was** — and the POST upserted on
that conflict target. Every user of the deployment shared one row per calendar
date and overwrote each other. Reading it back would have restored somebody
else's streak: a worse bug than the one being fixed. That is the whole reason
the first pass on this card shipped tests and no fix, and asked instead.

## What was built (option A)

### 1. The table is scoped to an owner — by `device_id`, not by this card

The scoping is **not this card's work and no longer this card's mechanism**. It
comes from `supabase/migrations/0014_device_identity.sql` (card `99e9dadb`),
which adds `device_id text` to all four consumer tables and replaces the global
`mobility_logs_logged_date_key` with a partial unique index on
`(device_id, logged_date) where device_id is not null` — the upsert's conflict
target. Pre-0014 rows keep `device_id = NULL` and are matched by nothing; they
are **not deleted**, and deliberately not backfilled (they are a blend of
Dino's own training and strangers', with no column that can separate them).

The identity is a uuid in an **httpOnly, SameSite=Lax `vt_device` cookie**,
minted server-side by `lib/device.ts` the first time a browser writes anything.
Nothing user-supplied is ever accepted as a device id — not a body field, not a
query param, not a header; only that cookie, and only if it parses as a uuid.

**This card's first version had its own, worse identity**, and the rework
deleted it: `owner_key`, minted into **localStorage** and sent in an
`x-daily5-owner` header. A key that lives in localStorage dies with
localStorage, which is the exact failure this document is about — so it never
achieved the card's own goal. An httpOnly cookie survives a localStorage clear.
That is why the rework was an inheritance, not a compromise. Deleted with it:
the `u:<clerk user id>` account branch (re-propose it on its own card if
accounts are wanted here) and the `legacy:single-user` backfill, which rewrote
production data to a sentinel.

`lib/daily5-sync.ts` now holds **no identity at all**, and the route never
echoes the device id back to the client — `vt_device` is httpOnly precisely so
page JavaScript cannot read it, and returning it in a JSON body would hand it
to any XSS. Both rules are asserted in `app/api/mobility/route.test.ts`.

### 2. The read path exists and something calls it

- `GET /api/mobility` (no `?date=`) returns this device's logged days, newest
  first, capped at `LOOKBACK_DAYS` (400 ≈ 13 months), plus a `count`. It never
  mints a cookie — minting happens only in write routes, to keep `Set-Cookie`
  off responses that may be cached. No cookie means `{ logs: [], count: 0 }`
  and no query: a browser that has never written owns nothing, so empty is the
  honest answer rather than an error.
- `POST /api/mobility` still takes one day, and now also takes
  `{ days: [...] }` — a whole history in **one** statement, expanded from a
  single `jsonb` parameter via `jsonb_to_recordset` rather than 400 round trips.
- `app/daily5/page.tsx` runs one cloud pass per mount:
  - **no local history** (reinstalled / cleared / new device) → `restoreDays()`
    writes the cloud days into localStorage and the streak is recomputed;
  - **local history that was never pushed** → push it once, so the cloud copy
    holds the whole streak rather than only the days ticked since sync went
    live.

That second branch is decided by `shouldPushHistory(count)` — **state-derived,
never a stored flag**. The replaced version remembered "already pushed" in
localStorage keyed on the owner key; the client can no longer read its own
identity, and a bare boolean would have been worse than nothing, because a
stale `true` after a cookie change would suppress the push forever and the new
identity would own no history at all. Zero cloud days plus local days means
push; it is idempotent (the next read returns a non-zero count) and
self-corrects on a new cookie. Known limit, accepted: it only fires when the
cloud is *completely* empty for this device, so a device one day ahead of the
cloud does not re-push the gap — today's own POST covers today, and a per-day
diff is a bigger mechanism than the failure justifies.

Offline or a 503 is a non-event: localStorage is written first and stays
authoritative, and the pass retries on the next mount.

### 3. Two ordering bugs fixed on the way

- **The empty-day clobber.** The save effect fires on mount, so a fresh install
  would have POSTed `completedItems: []` for today in parallel with the restore
  read — overwriting today's stored row with an empty one. The POST is now held
  behind a `synced` flag until the cloud pass has finished.
- **Local always wins a merge.** `restoreDays()` skips any date the device
  already has a value for. The device is the only place an offline tick can
  happen, so a local day is newer than or identical to the cloud copy; letting
  the cloud win would resurrect a day the user un-ticked while offline.

## The limit, stated plainly

**Restore only works as far as the cookie survives.** The card's title says
"after PWA reinstall or localStorage clear"; on this mechanism only the second
half is reliably fixed. The honest matrix:

| Scenario | Streak survives? |
|---|---|
| localStorage cleared, cookies intact | **Yes** — the restore read repopulates it |
| Safari "Clear History and Website Data" | **No** — that drops cookies too |
| Delete the PWA from the Home Screen and reinstall | **Unverified** — depends on whether iOS keeps the cookie jar for that origin; see below |
| A second device | **No** — a different cookie is a different identity |

The reinstall row is the one this card is named for and it **cannot be verified
from here** — it needs a physical iPhone, after this is merged, migrated and
deployed. Do not assume it passes; capture what actually happens. The rows that
say No are not bugs in the restore path, they are the ceiling of a
browser-storage identity: closing them needs a real account, which
`SECURITY.md` documents as the auth model but does not wire to the consumer
app. **That is a separate card.**

Rejected alternative, recorded so nobody re-derives it: keying rows on the
account email already typed into `/settings` (hashed, so no PII in the table).
It would make restore work across devices with no sign-in, but
`app/settings/page.tsx` promises in as many words that "Your name, email &
phone stay on this device", and an unverified email is a weak access boundary
for someone else's record. Not worth breaking a stated promise for a
convenience. The earlier `u:<clerk user id>` branch was the beginning of the
account idea; it was deleted in the rework and belongs on its own card rather
than smuggled back in here.

Consequence: a user is still told none of this, so the streak can vanish with
no explanation. That is the remaining user-visible piece — one line under the
streak badge, e.g. *"Your streak is saved to this browser. Clearing website
data starts it over."* It is Ivy's wording and Kevin's build, with a preview
screenshot, per the floor rule, and it is deliberately **not** in this commit:
this runner worktree has no network and cannot produce the screenshot.

## What is pinned by tests

- `lib/daily5.test.ts` (16 tests) — the on-device contract: streak arithmetic
  (consecutive days, today-unfinished, gaps, partial days, month boundary,
  server render), corrupt stored JSON, and the total loss of a 12-day streak
  when the store is cleared with nothing to restore it.
- `lib/daily5-sync.test.ts` (18 tests) — the local history scan (ignores empty
  days, corrupt values, unrelated keys, and stops at the horizon),
  `shouldPushHistory` in both directions including idempotence and a storage
  that refuses reads, and the fix itself: **a 12-day streak clears to 0 and
  comes back to 12 from the cloud copy**, local winning on a merge, untrusted
  rows skipped, storage-write failures survived.
- `app/api/mobility/route.test.ts` (21 tests) — both reads scoped by
  `device_id`, no cookie meaning an empty answer with **no query at all**, a
  non-uuid cookie never reaching SQL, the device id never echoed in the
  response body, the cookie minted on a write and not re-minted when present,
  the `(device_id, logged_date)` conflict target, a 12-day history landing in
  one statement, and the 400/503/500 paths.
- `lib/device.test.ts` (12 tests, from card `99e9dadb`) — the cookie parsing
  this now depends on, in both failure directions.

All offline: no jsdom (an in-memory `localStorage` stub on `globalThis.window`,
matching this repo's pure-node suites) and the SQL client mocked. Clerk is no
longer mocked here because the route no longer reads it.

## Deploy order — this one matters

The code requires `device_id`. If it ships before the migration runs, every
`/api/mobility` call 500s; the checklist keeps working on-device (errors are
swallowed by design) but **the sync and restore are silently dead**, which is
the exact failure shape this card exists to kill. So: merge, then
`npm run migrate` (it prints each file it applies — the output is the proof,
not a tick), then deploy.

This card adds **no migration of its own**. `0014_device_identity.sql` arrives
with `99e9dadb`, which must merge first; this branch is stacked on it. The
migrate step belongs to that card and is already a run card in Dino's inbox
there — running it once covers both.

## Also left alone, deliberately

`computeStreak()` can issue up to 3,650 `getItem` calls and runs on every
checklist commit. On a real streak it exits after a handful of reads, so it is
a latent cost, not a defect. Noted, not changed.

## Owners

`lib/daily5.ts`, `lib/daily5-sync.ts` and the checklist page are Morgan's
(client state and data truth). The route handler is Nolan's, as is
`lib/device.ts` and the migration that arrive with `99e9dadb`. The suites are
Theo's. The user-visible note under the streak badge is Ivy's wording, Kevin's
build.
