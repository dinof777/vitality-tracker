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

## Must Fix — ✅ both fixed

1. ✅ **FIXED — the gym's public landing showed a FAKE workout.** `app/g/[slug]/page.tsx:17`
   hardcodes `const sample = ['Goblet Squat','Push-Up','KB Swing','Plank',…]` and
   renders it under "TODAY · FULL BODY". These aren't the gym's exercises, aren't
   equipment-scoped, and aren't real. A client reads it as today's session.
   The footer even says "white-label preview (slug)". This is Phase-0 scaffolding
   that shipped. _Fix: render the gym's real saved circuits; if none, show an
   honest empty state — never fabricated content._

2. ✅ **FIXED — no navigation model on tenant pages.** Landing → Build → Library are three
   dead ends joined by ad-hoc back links; the landing has no way onward from the
   workout list. _Fix: one persistent tenant nav (Today · Build · Library) on
   every `/g/<slug>/*` page._

## Should Fix — ✅ fixed

3. ✅ **FIXED — control wall before content.** Generated mode stacks 6 focus + 3 length +
   Shuffle + 4 goal + 3 stage + 8 movement ≈ 25 controls; the first exercise is
   far below the fold. Custom mode adds MUSCLE GROUP (19) + EQUIPMENT.
   _Fix: collapse secondary filters behind a "Filters (N)" disclosure. Show
   results immediately; keep focus/length primary._

4. ✅ **FIXED — actions styled as filters.** "🔀 Shuffle" is a pill identical to the length
   filters beside it, but it's an action, not a state. _Fix: give it button
   affordance, separate from the filter row._

5. ✅ **FIXED — two exercise-row treatments.** The landing uses plain numbered rows; the
   builder, picker, collections and circuit pages use thumbnail + name +
   prescription. _Fix: one shared `ExerciseRow`._

6. ✅ **FIXED — inconsistent section labelling.** GOAL/STAGE/MOVEMENT have eyebrow labels;
   focus and length — the most important controls — have none.

## Could Improve — ✅ fixed

7. ✅ Mode toggle cards wrapped to 3 lines on mobile — copy tightened to “✨ For me / ✚ My own”.
8. ✅ Landing hero consumed the whole first screen — headline dropped to h2, copy trimmed, spacing tightened so the workout shows above the fold.

## What Works Well

- The branding re-theme is genuinely convincing — orange reads as *the gym's* app.
- Tokens are used properly; almost no hardcoded colour.
- The empty state in Pick-my-own is friendly and instructive.
- Tag chips are legible and the faceted behaviour is now correct.


---

## Follow-up pass (after the fixes)

All Must/Should/Could items above are now addressed. Additional work in the same pass:

- The builder is no longer a separate implementation — both the personal app and the
  gym builder render the same `BuilderControls` (dial + summary rows + sheets).
- The app is responsive: `.shell` widens from `max-w-md` → `md:max-w-3xl` →
  `lg:max-w-5xl`, and exercise lists grid to 2/3 columns.
- Each generated move has a ↻ to refresh just that slot; the whole-workout action
  is now clearly "Refresh all".
- New clinical focuses — **Physical Therapy** and **Knee** — draw from the tagged
  rehab pool and order the session by recovery stage (early work first).
