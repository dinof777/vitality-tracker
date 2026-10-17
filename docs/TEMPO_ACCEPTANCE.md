# Tempo tracking — notation spec and acceptance audit

MC card `cb0f0c75` · owner Theo (JS/TS test engineer) · audited 2026-10-08 ·
notation confirmed and enforced 2026-10-10

Tempo tracking is the first of the four headline features in the project
objective, and the logger UI was marked Done without anywhere stating what a
tempo value is *supposed* to look like. This document is that statement, plus an
audit of the code against it. The executable half lives in
`lib/tempo-acceptance.test.ts` (38 assertions, 1 `it.todo` gap — §5).

## 1. The notation — settled

Three digits, hyphen-separated, **eccentric – pause – concentric**, each digit a
whole number of seconds:

```text
3-1-1  =  3s lowering  ·  1s pause at the bottom  ·  1s lifting
```

Sources in the repo that agree on this:

| Where | What it says |
| --- | --- |
| `lib/workout-types.ts` → `TEMPO_INFO` | "seconds per phase (eccentric–pause–concentric)" |
| `lib/workout-types.ts` → `TEMPO_PRESETS` | `2-0-1`, `3-0-1`, `3-1-1`, `4-0-1` |
| `supabase/schema.sql:255` | "`default_tempo` is text in eccentric-pause-concentric form like `3-1-1`" |
| `lib/profile.ts` → `INTENSITY_CHOICES` | light `2-0-1`, moderate `3-1-1`, intense `3-1-1` |

Every preset is eccentric-loaded (lowering ≥ lifting), which matches the
Vitality emphasis on controlled negatives. That property is now asserted, so a
preset like `1-0-3` cannot be added without the suite objecting.

**Confirmed by Dino on card `cb0f0c75`, 2026-10-08 (answer "a"):** three digits
is right, and the Custom box must reject anything that isn't three digits. Four-
digit notation (`3-1-2-0`, with a pause at the top) and the `X`-for-explosive
convention are both **out** — deliberately, not by omission.

The shape is now written down in production rather than only in prose:

```ts
// lib/workout-types.ts
export const TEMPO_PATTERN = /^\d-\d-\d$/;
export function isValidTempo(tempo: string): boolean;        // strength sets
export function isStorableTempo(tempo: string | null): boolean; // adds '' / null
```

One judgment call inside the decision: `TEMPO_PATTERN` allows single digits
only, so `10-1-1` is rejected along with `banana`. That follows the wording of
the answer ("three digits") and every preset and prescription in the repo. A
two-digit eccentric would be a notation change, i.e. another decision, not a bug
to fix quietly — widening the regex is a one-line change in one file if Dino
ever wants it, and the suite would fail loudly first.

## 2. Acceptance matrix

| # | Subtask | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Document the exact notation | **Pass** | §1 — three digits, confirmed by Dino and enforced in code. |
| 2 | Audit the tempo badge UI | **Pass — the defect is fixed** | §3 |
| 3 | Tempo stored in `log_entries` with correct type | **Pass** | §4 |
| 4 | Tempo surfaces in the sparkline / detail view | **FAIL** | §5 |
| 5 | Real in-gym round-trip test | **Not run** | Needs a phone, the live deployment and a gym; the board-runner worktree has no network. Dino's step. |

## 3. Badge UI audit — `components/workout/SetLogRow.tsx`

Correct:

- Four preset pills render straight from `TEMPO_PRESETS`; selection state is
  exclusive with the Custom button (`!customTempo && tempo === t`).
- `TEMPO_INFO` is wired to both the row and each pill as a `title`, so the
  notation is explained on tap/hover rather than assumed.
- Tempo and set-type are correctly hidden for timed modes (holds, cardio,
  carries) — `{!timed && …}` — where a lowering/lifting tempo is meaningless.
- Opening on a non-preset prior value correctly starts in Custom mode
  (`useState(!TEMPO_PRESETS.includes(defaultTempo as never))`).

**Defect (found 2026-10-08, fixed 2026-10-10) — the Custom input accepted
anything.** It was an unvalidated `<input type="text">` handed straight to
`onLogSet`: `banana` was a loggable tempo, and the placeholder read `e.g. 2-1-X`,
teaching a notation the app does not use. Now:

- the placeholder is `TEMPO_PLACEHOLDER` (`3-1-1`), so the one example on screen
  is the documented notation and is itself a preset (asserted);
- the input is capped at 5 characters, has autocorrect/autocapitalize off, and
  carries `aria-invalid` plus an `aria-describedby` hint while invalid;
- **LOG SET is disabled** until the tempo is valid (`canLogSet(reps) && tempoOk`),
  with a `role="alert"` line reading "Tempo is three digits — eccentric-pause-
  concentric, e.g. 3-1-1". Disabling the action was chosen over silently
  coercing the value or over a toast on submit: coercion would log a set the
  user didn't describe, and a toast arrives after the mistake is in the row.
  It reuses the existing disabled affordance from `canLogSet`, so nothing new
  had to be designed.

