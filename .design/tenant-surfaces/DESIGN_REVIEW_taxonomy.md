# Design Review: Governed vocabulary (trainer-extensible fields)

Reviewed against: repo-root `DESIGN.md` (no feature brief exists for this work)
Philosophy: Dark-mode-first, gym-floor optimized — high contrast, fat-thumb tap
targets, "premium native fitness, not a SaaS dashboard"
Date: 2026-07-21

## Surfaces reviewed

- `/dashboard/exercises` — `TermPicker` combobox replacing the free-text muscle
  group input, the "YOUR GYM" custom-tag section, and the near-duplicate
  exercise-name interstitial
- `/admin/taxonomy` — the moderation queue (code review only; requires an admin
  session)

## Screenshots captured

Captured live from the deployed app in a signed-in trainer session at
https://vitality-tracker-mauve.vercel.app/dashboard/exercises:

| State | What it shows |
|---|---|
| Add form, default | New muscle-group picker + "YOUR GYM" tag section in place |
| Muscle group open | Canon list loading from `taxonomy_terms` (Arms → Full Body…) |
| Typed "abs" | "+ Add “abs”" with the promotion explainer beneath |
| After adding "abs" | Folded to **Core** with "We call that “Core”." |
| Name "Goblet Squat" | Fork-prevention interstitial offering the per-gym rename |

> **Limitation, stated plainly:** the browser tooling available here screenshots
> the tab at a fixed size — `resize_window` reported success but every capture
> came back at the same viewport. **The 375/768/1280 responsive breakpoints were
> therefore assessed from code, not from rendered captures.** Someone should eyeball
> the picker on a real phone before this is considered signed off; the dropdown
> overflow behaviour (below) is the specific thing to look at.

## Summary

The behaviour is right and it's verified end-to-end against the live database:
"abs" folded into Core without creating a term, and "Goblet Squat" produced an
alias to "DB Goblet Squat" with **no** duplicate exercise row. The visual
language sits correctly inside the existing form.

The biggest finding was not visual — it was that replacing a plain `<input>` with
a custom combobox quietly removed keyboard and screen-reader access, and that the
tag picker's dropdown didn't actually do anything when you picked an existing
tag. Both are fixed below.

## Must fix — done in this pass

1. **Selecting an existing gym tag did nothing.** `TermPicker` was mounted with
   `onChange={() => {}}` for the tag field, so only *newly created* tags were
   added (via `onTermAdded`). Clicking an existing tag in the dropdown silently
   no-opped — the worst kind of bug, because the control looks like it worked.
   _Fixed:_ added an `onSelect(term)` callback that fires for any pick, plus
   `clearOnSelect` so the field resets to add another.

2. **The combobox was keyboard- and screen-reader-inaccessible.** It rendered as
   a bare `<input>` over a `<div>` of buttons: no arrow-key navigation, no
   Escape, no `role="combobox"`, no `aria-expanded`/`aria-controls`, no
   accessible name (placeholder only). The native `<select>` beside it is fully
   keyboard-operable, so this was a **regression** against the control it
   replaced, and against DESIGN.md's accessibility bar.
   _Fixed:_ `role="combobox"` + `aria-expanded`/`aria-controls`/
   `aria-autocomplete`/`aria-activedescendant`, `role="listbox"`/`role="option"`
   with `aria-selected`, a required `label` prop for the accessible name, and
   ArrowUp/ArrowDown/Enter/Escape handling.

## Should fix — done in this pass

3. **Dropdown used the wrong surface token.** It was `bg-surface`, but DESIGN.md
   §1 defines `surface-raised` (`#25262B`) explicitly for "Elevated / pressed
   surfaces, **popovers**". On carbon black the `shadow-lg` does almost no work,
   so the panel read as flat against the card behind it.
   _Fixed:_ `bg-surface-raised`.

4. **Dropdown rows were below the touch-target minimum.** `px-3 py-2` on
   `text-body` gives ~40px, under the 44px DESIGN.md calls for ("fat-thumb tap
   targets"). _Fixed:_ `min-h-11` (44px) on each option.

5. **Stale library count.** The page said "168-move library" in two places; the
   library is 188. _Fixed:_ both now derive from `SAMPLE_EXERCISES.length` so
   they can't go stale again.

## Should fix — not done, flagged

6. **Dropdown has no flip/collision logic.** It's `absolute … mt-1 max-h-72` and
   always opens downward. The "Add a tag…" picker is the last control in the
   card, so on a short mobile viewport its list will open below the fold and the
   trainer has to scroll blind. This is the item most worth checking on a real
   device. _Suggestion:_ open upward when the field is in the lower third of the
   viewport, or scroll the active option into view on open.

7. **Tag chips are ~24px tall** (`px-2.5 py-1` on `text-caption`), well under the
   44px target. This is the **pre-existing** chip pattern and my new "YOUR GYM"
   chips deliberately match it rather than introducing a second look — but the
   whole row conflicts with DESIGN.md's touch-target rule and should be settled
   system-wide, not per-component.

8. **The other "168" references are still stale** — `app/pro/page.tsx` has four
   ("168 illustrated movements", "Full 168-move library", etc.) on the public
   marketing page. Out of scope for this change but wrong in front of prospects.

## Could improve

9. The promotion explainer ("Shared with everyone once enough gyms add it too")
   is `text-caption` in `text-text-faint` — the faintest token on the smallest
   step. It's the one line that explains the entire governance model to a
   trainer; `text-text-muted` would carry it better.

10. No loading state on the dropdown's first open — it renders "Nothing matches."
    for the moment before `/api/tenant/taxonomy` returns, which reads as an empty
    vocabulary rather than a pending fetch.

## What works well

- **The fold-and-explain interaction is the strongest thing here.** Typing "abs"
  and getting Core back *with* "We call that “Core”." teaches the model in one
  beat without a modal, a warning, or a blocked save. It's the whole governance
  design compressed into one line of feedback.
- **The interstitial argues from the trainer's interest, not the system's** — it
  says renaming "keeps everyone's logged history on one move" rather than "this
  is a duplicate". That's why it's likely to actually get taken.
- Reusing the existing form's tokens, chip shapes and input heights means the new
  controls read as part of the page rather than bolted on; the accent-outlined
  "+ Add" button distinguishes a creating action from the solid-accent primary
  CTA without inventing a new colour.
- `/admin/taxonomy` correctly mirrors `/admin/equipment`'s layout, so the second
  moderation surface needs no new learning.
