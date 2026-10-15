# Why the 2026-10-15 release failed its checks, and what this branch is

**Card:** `df31b1df` — "Release failed: Dino Workout Tracker — Next.js + Supabase"
**Ship card:** `b8b24713` (8 changes, requested from the Deployments page)
**Run:** https://github.com/dinof777/vitality-tracker/actions/runs/38745180844
**Diagnosed:** 2026-10-15, from a board-runner worktree with no network.

## What failed

Not a defect in any one change. The eight branches in the release **conflict with each
other** when merged off `main`, in three places:

| Merged branch | Conflicts with | File |
|---|---|---|
| `mc-task-9a245dc4` (exercise images reach SyncroFit) | `mc-task-bc9269dd` (SyncroFit workstream) | `lib/syncrofit-contract.test.ts` |
| `mc-task-cb0f0c75` (tempo acceptance) | `mc-task-bc9269dd` / `mc-task-cfc842fc` | `STATUS.md` |
| `mc-task-2edbf238-…` (Lighthouse/PWA audit) | everything above | `STATUS.md`, `package.json` |

All three are **additive collisions**, not disagreements:

- Two cards independently added an "exercise images" `describe` block to the same contract
  test file, testing the same codec from different angles. Both groups pass against the
  merged `lib/syncrofit.ts` — nothing had to be dropped or rewritten, only placed
  side by side.
- Three cards each appended findings to the `STATUS.md` findings table and each started
  numbering at 11. Rows were kept verbatim and renumbered 11–20.
- Two cards each added an npm script next to `migrate` (`backup`/`restore` and
  `audit:mobile`). The union of the three scripts is kept.

`main` alone is green (tsc, lint, 38 files / 449 tests), which is why this only showed up
when the eight were combined.

## What was verified on the merged tree

Run from the merged worktree, in this order:

```
npx tsc --noEmit      # clean
npm run lint          # ✔ no ESLint warnings or errors
npm run test          # 44 files, 572 passed | 1 todo
```

**`npm run build` could NOT be verified here.** The board-runner worktree has no network
and `app/layout.tsx` pulls Inter from `fonts.googleapis.com`, so the build dies on the font
fetch before compiling anything — a sandbox limit, not a code fault. The build therefore
remains unproven for this combination; Vercel's own build is the first place it is really
exercised.

## What this branch holds

`mc-task-df31b1df` is `origin/main` with all eight release branches merged in the ship
card's order and the three conflicts resolved as described above. Nothing else was changed:
no feature code was touched, only the three conflict hunks.

## Why the fix is not on the eight branches

Resolving each pair on its own branch would make the pipeline's sequential merge clean, and
is the tidier long-run answer — but a board-runner session cannot push anything except its
own card branch, so those commits would never reach GitHub and the next Push would fail
identically. The resolution is therefore carried here, on one branch, and how to land it is
Dino's call (asked on the card).

## Correction and a ninth conflict (same day, later session)

Dino chose (a): ship the reconciled branch as the release. Carrying that out turned up an
error in the paragraph above. `mc-task-df31b1df` was **not** `origin/main` plus the eight —
its merge base with `main` is `c471a0e`, one commit before the release pipeline itself
(`10bea81`, PR #1) landed. So `main` had moved, and the two sides had both edited the same
line of `package.json`:

| side | its edit to the `"migrate"` line's block |
| --- | --- |
| `main` (`10bea81`) | added `typecheck`, `ship:step`, and `tsx` to devDependencies |
| `mc-task-df31b1df` | added `backup`, `restore`, `audit:mobile` |

`scripts/release/build-release.sh` holds a conflicting branch back rather than failing, so
pressing Push with the reconciled branch would have quietly shipped a release **without** it
— the eight would then have collided with each other exactly as before.

This branch is the fix: it is cut from `origin/main` (pipeline included) and carries the
reconciled tree of `mc-task-df31b1df` file-for-file, with `package.json` holding all five
scripts and `tsx`. Because it descends from `origin/main`, the pipeline's merge of it is a
fast-forward with nothing to conflict over, and all eight branches are its ancestors, so
their own merges are the no-ops option (a) assumed.

Still unverified here, same sandbox limits as above: `npx tsc --noEmit`, `npm run lint`,
`npm run test` and `npm run build` could not be run in this worktree. Every tracked file is
byte-identical to `mc-task-df31b1df`, where those three were green; `package.json` is the
only hand-written line in the branch, and the pipeline's `checks` step is the first place
the combination is actually exercised.
