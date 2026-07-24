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

---

## Round 2 — corrected imagery (2026-07-23)

Reviewed against: this file's Must-Fix #1/#2 above, `DESIGN_BRIEF.md` §6
(HANDOFF band, remote-delivery correction), `DESIGN.md` §6.
Built by: Kevin, commit `caf7c50`. Live: `/pro`, `/welcome`.

### Screenshots reviewed

| Screenshot | Placement |
|---|---|
| `screenshots/review2-pro-handoff-desktop-1280.jpg` | §6 HANDOFF 3-up (F replacement) |
| `screenshots/review2-pro-hero-desktop-1280.jpg` | E — Pro hero backdrop, post-fix |
| `screenshots/review2-welcome-finalcta-desktop-1280.jpg` | D — Final-CTA bookend, post-fix |

Also opened raw sources directly: `public/marketing/gallery-strength.jpg`,
`public/marketing/final-cta-bookend.jpg`, `public/marketing/pro-build-send.jpg`.
Read the built code at `app/pro/page.tsx:74-96,107,109,184-208` and
`components/home/ConsumerMarketing.tsx:238-272,290-303`.

### §6 HANDOFF band — verified against spec, no findings

`screenshots/review2-pro-handoff-desktop-1280.jpg` matches §6 exactly:
eyebrow "THE HANDOFF" in accent lime, heading "You build it. They train
wherever they are.", three `aspect-[4/5]` tiles in `sm:grid-cols-3` with
numbered lime badges (`1`/`2`/`3`) chip-overlaid top-left, title + caption
below each image (not overlaid — correctly "no scrim" per the gallery-tile
rule), `gap-6` breathing room. Copy matches §6.3 verbatim (checked against
`HOW_IT_WORKS` at `app/pro/page.tsx:74-96`). Alt text matches §6.4 verbatim,
character for character.

**Remote-delivery story check (the whole reason this band exists):** all
three images correctly show a person alone with a phone/laptop — no coach
in frame, no second person in any of the three tiles. `pro-build-send.jpg`
is a woman alone at a laptop+phone; `pro-qr-scan.jpg` is a man alone
scanning a QR poster at a glass entrance; `pro-train-remote.jpg` is a woman
alone in a home gym with a phone propped on a stand. Nowhere in this band,
or elsewhere in the round-2 diff, does anything imply in-person coaching —
the correction holds.

**Social-proof section:** re-checked `ConsumerMarketing.tsx:238-272` —
`TESTIMONIALS` is still a hardcoded empty array (`const TESTIMONIALS: {...}[] = []`,
line 62), so the section always renders the photo-free "reviews are still
being written" empty state. Untouched by this round, still clean.

**QC note carried forward, confirmed not a blocker:** opened
`pro-build-send.jpg` at full raw resolution — the phone screen does show a
send-confirmation string that's legible-ish at 1856×2304 ("Sent to Ch...
Mala" or similar). At the tile's actual rendered scale (~33vw inside a
`max-w-5xl` container, i.e. a few hundred px, with the phone itself maybe
80–100px within that) this is well below the resolution needed to read as
a name. No re-generation warranted — matches §6.6's own prediction.

### D — Final-CTA bookend: RULING — `object-top` → `object-center`

Confirmed your diagnosis by opening `final-cta-bookend.jpg` directly: it's
a 3168×1344 (21:9) frame where the subject's lit face sits around 15–20%
down the image and the lime-glowing "WORKOUT COMPLETE!" phone screen — the
single most important beat in this photo, the exact "Progressive overload,
tracked" callback the brief exists to make — sits around 45–55% down,
i.e. genuinely at vertical center. `object-top` crops to source 0%–~40%,
which keeps the face's very top edge but crops the phone out entirely. This
is an `object-position` defect, not a scrim defect, exactly as diagnosed.

**Decision: `object-cover object-top` → `object-cover object-center` at
`components/home/ConsumerMarketing.tsx:300`.** Centers the crop on the
photo's actual payoff (the phone). No change to the scrim — the D scrim
fix from Round 1 (`from-background/90 via-background/40 to-transparent`)
already matches the canonical `DESIGN.md` §6 recipe and isn't what's wrong
this round.

