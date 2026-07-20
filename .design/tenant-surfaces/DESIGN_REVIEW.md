# Design Review: Vitality Pro tenant surfaces (/g/<slug>/*)

Reviewed against: repo-root `DESIGN.md` (no `.design/` brief existed)
Philosophy: Live Elevated — lime-on-carbon, mobile-first, calm and instructional
Trigger: "Navigation and flow is super clunky and no consistency"

## Screenshots

Captured in-session via the in-app browser at mobile (375×812) and desktop, and
analysed directly. They are **not persisted to disk** — the available browser tool
returns images to the reviewer but takes no filename parameter (Playwright MCP,
which the skill prefers, isn't installed here).

| View | Breakpoint | What it shows |
| --- | --- | --- |
| `/g/dino-s-workouts` | mobile + desktop | Landing: brand, hero, 2 CTAs, "TODAY · FULL BODY" list |
| `/g/dino-s-workouts/build` | mobile | Generated mode: mode toggle + ~25 stacked controls |
| `/g/dino-s-workouts/build?mode=custom` | mobile | Pick-my-own: empty state + 5 filter groups |

## Summary

The visual language (tokens, colour, type) is consistent and the branding
re-theme works. The failure is **structural**: there is no navigation model, the
landing page still ships Phase-0 placeholder content to real clients, and both
builder modes bury the actual content under a wall of undifferentiated controls.
Dino's read is correct and the causes are specific.

## Must Fix

1. **The gym's public landing shows a FAKE workout.** `app/g/[slug]/page.tsx:17`
   hardcodes `const sample = ['Goblet Squat','Push-Up','KB Swing','Plank',…]` and
   renders it under "TODAY · FULL BODY". These aren't the gym's exercises, aren't
   equipment-scoped, and aren't real. A client reads it as today's session.
   The footer even says "white-label preview (slug)". This is Phase-0 scaffolding
   that shipped. _Fix: render the gym's real saved circuits; if none, show an
   honest empty state — never fabricated content._

2. **No navigation model on tenant pages.** Landing → Build → Library are three
   dead ends joined by ad-hoc back links; the landing has no way onward from the
   workout list. _Fix: one persistent tenant nav (Today · Build · Library) on
   every `/g/<slug>/*` page._

## Should Fix

3. **Control wall before content.** Generated mode stacks 6 focus + 3 length +
   Shuffle + 4 goal + 3 stage + 8 movement ≈ 25 controls; the first exercise is
   far below the fold. Custom mode adds MUSCLE GROUP (19) + EQUIPMENT.
   _Fix: collapse secondary filters behind a "Filters (N)" disclosure. Show
   results immediately; keep focus/length primary._

4. **Actions styled as filters.** "🔀 Shuffle" is a pill identical to the length
   filters beside it, but it's an action, not a state. _Fix: give it button
   affordance, separate from the filter row._

5. **Two exercise-row treatments.** The landing uses plain numbered rows; the
   builder, picker, collections and circuit pages use thumbnail + name +
   prescription. _Fix: one shared `ExerciseRow`._

6. **Inconsistent section labelling.** GOAL/STAGE/MOVEMENT have eyebrow labels;
   focus and length — the most important controls — have none.

## Could Improve

7. Mode toggle cards wrap to 3 lines on mobile ("Pick a focus, we choose").
8. Landing hero consumes the entire first screen before any product surface.

## What Works Well

- The branding re-theme is genuinely convincing — orange reads as *the gym's* app.
- Tokens are used properly; almost no hardcoded colour.
- The empty state in Pick-my-own is friendly and instructive.
- Tag chips are legible and the faceted behaviour is now correct.
