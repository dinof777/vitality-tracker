# Daily 5 streak persistence — rework plan on top of `device_id`

**Card:** 41a6b996 — "Add Daily 5 streak regression test after PWA reinstall or localStorage clear"
**Status:** on hold, by Dino's decision (option **A**, 2026-10-15). Written 2026-10-14.
**This document carries no code.** It is the handoff that lets the rework happen in one short
session once the blocker clears, instead of re-deriving the conflict analysis below.

---

## 1. Where everything actually is

| Thing | Where it lives | Shipped? |
| --- | --- | --- |
| This card's implementation | local branch `mc-task-41a6b996`, head `e1882e2` | **No — and not on any remote.** `git branch -r --contains e1882e2` returns nothing. It exists in exactly one place: the local clone at `/Users/dinoflora/dev/vitality-tracker`. |
| The per-device identity it must sit on | `mc-task-99e9dadb`, head `cb610a8` | Pushed to `origin/mc-task-99e9dadb`. **Not merged to `main`.** |
| Shared base `64cbed3` (SyncroFit copy) | on `origin/mc-task-99e9dadb` | Rides along when 99e9dadb ships. |

**The blocker is one click:** 99e9dadb has to land on `main` from the Deployments page. Nothing
about this card can proceed first, because the rework consists mostly of *deleting* this card's
own identity mechanism in favour of 99e9dadb's.

**Durability note worth acting on independently:** `e1882e2` is unpushed and unreplicated. If that
local branch is pruned, ~1,350 lines of working implementation (including three test files) are
gone. Pushing `mc-task-41a6b996` to `origin` costs nothing, ships nothing, and removes that risk —
a branch on `origin` is not a deploy to `main`.

---

## 2. Why these two branches collided

Both cards independently discovered the same root defect and fixed it differently. `mobility_logs`
had `logged_date date not null unique` — **one row per calendar day for the entire deployment** —
so the table could not say whose day a row was.

- **99e9dadb** fixed it as a *security* problem across all four consumer tables (`routines`,
  `workouts`, `log_entries`, `mobility_logs`) with a nullable `device_id` from an httpOnly cookie.
- **41a6b996** (this card) fixed it as a *persistence* problem on `mobility_logs` alone with a
  `owner_key text not null` minted from localStorage.

They are not two halves of one change. They are two answers to the same question, and the
collision is three-layered — not merely the duplicated `0014` filename:

| Layer | 41a6b996 (this card) | 99e9dadb (ships first) | Resolution |
| --- | --- | --- | --- |
| Owner column | `owner_key text not null` | `device_id text` nullable | **Keep `device_id`** |
| Pre-existing rows | backfill all to `'legacy:single-user'`, then `set not null` | left `NULL` on purpose = nobody's, invisible to every scoped query | **Keep `NULL`** |
| Unique index | `(owner_key, logged_date)`, full | `(device_id, logged_date) where device_id is not null`, partial | **Keep the partial** |
| Identity source | client-minted `d:<uuid>` in **localStorage**, sent in an `x-daily5-owner` header | server-minted uuid in an **httpOnly `vt_device` cookie** | **Keep the cookie** |
| GET contract | `?date` optional; returns `{ownerKey, logs[]}` | `?date` required; returns `{log}` | **Merge — see §4** |

### The decisive point

99e9dadb's identity is strictly better *at this card's own stated goal*, and this card's identity
does not actually achieve it:

> This card's `owner_key` is minted into **localStorage**. Clearing localStorage mints a new key,
> which addresses a different pile of rows — so the streak is still lost. That is precisely the
> failure this card exists to fix.

An httpOnly cookie survives a localStorage clear. So the rework is not a compromise; it deletes a
mechanism that was not going to work and inherits one that does.

### The backfill is the part that must not survive

41a6b996's migration rewrites production data: it stamps every existing `mobility_logs` row
`'legacy:single-user'` and makes the column `NOT NULL`. 99e9dadb explicitly rejected that, because
the pre-identity rows are a blend of Dino's own training and strangers', with no column, timestamp
or join that can separate them — backfilling them to one id hands strangers' data to whichever
browser receives that id. **That reasoning is correct and already approved on 99e9dadb.** Dropping
this card's migration therefore also removes the guarded-production-write risk that held the push.

---

## 3. Migration: delete it, do not renumber it

**Action: `git rm supabase/migrations/0014_mobility_logs_owner_key.sql`.** Do not renumber it to
`0015`.

