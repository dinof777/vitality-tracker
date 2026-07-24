# Design Review: Photoreal marketing imagery (placements A–F)

Reviewed against: `.design/marketing-imagery/DESIGN_BRIEF.md` + `DESIGN.md` §6
"Marketing photography (photoreal lifestyle)"
Reviewer: Ivy (independent — not self-certified by Kevin)
Built by: Kevin, commit `31a5a48`
Live: `https://www.liveelevated.fit/welcome`, `https://www.liveelevated.fit/pro`

## Screenshots Captured

Captured by Kevin against real production data (Ivy did not re-capture; see
tooling note below on why these are treated as representative of final
state despite the background-tab force-settle).

| Screenshot | Placement | Description |
|---|---|---|
| `screenshots/review-welcome-hero-desktop-1280.jpg` | A — Consumer hero split | Kettlebell athlete, phone visible right hand |
| `screenshots/review-welcome-gallery-desktop-1280.jpg` | B — Gallery band | Strength / cardio / mobility 3-up |
| `screenshots/review-welcome-finalcta-desktop-1280.jpg` | D — Final-CTA bookend | Photo not visible in render |
| `screenshots/review-pro-hero-desktop-1280.jpg` | E — Pro hero backdrop | Photo not visible in render |
| `screenshots/review-pro-coachband-desktop-1280.jpg` | F — Pro coach-client band | Trainer + client, phone glowing lime |

I additionally opened the six raw source files directly
(`public/marketing/*.jpg`) to judge grade cohesion and phone-screen
fidelity independent of the scrim/placement question, since two of the six
are otherwise unverifiable in-situ.

## Summary

Four of six placements (A, B, F, and by extension the underlying D/E source
images) are a genuine hit — one cohesive graded shoot, correct phone-screen
fidelity, real diversity across the set, ethics constraint respected. The
defect is narrow but real: **D and E are shipping fully invisible**, not
subtly toned down — Dino's own DOM check (`complete:true`, real
`naturalWidth`, `opacity:1` on the `<img>`) rules out a load failure, so
this is a recipe problem, not a bug. I traced it to two independent causes:
Kevin's D scrim matches the *brief's own placement-snippet* rather than the
*canonical recipe* documented in `DESIGN.md` §6 — those two disagree, and
Kevin correctly built the wrong one, since the snippet reads as the
literal spec. E stacks an `opacity-30` image *underneath* an
already-heavy gradient, which is genuinely two darkening operations
compounding, not one. Both are Ivy-owned recipe defects, not Kevin
build defects — see verdict below.

**Verdict: approved with one required fix pass before this is done.**
A/B/F ship as-is. D/E need the exact value changes below before I sign off.

## Must Fix

