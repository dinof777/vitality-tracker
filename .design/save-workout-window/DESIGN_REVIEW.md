# Design Review: "Save workout" window (StartSheet)

Reviewed against: `DESIGN.md` §6 (Selection state, Primary/Ghost button,
Workout style control's list-row + second-tier recipes, Marketing... n/a),
§9 (Print artifacts), §5 (Touch targets) — no prior `.design/` brief existed
for this feature; Kevin built it solo from Dino's conversational brief, so
this review is also the first written record of the intended IA.
Reviewer: Ivy (independent — not self-certified by Kevin)
Built by: Kevin, commit `9079057`
Live: `https://liveelevated.fit` (Start Workout → Build my workout sheet)

## Screenshots reviewed

| Screenshot | State | Description |
|---|---|---|
| `02-window-consumer.png` | Consumer, window open | 3 options (Log in app / Send to app / Create PDF) + image toggle |
| `04-print-preview.png` | Print/PDF | Light "paper" export layout |
| `05-after-escape.png` | Keyboard close | Escape closes window only, sheet + focus intact |

Plus the built source: `components/workout/StartSheet.tsx`, the print rule
added to `app/globals.css`, and the two reused gym-only children
(`SaveCircuitBox.tsx`, `ShareWorkoutButton.tsx`). The gym 5-option state
(Save circuit / Copy link visible) was **not** screenshot-verified — no
local trainer session — reviewed via code path only; flagged below.

## Verdict

**Approved to ship as-is on the consumer path** (what's screenshot-verified
is solid); **two should-fix items** for a fast follow-up pass, plus one
polish-level copy trim. Nothing here blocks — the core consolidation (one
`SAVE WORKOUT` button replacing two competing CTAs) is the right call and
is executed cleanly against the design system.

## Ruling: does the persistent caption satisfy "mouseover"?

**Yes — ship the caption, do not also add a floating hover tooltip.**

Reasoning:
- DESIGN.md has **no existing floating-tooltip pattern anywhere in the
  file** — Kevin's caption instead reuses the *exact* title+hint-line
  recipe already documented for `WorkoutStyleControl`'s full-width list row
  (§6: `text-body font-semibold` title / `text-caption text-muted` hint),
  which exists specifically to carry a "what does this option mean"
  explanation. That's precedent, not improvisation.
- The app's own framing is explicit: "Dark-mode first, **gym-floor
  optimized**." A phone on a gym floor has no hover state at all — a
  hover-only tooltip would be invisible to the primary usage context and
  only reachable on the minority desktop/front-desk case.
- A floating tooltip anchored inside a `fixed`, bottom-anchored,
  `max-h-[90dvh]` scrollable sheet is a real overflow/clipping risk near
  the viewport edges — Kevin's stated reasoning for avoiding it is correct,
  not just convenient.
- Adding a redundant desktop-only tooltip on top of a caption that already
  states the same information would duplicate content for zero net gain
  in comprehension, at the cost of a first-of-its-kind component this
  codebase doesn't otherwise have.

Dino's word was "mouseover," but the intent behind it — explain each
option before committing to a tap — is fully satisfied by an
always-visible explanation that works on every device his users are
actually on. Close the loop with Dino that this was a deliberate
substitution, not a missed requirement, but don't build the tooltip.

## Should-fix (confirmed, concrete)

1. **Focus never actually moves into the panel on open — dead ref.**
   `StartSheet.tsx:99` declares `firstOptionRef` and `:145` calls
   `firstOptionRef.current?.focus()` when `menuOpen` becomes true, but no
   element in the file is ever given `ref={firstOptionRef}` — grep confirms
   it's assigned nowhere. The comment above it ("Move focus into the window
   when it opens...") states an intent the code doesn't deliver; `.current`
   is always `null`, so the call is a silent no-op. Not a blocker — DOM
   order still puts the first option (`Log in the app`) as the very next
   Tab stop after the trigger, and the *closing* half of this effect
   (`menuTriggerRef`) is correctly wired and confirmed working in
   `05-after-escape.png`. Fix: thread a `ref` prop through `SaveOption` and
   attach it to the "Log in the app" button, or delete the dead
   `firstOptionRef` state + comment if natural tab order is the actual
   intended behavior.

2. **"Send exercise images" toggle reads as a 4th sibling option, not a
   sub-control of "Send to app."** It's visually identical chrome to the
   real `SaveOption` rows (`rounded-md border-border bg-surface p-3`,
   same left edge, same `space-y`-adjacent rhythm) with nothing —no indent,
   no background step-down— marking it as belonging to the row above.
   DESIGN.md already has the right answer for this exact situation and
   Kevin didn't reach for it: `WorkoutStyleControl`'s second-tier config
   gets distinct `bg-surface-raised/50` chrome specifically so it reads as
   "nested under the selection above" (§6), and `SaveOption`'s own
   `expandable`/`children` mechanism *already* wraps nested content in
   `pl-1 pt-1` for the same reason — visible correctly in the gym-only
   Save-circuit/Copy-link rows, just not applied to this hand-rolled path.
   Fix: route the modifier + status line through the same `pl-1` indent (or
   drop it a shade to `bg-background`, matching how `SaveCircuitBox`/
   `ShareWorkoutButton` already present themselves as nested children) so
   it visually reads as "belongs to Send to app," not option 4 of what
   currently looks like a flat list.

## Polish

3. **Copy redundancy on expand.** The "Save circuit" caption ("Save this
   workout to your gym's library to reuse it.") and `SaveCircuitBox`'s own
   inline paragraph ("Save this workout to your library to reuse it") land
   one line apart and say almost the identical sentence twice. Trim
   `SaveCircuitBox.tsx:56`'s copy to something that earns its place now
   that the caption above already carries the "why" — e.g. "Name it, then
   save to your library."

4. **"Send to app" genericizes a named integration.** The label used to be
   the explicit `SEND TO SYNCROFIT`; it's now generic "Send to app" with
   "SyncroFit" appearing only in the caption a beat later. The
   generic-label + specific-caption shape is consistent across all five
   rows (defensible, not an error), but SyncroFit is a recognizable named
   partner for returning users — consider "Send to SyncroFit" as the label
   itself so recognition doesn't cost an extra read. Judgment call, not a
   defect — leaving as-is is acceptable if Kevin/Dino prefer the
   consistent generic-label pattern.

## Flag for the unverified gym state (not blocking, verify before full confidence)

`gymUser` resolves from `GET /api/tenant/clients` **after mount**, so for a
trainer/gym account the Save-circuit and Copy-link rows will pop in below
the fold a beat after the window opens rather than being present at first
paint. This is very likely fine (the fetch is already used elsewhere by
`ShareWorkoutButton` with the same timing), but it's the one path that
hasn't been seen with real eyes — grab one screenshot of a trainer session
opening the window to confirm the pop-in doesn't read as a layout jump,
and confirm the two gym-only rows get the same visual weight/spacing as
the three consumer rows above them (code path suggests yes — `space-y-2`
applies uniformly — but worth eyes-on).

## What's working well (no action needed)

- Single `SAVE WORKOUT` primary button (h-14, `bg-accent`) correctly
  replaces the old two-competing-CTA layout — matches the Primary button
  recipe verbatim and removes a real decision-paralysis moment.
- Option ordering (Log in app → Send to app → Create PDF → gym-only) puts
  the most likely consumer action first without over-elevating it above
  the new consolidated action — sound, unforced hierarchy call.
- `▾`/`▴` chevron on the trigger and `▸`/`▾` on each disclosure row are a
  consistent, already-established affordance language.
- Print/PDF export (`04-print-preview.png`) correctly uses the literal
  paper/ink hex tokens from §9 rather than the app's dark CSS vars — no
  light-on-dark invisible-text bug, clean one-page layout, brand footer
  present.
- `sm:hover:` is scoped to desktop only on the option rows — no sticky
  hover state on touch, a real (if small) accessibility win.
- Gym gating reuses the existing `/api/tenant/clients` 403/200 probe
  instead of inventing a new endpoint — minimal footprint, consistent with
  `ShareWorkoutButton`'s existing pattern.
