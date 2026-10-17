# The 2026-10-15 18:39Z release: checks failed, and the three checks I can run are green

**Card:** `b5f75738` — "Release failed: Dino Workout Tracker — Next.js + Supabase at Checks"
**Ship card:** `54acede6` (10 changes, pressed on the Deployments page at 18:37Z)
**Run:** https://github.com/dinof777/vitality-tracker/actions/runs/38787106748
**Worked:** 2026-10-15, from a board-runner worktree with no network. Owner on the card is
Cal; there is no `cal-infrastructure-hygiene` subagent reachable from a board-runner
session, so this was worked generically, in Cal's lane (release substrate, "did the fix
actually work?"), not by Cal himself.

This continues `docs/RELEASE_CONFLICTS_2026-10-15.md` (card `df31b1df`), which reconciled
the eight-branch collision and said plainly that `npm run build` was the one third of
`checks` it could not exercise. This run is the first one where that gap is the only
remaining explanation.

## What I did

Rebuilt the release exactly as the pipeline does, from this machine's fetched refs:
`scripts/release/build-release.sh`'s own algorithm, base `origin/main` (`0f1edf8`), the
ship card's 12 branches in the card's order. The resulting tree is `2595a2a`
("Merge mc-task-df31b1df"). The script itself could not be run unmodified — it calls
`git config` in the new worktree and this sandbox refuses to write
`/Users/dinoflora/dev/vitality-tracker/.git/config` — so the merge loop was replayed
with a throwaway identity passed per command. Same merges, same order, same held-back set.

Held back on conflict, exactly as the pipeline would: `mc-task-cdc91c47-…`
(`package.json`), `mc-task-9a245dc4` (`lib/syncrofit-contract.test.ts`),
`mc-task-41a6b996-runner` (`STATUS.md`, `app/api/exercises/[exerciseId]/last/route.ts`),
`mc-task-cb0f0c75` (`STATUS.md`), `mc-task-2edbf238-…` (`STATUS.md`, `package.json`),
`mc-task-df31b1df-90d3-…` (`docs/RELEASE_CONFLICTS_2026-10-15.md`). All but two are
ancestors of `mc-task-df31b1df` and therefore already in the release — see the omission
section below for the two that are not.

## What is green on the real release tree

Run in `2595a2a` with `node_modules` from the main checkout:

| check | result |
|---|---|
| `tsc --noEmit` | clean, no output |
| `next lint` | ✔ No ESLint warnings or errors |
| `vitest run` | 44 files, 572 passed, 1 todo |

Two build-only failure shapes that typecheck, lint and tests cannot see were checked by
hand and are **not** present:

- **Non-handler exports from a `route.ts`** — the exact fault
  `mc-task-41a6b996-runner`'s commit message names ("Next.js route files may only export
  handlers"). Every `export` in every `route.ts` in the merged tree is a method handler or
  a recognised segment-config export.
- **Route collisions from merging independent branches** — no segment holds both
  `page.tsx` and `route.ts`, and no two sibling dynamic segments use different slug names.
- **Case-only import mismatches** (pass on case-insensitive macOS, fail on the Linux
  runner) — every relative and `@/` import in the tracked tree resolves to a tracked path
  with exact case.

## What is still unproven, and why

`npm run build`. Not for lack of trying:

- `next build` here dies fetching Inter from `fonts.googleapis.com` for `app/layout.tsx`
  (`deny network-outbound fonts.googleapis.com:443`), before compiling anything.
- Next.js supports `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` to skip that fetch, which would
  have closed the gap. The command needed an env prefix and the sandbox would not run it
  without approval nobody can give in a board-runner session. Per the blocked-call rule
  that is where it stopped: no sed, no heredoc, no second route to the same change.
- The run log itself needs `api.github.com`, also refused.

So the honest statement of cause: **the three checks I can run on the real release tree are
green, which leaves `npm ci` or `npm run build` as what went red, and I cannot name which
line without the run log.** `package.json` and `package-lock.json` in the merged tree agree
(including `tsx@^4.23.15` and `typecheck`/`ship:step`), which makes `npm ci` the less likely
of the two.

What is NOT the cause, and was considered: a recurrence of the eight-way branch collision
(the conflicts are held back and still exit 0 — a quiet omission, never a red run), and a
missing `typecheck` script (it is on `main`, added by PR #1).

## A second finding: two branches are silently missing from this release

`build-release.sh` holds a conflicting branch back and exits 0, so a release can ship
without a card's work and nothing goes red. Ten of the twelve branches are ancestors of
`2595a2a`. Two are not:

- **`mc-task-41a6b996-runner` — real, unshipped work, but holding it is what Dino asked
  for.** It carries "Restore the Daily 5 streak on the device cookie, not a localStorage
  key" and the `parseDays` route fix, plus `lib/device.ts`, `lib/daily5-sync.ts`,
  `supabase/migrations/0014_device_identity.sql` and `SECURITY.md`. Its merge base predates
  PR #1 (it has no `.github/workflows/ship.yml`), which is why it collides. Card `41a6b996`
  is therefore only one doc deep in this release — its other branch, `-8b5e-…`, adds
  `docs/DAILY5_STREAK_REWORK_ON_DEVICE_ID.md` and nothing else. That is the right outcome
  by accident: Dino answered "a) Hold this card until the device-identity database change
  has a step that assigns your existing workouts to your device" on `41a6b996`, twice
  (2026-10-15 00:05 and 13:50). So no action here; the card itself owns landing that work,
  rebuilt on top of today's `origin/main`, when its migration step exists. What is worth
  keeping is the mechanism: it stayed out because of a `STATUS.md` conflict, not because the
  pipeline honoured the hold, and nothing would have gone red had the opposite been true.
- **`mc-task-df31b1df-90d3-…`** — benign. Only the local helper's staged edits, which
  `docs/RELEASE_CONFLICTS_2026-10-15.md` records as already byte-identical in the tracked
  tree.

## How to re-run this diagnosis

From a session that has network, the single fastest thing is the run log:

```
gh run view 38787106748 --repo dinof777/vitality-tracker --log-failed
```

To reproduce the release tree offline again: `scripts/release/build-release.sh --worktree
<new dir> --branches '<the ship card's branch list>' --report <file> --base origin/main`,
then `tsc --noEmit`, `next lint`, `vitest run` in it.