**Contrast check, done, not assumed:** with `object-center`, the visible
crop window runs roughly source-y 19%–81%. Mapping the section's content
stack onto that window: the headline ("Build your first workout — see for
yourself.") lands in the *upper-middle* of the window — background/torso
territory, not the face or the phone glow — because the gradient's
`to-transparent` end (least protection) sits at the top of the section,
and the headline isn't quite at the very top of the content block. The
body copy line lands closer to where the phone glow itself is, but that
row carries `text-text-muted` (deliberately lower-priority, smaller,
lighter weight already) and the gradient at that vertical position is
close to its `via-background/40` stop — 60% of the glow shows through,
which reads as color/mood behind secondary copy, not an illegibility risk.
The button is unaffected regardless (opaque `bg-accent`, never depends on
the scrim). Net: I expect this to hold, but the row most worth a literal
eyeball is the **body copy line**, not just the headline as originally
flagged — flagging that specifically for the follow-up screenshot.

**Fallback, pre-decided so this doesn't bounce back a third time:** if the
follow-up screenshot shows the body copy fighting the lime glow, don't
revert to `object-top` (that re-hides the phone, the whole point of this
fix) — go to `object-[center_70%]` instead. That biases the crop window
lower, sliding the phone-glow region down toward the button's solid-opaque
zone (immune to any of this) and out from behind the body copy.

**Documentation follow-up (flagging, not fixing myself):** `DESIGN.md` §6
line ~577 currently documents `object-cover object-top` as the shared
canonical crop for *both* the Final-CTA bookend and the Pro hero backdrop.
After this ruling, that line is only accurate for a photo that needs a
mobile-taller top-anchored crop — D no longer uses `object-top`. Needs a
one-line correction once Kevin ships this (specify D uses `object-center`,
distinct from any future top-anchored full-bleed band) — Kevin's edit, not
mine.

### E — Pro hero backdrop: RULING — needs another nudge; restructure, don't just re-tune

**Screenshot reliability flag first, because it changes how much weight I
put on the image:** `review2-pro-hero-desktop-1280.jpg` reads as uniformly
washed/grey across the *entire* capture — not just the backdrop image, but
the headline text, the `PhoneMock`, and the "Personal trainers" card below
the fold all look desaturated and low-contrast compared to
`review2-pro-handoff-desktop-1280.jpg`'s crisp, fully-saturated lime badges
captured in the same pass. That pattern matches the background-tab
animation-freeze artifact the brief explicitly called out for the
final-CTA screenshot — it just wasn't flagged for this one. I'm treating
this screenshot as **not reliable evidence on its own** for judging E;
using it only as a rough "does anything register at all" check (answer:
no), not as a precise contrast read.

Falling back to code math + the raw source, which I did open
(`public/marketing/gallery-strength.jpg`) — and it's a well-exposed,
fairly bright image (lit face, visible weight plates and rack, real
midtones — not crushed near-black the way `final-cta-bookend.jpg` is). At
the currently-shipped values (`opacity-45` on the image, then
`bg-gradient-to-b from-background/55 via-background/80 to-background` on
top), the compounding math works out to roughly **20% of source brightness
at the very top edge of the section, collapsing to near-zero by the `via`
stop** — a real, if smaller, version of the exact "two darkening
operations stacking" defect Round 1's Must-Fix #2 diagnosed in the first
place. Round 1 lightened both numbers in tandem but didn't remove the
structural double-operation, so the same failure mode survives at reduced
severity. Given a well-lit source image still reads as flat/invisible at
that math, I'm confident this needs another nudge — and confident enough
in the root cause that I'm fixing the structure this time, not just
re-tuning two interacting knobs a second time.

**Decision: drop the image-level opacity class entirely; do all the
darkening in one place — the gradient.** This also brings E in line with
how D already works (D never had an opacity class on its `<Image>`, only a
scrim — that's the more legible pattern of the two, and it's the one that
survived Round 1 review cleanly).

_Fix — at `app/pro/page.tsx`, on the background `<Image>`:_
```
className="object-cover opacity-45"  →  className="object-cover"
```
_and on the scrim div directly below it:_
```
bg-gradient-to-b from-background/55 via-background/80 to-background
  →
bg-gradient-to-b from-background/70 via-background/90 to-background
```
Bottom stop stays fully opaque `background`, unchanged — correct as the
clean handoff into the `BUILT FOR` segment grid below. This single-operation
recipe puts roughly 30% of source brightness at the top edge (up from the
~20% compounded before, and now easy to re-tune with one knob instead of
two if it still needs adjustment) and keeps the `via`/bottom zone — where
`PhoneMock` and the bulk of the headline actually sit — at 90%+ opacity,
respecting the brief's "texture, not a subject competing with `PhoneMock`"
constraint (§2.E) more precisely than the old two-operation version did,
because there's only one dial to reason about.

**Verification requirement — and it needs a clean capture, not this
review's:** grab one follow-up desktop screenshot of the Pro hero *without*
the background-tab force-settle artifact (foreground the tab, or capture
via a method that doesn't need the JS opacity-force workaround) and confirm
two things: (1) the top-of-hero texture is now visibly present, not flat —
if it still isn't, the compounding is gone but the absolute values are
still too conservative, and the next move is raising both gradient stops'
transparency by ~10 points each, not re-adding an opacity class; (2) the
headline ("Your gym's training app. Branded as yours.") and `PhoneMock`
still read at full, undegraded contrast — I expect this to hold given the
`via`/`to` stops are barely changed from Round 1's already-approved values,
but it's the one I'm least able to confirm from tooling this round, so
don't skip it.

### Verdict

**Approved with one required fix pass, same as Round 1 — F/HANDOFF ships
clean, D and E need the exact changes above before this is closed out.**

- **Must Fix (2, carried/refined from Round 1):**
  1. D — `object-cover object-top` → `object-cover object-center` at
     `ConsumerMarketing.tsx:300`; verify the body-copy row specifically;
     fallback `object-[center_70%]` if it doesn't hold.
  2. E — remove `opacity-45` from the `<Image>`, change the gradient to
     `bg-gradient-to-b from-background/70 via-background/90 to-background`
     at `app/pro/page.tsx:107,109`; verify with a non-frozen screenshot.
- **Should Fix:** update `DESIGN.md` §6's full-bleed-band line to stop
  documenting `object-top` as shared between D and E now that D moves to
  `object-center` — Kevin's edit alongside the code change, not a
  standalone task.
- **Could Improve:** none new this round — Round 1's two Could-Improve
  items (coach-client phone-screen abstraction, now moot since that image
  is retired; final-cta garbled micro-text) still apply as originally
  written to the extent they touch surviving images.

Once D/E ship, I need one more look — a real (non-frozen) screenshot of
each — before I sign off without a caveat. Not re-opening F or the ethics
check; both are clean.

---

## Round 3 — final sign-off (2026-07-23)

Reviewed against: Round 2's two Must-Fix items above, `DESIGN.md` §6.
Root cause resolved by Kevin, commit `089dffb`: both full-bleed sections
(`ConsumerMarketing.tsx`, `app/pro/page.tsx`) were missing `isolate` on
the section wrapping their `absolute inset-0 -z-10` photo — without it,
the section never established its own CSS stacking context, so `-z-10`
resolved against the page root and dropped the photo behind the page's
opaque `bg-background` regardless of any scrim/opacity value. That was
the true cause of D and E rendering as fully invisible across both prior
rounds; every scrim/opacity/crop value tuned in Round 1 and Round 2 was
correct in isolation and simply never had a chance to render. Fixed by
adding `isolate` to both sections
(`components/home/ConsumerMarketing.tsx:291`, `app/pro/page.tsx:125`).

**Code confirmed directly** (not just the screenshots) before judging:

- D — `ConsumerMarketing.tsx:291-302`: section is
  `relative isolate overflow-hidden`; image is `object-cover object-center`
  (Round 2's ruling, unchanged); scrim is
  `bg-gradient-to-t from-background/90 via-background/40 to-transparent`
  (Round 1's canonical recipe, unchanged). No opacity class on the image.
- E — `app/pro/page.tsx:125-136`: section is `relative isolate
  overflow-hidden`; image is plain `object-cover`, **no opacity class**
  (the Round 2 "drop the opacity class, do all darkening in the gradient"
  restructure, shipped as decided); scrim is
  `bg-gradient-to-b from-background/70 via-background/90 to-background`
  (Round 2's value, unchanged).

Both match my Round 2 rulings exactly — this round is purely "does the
now-unblocked render hold contrast," not a re-litigation of the values.

### Screenshots reviewed (clean captures, animation-freeze defeated)

| Screenshot | Placement | Verdict |
|---|---|---|
| `screenshots/review3-welcome-finalcta-FIXED-1280.jpg` | D — Final-CTA bookend | **Holds.** |
| `screenshots/review3-pro-hero-FIXED-1280.jpg` | E — Pro hero backdrop | **Holds.** |

### D — Final-CTA bookend: holds, no further nudge needed

The photo is genuinely present and reads as the intended beat: athlete
post-set with a towel, the phone's lime "WORKOUT COMPLETE!" glow and
sparkline clearly visible, positioned right where Round 2's crop math said
it would land (`object-center`, vertical-center of the source frame).

**Headline** ("Build your first workout — see for yourself.") sits over
the section's darker, more out-of-focus background territory (blurred gym
equipment, not the lit subject or the phone glow) — full, unambiguous
contrast, no caveat needed.

**Body copy** ("No signup, no credit card. Answer a few quick questions and
start today.") — the row Round 2 flagged as the thinnest-margin one,
because it sits closest to the phone's lime glow horizontally — reads
clearly. The text ends before the phone glow begins; there's real
adjacency (the last word of the first line sits close to the phone's left
edge) but no character overlaps the glow itself, and the `via-background/40`
scrim at that vertical position is doing enough work that the glow reads
as ambient color behind/beside the copy, not as visual noise fighting it.
This holds as shipped. The pre-decided `object-[center_70%]` fallback is
**not needed** — I'm not invoking it.

One thing worth a name, not a fix: the margin here is real, not
generous — if this copy line is ever lengthened (a longer sentence, a
wider font-weight change) in a future edit, re-check this specific
adjacency before shipping. Not a Must/Should now; a note for whoever
touches this section next.

### E — Pro hero backdrop: holds, correct level of restraint

The top of the section now reads as genuine atmosphere — subtle gym-floor
darkness and light variation — rather than the flat solid-black it was
pre-fix. Critically, it stays exactly at the "texture, not a subject"
level the brief called for (§2.E): `PhoneMock` is still unambiguously the
first thing the eye lands on, the "Your gym's training app. Branded as
yours." headline is fully crisp against the `/90`-opacity `via` zone it
sits in, and nothing about the backdrop competes for attention. Given the
brief's explicit instruction was restraint over reveal for this specific
placement, I'm not asking for another opacity nudge — more texture here
would be over-correcting past the brief's own intent, not toward it.

### Verdict: DONE

**Approved, no caveat, nothing further required from Kevin.** All six
placements (A, B, D, E, F, and the retired-in-favor-of §6-HANDOFF third
slot) now match their briefs and this file's accumulated rulings:

- **Must Fix:** none remaining.
- **Should Fix:** none remaining — the `DESIGN.md` §6 documentation
  correction flagged at the end of Round 2 is done as part of this same
  pass (this file's edit + `DESIGN.md` §6's full-bleed-band entry, both
  2026-07-23): the crop-position line no longer claims `object-top` as
  shared between D and E, and a new line documents the `isolate`
  requirement for any future full-bleed `-z-10` photo so this exact defect
  class doesn't recur.
- **Could Improve:** the two Round 1 items (coach-client phone-screen
  abstraction — moot, that image is retired; final-cta garbled micro-text)
  still stand as originally written, at "no action required" status. No
  new items from this round.

Three rounds, one true root cause (`isolate`, a CSS-stacking-context bug,
not a design-value bug) that every prior scrim/opacity/crop tuning pass
was correctly aimed at a symptom of. Closing this thread out clean.
