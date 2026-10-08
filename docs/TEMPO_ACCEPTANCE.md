# Tempo tracking — notation spec and acceptance audit

MC card `cb0f0c75` · owner Theo (JS/TS test engineer) · audited 2026-10-08

Tempo tracking is the first of the four headline features in the project
objective, and the logger UI was marked Done without anywhere stating what a
tempo value is *supposed* to look like. This document is that statement, plus an
audit of the code against it. The executable half lives in
`lib/tempo-acceptance.test.ts` (19 assertions, 2 `it.todo` gaps).

## 1. The notation, as the code currently defines it

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

**Unconfirmed, and the one thing on this card only Dino can settle:** whether
Brian Pruett writes tempo as **three** digits or **four** (`3-1-2-0`, adding a
pause at the top / lockout). Every other claim above is verified from the code;
this one is verified from nothing. It is on the card as an open question. If the
answer is four digits, the fix touches `TEMPO_PRESETS`, `TEMPO_INFO`, the
schema comment, `INTENSITY_CHOICES`, the `repSec` sums, and the regex in the
test file — hence asking rather than guessing.

## 2. Acceptance matrix

| # | Subtask | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Document the exact notation | **Partial** | §1 above. 3-vs-4-digit question open with Dino. |
| 2 | Audit the tempo badge UI | **Pass, with one defect** | §3 |
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

**Defect — the Custom input accepts anything (`SetLogRow.tsx:160-169`).**
It is an unvalidated `<input type="text">`; whatever is typed is handed to
`onLogSet` verbatim and persisted. `banana` is a loggable tempo. Worse, the
placeholder reads `e.g. 2-1-X`, which is *not* the notation this app documents —
`X` (explosive) is borrowed from a different convention and would break any
later attempt to compute time-under-tension from stored tempo. Two choices, both
legitimate, and the call is a methodology one rather than a code one: either
validate to `/^\d-\d-\d$/` and fix the placeholder, or deliberately adopt `X`
and document it as a fourth legal phase value. Not fixed here — this card is an
acceptance audit and the file is production UI (Kevin's lane once the shape is
decided).

**Minor, same area:** timed sets log `tempo: ''`. `ExerciseCard`'s prefill is
`prefill?.tempo ?? '3-1-1'`, and `??` does not catch an empty string — so an
exercise whose last logged set came from timed mode opens the next strength set
in Custom mode with an empty box instead of the `3-1-1` pill. Low impact
(requires the same exercise to be logged in both modes) and cosmetic, but it is
a real `??`-vs-falsy bug, not a style preference.

## 4. Storage audit — `supabase/schema.sql`, `app/api/log/route.ts`

| Column | Type | Verdict |
| --- | --- | --- |
| `log_entries.tempo` | `text`, nullable | Correct type. Notation is a string, not a number; `text` is right and matches `default_reps`' handling of ranges like `"8-12"`. |
| `routine_exercises.default_tempo` | `text`, nullable | Correct — the pre-programmed prescription. |

`POST /api/log` inserts `tempo` into the parameterised insert alongside the rest
of the set (`route.ts:52-58`), and `GET /api/exercises/[exerciseId]/last`
selects `weight, reps, tempo` ordered by `created_at desc limit 1` — so the
write and the pre-fill read are both real, not stubbed.

What the schema deliberately does **not** have is a `CHECK` constraint on tempo
shape, unlike `set_type` (which does have one). That is the storage-side half of
the defect in §3: nothing between the free-text input and the row rejects
garbage. Adding a `CHECK` is a migration against a table with live rows, so it
is a separate, guarded piece of work and not something to slip into an audit.

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

## 6. What this audit did not do

- Did not edit any production file. The two defects above are reported with
  file and line, not patched; the methodology call in §3 is Dino's and the
  migration in §4 is guarded work.
- Did not run the app or hit a live database. The board-runner worktree has no
  network, so every claim here is read from committed code or from the test
  suite, and the in-gym round-trip (subtask 5) stays open.
- Did not assume Pruett's notation. See §1.