Everything it accomplishes is already accomplished by `0014_device_identity.sql`, which also drops
the offending `mobility_logs_logged_date_key` (and additionally `drop index if exists` for the case
where `0001` created it implicitly — more thorough than this card's version).

**This card needs no migration at all.** Revert this card's `supabase/schema.sql` hunk to
99e9dadb's.

---

## 4. `app/api/mobility/route.ts` — the only real code work left

Start from **99e9dadb's version** and add a range read plus a batch write. 99e9dadb already scopes
both verbs by device, so the server-side scoping half of this card is done once it ships.

**GET — add a range mode, keep the single-date mode.**

- `?date=YYYY-MM-DD` present → unchanged from 99e9dadb: `{ log }`, one row.
- no `date` → `{ logs: [...] }`, this device's rows newest-first, `limit 400` (`LOOKBACK_DAYS`).
- `readDeviceId(req)` returns null → `{ logs: [] }`. **Never mint a cookie on a read** — 99e9dadb
  mints only in write routes, deliberately, to keep `Set-Cookie` off cacheable responses.

**POST — add a batch mode for the one-time history push.**

- `body.days` is an array → upsert each `{date, completedItems}` against the
  `(device_id, logged_date) where device_id is not null` conflict target.
- otherwise → unchanged single-day path.
- Both paths keep `resolveDeviceId` + `attachDeviceCookie(res, deviceId)` when `minted`.

**Do not echo the device id back to the client.** This card's old GET returned `ownerKey` so the
client could key its backfill flag on it. `vt_device` is httpOnly specifically so page JavaScript
cannot read it; echoing it through a JSON body hands it to any XSS and throws that away. See §5 for
the replacement.

---

## 5. `lib/daily5-sync.ts` — delete the identity half, keep the restore half

**Delete:** `DEVICE_KEY_STORAGE`, `BACKFILL_STORAGE`'s owner-keyed form, `OWNER_HEADER`, the
`DEVICE_KEY` regex, `isDeviceOwnerKey`, `accountOwnerKey`, `randomId`, `deviceOwnerKey`. The cookie
replaces all of it, and the client no longer sends or holds any identity.

**Keep as-is** (this is the genuinely valuable, already-tested part — the read that never existed):
`localHistory`, `hasLocalHistory`, `restoreDays`, `normalizeDate`, `parseItems`, `safeJson`,
`dateKey`, `LOOKBACK_DAYS`, and the local-always-wins merge rule with its reasoning.

**Replace the backfill guard.** It currently keys on the owner key, which the client can no longer
read. Do not substitute a bare boolean — if the cookie is replaced, a stale `true` would suppress
the push forever. Instead make it **state-derived and idempotent**: have GET return
`{ logs, count }` and push local history when `count === 0 && hasLocalHistory()`. No flag, nothing
to go stale, and it self-corrects on a new cookie.

**`app/daily5/page.tsx`:** keep the two-job cloud pass and keep the `synced` gate — the gate is
load-bearing. Without it a fresh install POSTs `checked = []` before the restore read returns and
overwrites today's stored row with an empty one. Drop only the header/owner-key plumbing.

---

## 6. Narrow the claim before this ships

The card currently claims streaks "survive a reinstall". On the cookie mechanism, the honest claim
is narrower, and the difference matters because it is user-visible:

| Scenario | Streak survives? |
| --- | --- |
| localStorage cleared, cookies intact | **Yes** — the restore read repopulates it |
| Safari "Clear History and Website Data" | **No** — that drops cookies too |
| Delete PWA from Home Screen and reinstall | **Not reliably** — treat as unverified until tested on a real device |
| Second device | **No** — a different cookie is a different identity |

Closing the remaining gap needs a real account (Clerk), which 99e9dadb's `SECURITY.md` documents as
the auth model but does not wire to the consumer app. **That is a separate card**, not scope here.
This card's old `u:<clerk user id>` owner-key branch was the beginning of that idea; it is deleted
in the rework and should be re-proposed there rather than smuggled back in.

Because of the first and second rows of that table, subtask `0a030147`'s UI note is **still worth
having** even though the premise ("if localStorage-only") is false — one honest line under the
streak badge, e.g. *"Your streak is saved to this browser. Clearing website data starts it over."*
Recommended, not built.

---

## 7. Checklist for the post-ship session

1. Confirm `0014_device_identity.sql` is on `main`.
2. Branch from the new `main`. Cherry-pick `698ec1e` (regression suite) and `e1882e2`
   (implementation) from `mc-task-41a6b996`, expecting conflicts in `app/api/mobility/route.ts`,
   `supabase/schema.sql` and `STATUS.md`.
3. Apply §3 (delete the migration), §4 (route), §5 (sync lib).
4. Update `docs/DAILY5_STREAK_PERSISTENCE.md` — it describes the `owner_key` design throughout and
   will be wrong in every section once §3–§5 land.
5. Fix up `lib/daily5-sync.test.ts` and `app/api/mobility/route.test.ts`: drop the owner-key cases,
   add `vt_device` cookie cases (absent cookie → `{logs: []}`; minted-on-POST sets `Set-Cookie`;
   range GET scopes to one device). `lib/daily5.test.ts` should need no change — it covers the
   streak arithmetic, which is untouched.
6. Run `npx tsc --noEmit`, lint, and `npx vitest run`. The held branch was at tsc 0 / lint 0 /
   vitest 506 passing **before** the rework; that number will move.
7. Subtask `d49522bf` (delete from Home Screen, reinstall, verify) **cannot be automated.** It
   needs a physical iPhone and Dino's hands. Per §6 row 3, expect it to fail; capture what actually
   happens rather than assuming.

---

## 8. Note on test-file collisions

None. 99e9dadb adds `app/api/routines/route.test.ts`, `app/api/log/[entryId]/route.test.ts` changes
and `lib/device.test.ts`. This card adds `app/api/mobility/route.test.ts`, `lib/daily5-sync.test.ts`
and `lib/daily5.test.ts`. Disjoint — no test file is touched by both.