1. **Final-CTA bookend (D) renders as zero visible photo, wasting a genuinely strong image.** `components/home/ConsumerMarketing.tsx:302` ships
   `bg-gradient-to-t from-background/95 via-background/70 to-background/40`
   over a source photo (`public/marketing/final-cta-bookend.jpg`) that is
   *already* low-key per the §1 grade — stacking a 40–95%-opacity scrim on
   top of an already-crushed-toward-`#121316` photo leaves nothing to see.
   Confirmed in `screenshots/review-welcome-finalcta-desktop-1280.jpg`
   (solid black, no photo) and independently by opening
   `public/marketing/final-cta-bookend.jpg` directly — it's a strong,
   on-brief image (athlete finishing a set, phone showing a "WORKOUT
   COMPLETE!" screen with a lime sparkline, exactly the "Progressive
   overload, tracked" callback the brief asked for) that is currently
   paying its full page-weight cost for zero payoff.

   **My decision: lighten, don't drop.** This placement's job was always to
   be a real photographic bookend beat (brief §2.D: "same visual language,
   different beat"), not ambient texture — it deserves to register. Also:
   the built value never matched the system recipe in the first place. The
   D-specific snippet I wrote in the brief (§2.D) diverged from the
   canonical "text below/centered" recipe I documented in `DESIGN.md` §6 in
   the same pass — that inconsistency is on me, and Kevin built the wrong
   one because it read as the literal spec for this placement.

   _Fix — replace the scrim at `ConsumerMarketing.tsx:302` with the
   canonical `DESIGN.md` §6 "text below/centered" recipe, verbatim, which is
   already lighter and already approved:_
   ```
   bg-gradient-to-t from-background/90 via-background/40 to-transparent
   ```
   No change to the `<Image>` itself — keep `object-cover object-top`, no
   opacity class. After this ships, grab one follow-up desktop screenshot
   of the Final-CTA section specifically and confirm the headline ("Build
   your first workout — see for yourself.") still reads clearly — the
   headline sits nearer the top of the content stack, which is the end of
   the gradient closest to `to-transparent`, so it gets the least
   protection of the three text lines. I expect it to hold (the source
   photo is dark to begin with) but want it confirmed, not assumed.

2. **Pro hero backdrop (E) renders as zero visible photo — two darkening operations compounding, not one.** `app/pro/page.tsx:107,109` ships
   `opacity-30` on the `<Image>` itself, **then** an additional
   `bg-gradient-to-b from-background/70 via-background/90 to-background`
   overlay on top of that already-dimmed image. At the image's brightest
   point (top edge) that's roughly 30% × (1 − 70%) ≈ 9% of source
   brightness reaching the screen; by the "via" stop it's under 3%; by the
   bottom it's zero. Confirmed in
   `screenshots/review-pro-hero-desktop-1280.jpg` (solid dark canvas, no
   photo) and independently by opening `public/marketing/gallery-strength.jpg`
   directly — a strong image on its own, wasted here.

   **My decision: lighten, but only to a genuine texture level — not to a foreground subject.** Unlike D, this placement's brief intent (§2.E) was
   explicitly "subtle... texture/mood, not a subject competing with
   `PhoneMock` for attention," and that constraint still holds — `PhoneMock`
   is the hero's real product-proof element and must stay the eye's first
   stop. Invisible fails even the "texture" bar; a fully-revealed photo
   would overshoot it and start competing with `PhoneMock` and the
   headline. The fix is a **moderate** reveal, less aggressive than D's:

   _Fix — at `app/pro/page.tsx:107`, raise image opacity:_
   ```
   opacity-30 → opacity-45
   ```
   _and at `app/pro/page.tsx:109`, loosen the scrim:_
   ```
   bg-gradient-to-b from-background/70 via-background/90 to-background
     →
   bg-gradient-to-b from-background/55 via-background/80 to-background
   ```
   Keep the bottom stop fully opaque `background` (unchanged) — that's
   correct as-is, it's what blends the section into the "Built for"
   segment grid below and should stay a clean solid handoff. After this
   ships, grab one follow-up desktop screenshot of the Pro hero
   specifically and confirm the left-column headline ("Your gym's training
   app. Branded as yours.") still holds contrast — same reasoning as D's
   caveat above, and here it matters more because the headline sits at
   the *most*-protected end of this gradient (the `/55` top stop, not
   `/90`), so it's carrying less of a safety margin than before. If it
   reads soft, tighten the top stop back toward `/65` rather than
   reverting the whole change — don't re-invisible the photo to fix
   contrast when there's a middle value available.

## Should Fix

None beyond the two Must-Fix items above — everything else built cleanly
against the brief.

## Could Improve

1. **`pro-coach-client.jpg`'s phone screen reads as abstract lime blocks, not distinct rounded exercise-row cards.** Opened the raw file directly:
   the trainer's phone shows two lime rounded rectangles glowing against a
   dark screen — correct on the non-negotiables (dark background, lime
   accent, no light/white UI, no wrong accent color), but less specific
   than `hero-consumer.jpg`'s screen, which clearly reads as a rounded
   exercise-row list. Not a re-shoot-worthy issue — it still unambiguously
   reads as *this app's* dark+lime UI, just less detailed. No action
   required; flagging for awareness if this image is ever reused at a
   larger scale where the abstraction would be more noticeable.
2. **`final-cta-bookend.jpg`'s phone screen has garbled micro-text** ("TXME," "BALORIE," "&OR" instead of TIME/CALORIES/AVG — an AI-generation
   text artifact). At the phone's rendered scale inside a full-bleed
   21:9-ish banner (roughly 8–10% of frame width in the source), this
   should stay illegible/blurred in production and the image is
   `alt="" aria-hidden` regardless — but now that Must-Fix #1 makes this
   image actually visible, worth a glance at the shipped screenshot to
   confirm the garbled labels don't read as a jarring detail up close.

## What Works Well

- **The five verified images cohere as one shoot.** Low-key lighting
  crushing toward `#121316`, warm-on-cool skin-tone grade, subtle grain,
  and — critically — the lime pop lands consistently and deliberately
  across the set: phone glow in A, D, F; a wristband in B/cardio; floor
  tape in B/cardio and B/mobility; shoe accents in B/strength. This is
  exactly the "one color that means Live Elevated" job the brief called
  for, not six unrelated stock photos.
- **Mid-movement, not posed-and-smiling.** Every image (kettlebell rerack,
  battle-rope strike, floor stretch, coaching handoff) is caught
  mid-action, matching "Built by training, not by marketing" register the
  product's own copy uses.
- **Diversity across the set is real, not a single "diverse" hero token.**
  Age, gender, and ethnicity spread genuinely across the six images
  (Black woman/hero, white man/strength, Asian man/cardio, older Latina
  woman/mobility, South-Asian woman/final-CTA, Middle Eastern man +
  white woman/coach-client) — matches the brief's "the set does, not any
  one image" instruction.
- **Phone-screen fidelity on A is excellent.** `hero-consumer.jpg`'s screen
  unmistakably reads as this app — dark background, rounded exercise-row
  cards, lime primary action — the strongest of the three "app-on-screen"
  shots.
- **Social-proof section is untouched and photo-free**, exactly as the
  ethics constraint requires (`ConsumerMarketing.tsx:238–272`) — no photo
  in, above, or adjacent to it, section order preserved (product proof →
  people proof → ask), copy unchanged ("the reviews are still being
  written"). This is the load-bearing constraint on the whole brief and
  it's clean.
- **Implementation notes followed precisely**: `next/image` used
  throughout (not the app's usual plain `<img>`), `priority` scoped to
  exactly the Consumer hero (A) and nowhere else, `sizes` tuned per
  placement matching the brief's snippets exactly, alt text matches the
  brief's copy verbatim including `alt="" aria-hidden` on the two
  decorative full-bleed placements (D, E — pre-fix and post-fix, since
  neither changes alt/aria treatment), explicit `aspect-[…]` containers on
  A/B preventing CLS. No drift from spec on any of these.
- **Mobile behavior is correct by code inspection** (not independently
  screenshotted — see tooling note): A's `Reveal` wrapping the image sits
  after the text `motion.div` in DOM order, so it trails the CTA on
  mobile per brief; B's grid has no `grid-cols` override below `sm:`, so
  it's genuinely 1-column on mobile, not just visually cramped 3-up; D/E/F
  are `fill` + `object-cover` inside content-sized (not aspect-locked)
  containers, which is the structurally correct pattern for full-bleed
  bands that should crop taller on narrow viewports without introducing
  CLS.

## Tooling notes carried into this review

- Screenshots were captured with a JS opacity-force to defeat
  background-tab `requestAnimationFrame` throttling on Framer Motion
  entrance animations. Per Dino's brief, I did not treat any dimmed/partial
  contrast in the captures as a defect on that basis — the D/E invisibility
  finding is corroborated independently by opening the raw source files
  and by the DOM checks Dino already ran (`complete:true`, real
  `naturalWidth`, `opacity:1`), not by anything the force-settle would
  have introduced.
- Desktop-only captures (mobile viewport can't be forced by the available
  browser tooling). Mobile reasoning above is code-based, flagged as such.
