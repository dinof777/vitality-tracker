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

Dino chose (a): ship the reconciled branch as the release. Carrying that out exposed an error
in "What this branch holds" above. `mc-task-df31b1df` was **not** `origin/main` plus the
eight — its merge base with `main` is `c471a0e`, one commit before the release pipeline itself
(`10bea81`, PR #1) landed. `main` had moved, and both sides had edited the same `package.json`
lines just after `"migrate"`:

| side | its edit |
| --- | --- |
| `main` (`10bea81`) | added `typecheck` and `ship:step` scripts, and `tsx` to devDependencies |
| `mc-task-df31b1df` | added `backup`, `restore`, `audit:mobile` |

`scripts/release/build-release.sh` holds a conflicting branch back and still exits 0, so
pressing Push with the branch as it stood would have shipped a release **without** it — and
the eight would then have collided with each other exactly as the first three runs did. A
quiet omission, not a red run.

The fix: `origin/main` is merged into `mc-task-df31b1df` and `package.json` resolved to hold
all five scripts plus `tsx`. The branch now descends from `origin/main`, so the pipeline has
nothing left to conflict over, and all eight branches are its ancestors — `build-release.sh`
counts an ancestor as "already in the release", which is the no-op option (a) assumed. Merge
order no longer matters either way: if one of the eight is merged first it is an ancestor of
this branch, so this branch still merges cleanly afterwards.

Verified on the merged tree in this session: `npx tsc --noEmit` clean, `npm run lint` → "No
ESLint warnings or errors", `npm run test` → 44 files, 572 passed | 1 todo. The tracked tree
is byte-identical to the file edits the local helper had staged for this, apart from this
section.

Still unverified, and it is a third of the pipeline's `checks` step: `npm run build`. It was
attempted here and failed on the Google Fonts fetch for `Inter` in `app/layout.tsx` —
`deny network-outbound fonts.googleapis.com:443`, outbound network refused in this sandbox,
not a code fault. CI, which has network, is the first place the build is really exercised.