Timed modes are untouched — the whole tempo block is already behind `{!timed}`,
and `tempoOk` is hard-wired `true` there, so holds and carries still log with no
tempo and the LOG SET button cannot be gated by a field that isn't on screen.

**Minor, same area (fixed 2026-10-10):** timed sets log `tempo: ''`, and
`ExerciseCard`'s prefill was `prefill?.tempo ?? '3-1-1'` — `??` does not catch an
empty string, so an exercise last logged in timed mode opened the next strength
set in Custom mode with an empty box. It now falls back through `isValidTempo`
rather than through `??`/`||`, which also covers a legacy row holding `banana`
from before the validator existed: the pill row opens on `3-1-1` instead of
re-offering the bad value for editing.

## 4. Storage audit — `supabase/schema.sql`, `app/api/log/route.ts`

| Column | Type | Verdict |
| --- | --- | --- |
| `log_entries.tempo` | `text`, nullable | Correct type. Notation is a string, not a number; `text` is right and matches `default_reps`' handling of ranges like `"8-12"`. |
| `routine_exercises.default_tempo` | `text`, nullable | Correct — the pre-programmed prescription. |

`POST /api/log` inserts `tempo` into the parameterised insert alongside the rest
of the set (`route.ts:52-58`), and `GET /api/exercises/[exerciseId]/last`
selects `weight, reps, tempo` ordered by `created_at desc limit 1` — so the
write and the pre-fill read are both real, not stubbed.

`POST /api/log` now **rejects a malformed tempo with a 400** before the insert
(`isStorableTempo`), so the rule is enforced on the server and not only in the
component — a stale PWA cached on the Home Screen, or a hand-rolled request,
can't write a tempo no reader can parse. `''` and `null` stay legal: they mean
"no tempo", which is exactly what a timed set logs.

What the schema still does **not** have is a `CHECK` constraint on tempo shape,
unlike `set_type` (which does have one). That remains deliberate: a `CHECK` is a
migration against a table with live rows that may already contain pre-validator
garbage, so it needs a look at the existing values first and Dino's go-ahead —
guarded work, not an audit side-effect. The route guard is the cheap 95% of it
and needs no migration.

## 5. The real gap — logged tempo is invisible after the session

Subtask 4 does not pass, and this is the finding worth the card.

- `GET /api/overload/[exerciseId]` selects `max(weight)` grouped by day and
  nothing else. `OverloadSparkline` plots those numbers. No tempo anywhere.
- `ExerciseDetailSheet` *does* show a tempo — `3 sets × 10 reps @ 3-1-1` — but
  that string comes from `workoutParams(loadProfile())`, i.e. it is the
  **recommendation for the current intensity setting**, not what was actually
  logged. It will read `3-1-1` for an exercise you have only ever logged at
  `4-0-1`. That is arguably worse than showing nothing: it looks like history.
- Logged tempo renders in exactly one place — the completed-set list inside the
  live `ExerciseCard` (`ExerciseCard.tsx:157`) — which disappears when the
  workout ends.

Consequence against the card's own stated purpose: a coach reviewing whether
tempo was honoured cannot do it in the app. The data is in `log_entries`; no
read path surfaces it.

Smallest honest fix, for whoever takes it: add `tempo` to the
`/api/overload/[exerciseId]` projection (e.g. the modal tempo per day, or the
tempo of the heaviest set) and render it next to `LAST — 185 lb` in
`OverloadSparkline`. That is one SQL column and one span, and it turns subtask 4
from unverifiable into a one-glance check. The alternative — a full per-set
history sheet — is a feature, not a fix, and should be its own card if Dino
wants it.

## 6. What this work did not do

- **Did not fix §5.** Surfacing logged tempo in the overload view is a new piece
  of read path and a visible UI change; it wants its own card and a screenshot
  from a preview, which a no-network worktree cannot produce. The §5 defect note
  stands, and gap #2 stays a named `it.todo` so it shows in every test run.
- **Did not add the `CHECK` constraint.** See §4 — migration against live rows.
- **Did not validate `routine_exercises.default_tempo`.** The routine builder
  writes `default_tempo` through a different route and was outside this card's
  question (which was about the logger's Custom box). It currently takes
  whatever the builder sends; `isStorableTempo` is exported and ready for it.
- **Did not run the app, hit a database, or capture a screenshot.** The
  board-runner worktree has no network, so every claim here is read from
  committed code, `tsc --noEmit`, `next lint` or the test suite. The validation
  change is visible in the logger, so it has not been seen rendered — that is
  part of what subtask 5 (the in-gym round-trip) will show.
