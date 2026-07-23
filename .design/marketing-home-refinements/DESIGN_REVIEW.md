# Design review — Marketing-home refinements (close-out)

Reviewer: Ivy. Reviewing Kevin's build against `DESIGN_BRIEF.md` (this folder)
and `DESIGN.md` §6's three recipes it introduced (Marketing hero headline,
Social-proof section (empty-safe), Quiet exit-ramp callout). Independent
review — Kevin does not self-certify.

**Scope reviewed:** `components/home/ConsumerMarketing.tsx`, live on
production at https://vitality-tracker-mauve.vercel.app/welcome, commit
`555dc03`. Build green, lint clean, 286 tests passing (verified by Jeff,
not re-verified here — my job is the design match, not the pipeline).

**Verdict: Approved. No Must-fix items.** All four changes match the brief
and the DESIGN.md §6 recipes at the code level, including exact class-string
parity in the two places that matter most (hero, exit-ramp). Two Should-fix
items below are about closing a *review-coverage* gap, not a defect in what
shipped — see detail.

---

## Must fix

None.

---

## Should fix

**1. No real-data screenshot coverage for 3 of the 4 changes.**
The two screenshots I was handed (`screenshots/review-welcome-hero-desktop-
1280.jpg`, `review-welcome-hero-topfold-1280.jpg`) cover only the hero and
the first two feature cards. The social-proof empty-state section
(`ConsumerMarketing.tsx:201-234`), the Pro exit-ramp
(`ConsumerMarketing.tsx:237-250`), and the feature grid's reordered 4th
position (`:14-55`, SyncroFit card) have **no visual confirmation** — I
signed off on those from code cross-check against the brief and DESIGN.md
§6 line-by-line, which is a legitimate but strictly weaker form of
sign-off than the hero got. Recommend a follow-up scroll-through capture
(full page, settled state) before calling this pass fully closed, even
though nothing in the code gives me reason to expect a surprise.

**2. Both screenshots appear to be captured mid-animation, not at rest.**
In both images, everything inside `ConsumerMarketing`'s Framer Motion
`stagger`/`fadeUp` groups (the hero block `:96-116`, the first feature cards
`:124-138`) renders at roughly 30-40% of expected contrast/saturation — the
"BUILD YOUR FIRST WORKOUT" button shows as a dark, desaturated olive box
instead of the documented `accent` lime (`#A3E635`) fill, and the hero
headline/eyebrow read as dim grey rather than `text-text-primary`/`text-
accent`. Meanwhile the bottom tab bar and the Utility strip's "Trainer log
in" link — both outside the animated tree — render at full contrast in the
*same* frame. That split is the tell: this is Framer Motion's `initial=
"hidden"`/`whileInView="show"` transition caught mid-interpolation by the
screenshot tool, not a shipped contrast bug (a page-wide scrim or dead CSS
var would have dimmed the bottom nav too, and it didn't). Net effect: these
two screenshots confirm **layout, copy, and section order** correctly, but
can't be used to confirm **final-state color/contrast values** — recommend
a settle delay (or forcing `prefers-reduced-motion: reduce` for the capture)
next time a screenshot needs to double as a color/contrast check.

---

## Could improve

**1. Mobile/tablet still unconfirmed visually.** The brief's own flagged
risk — hero overflow at 320px — was verified programmatically (`scrollWidth
=== 280`, no horizontal overflow, ~5 balanced lines), which I'll take as
sufficient to clear that specific risk. But this hero is the first thing
every first-time visitor sees, and most of that traffic is phones — I'd
still like one real mobile screenshot in the loop before I'd call this
100% closed on the device that matters most, once the tooling gap is fixed.

**2. Exit-ramp Ghost button omits `ease-out` from its transition.**
`ConsumerMarketing.tsx:245` has `transition-all duration-150` where
DESIGN.md's Ghost-button recipe (§6) specifies `transition-all duration-150
ease-out`. Not asking for a fix — every other button in this file (Primary
CTA at `:108`, `:263`) has the identical omission, so this is a pre-existing
file-wide convention Kevin correctly matched, not a new deviation he
introduced. Flagging only so it isn't miscounted as a fresh miss.

---

## What works well

- **Hero — exact recipe parity, not just visual similarity.**
  `ConsumerMarketing.tsx:98`'s class string is a verbatim match to
  DESIGN.md §6's now-documented "Marketing hero headline" recipe and to
  `/pro`'s proven precedent (`app/pro/page.tsx:102`) — real cross-page
  consistency, the thing the brief asked for.
- **Social-proof section's single branch point.** `:202` (`TESTIMONIALS
  .length === 0 ? … : …`) is exactly the "one component, one branch, no
  dead second path" shape the brief's implementation note asked for.
  Placement is correct — after the SyncroFit callout, before the exit-ramp
  — preserving the brief's Cialdini sequencing (product proof → people
  proof → the one non-consumer fork → close). Empty-state copy matches the
  brief verbatim, single `<h2>` per branch (accessibility requirement met).
- **Exit-ramp hits every named "why," not just the headline copy.**
  `:237-250` — `bg-surface/60` (not solid `bg-surface`), `max-w-2xl` (not
  `max-w-4xl`), `text-h3` heading (visually subordinate, still a real
  `<h2>` — flat heading hierarchy intact), Ghost button (not Primary, no
  second filled-accent CTA competing with "BUILD YOUR FIRST WORKOUT"),
  `max-w-xs` on the button, `py-8` lighter section padding. All five
  deliberate "quiet aside" cues from the brief are present and none have
  drifted back toward peer-section weight.
- **Feature-grid reorder is clean.** SyncroFit card confirmed at array
  position 4 (`:14-55`), zero copy/icon/shape changes — diffed against the
  original 8-object array.
- **DESIGN.md stayed in sync.** All three §6 recipes this brief introduced
  (Marketing hero headline, Social-proof section (empty-safe), Quiet
  exit-ramp callout) are documented and match the shipped code exactly —
  the brief's "trivially swappable" promise for `TESTIMONIALS` holds for
  whoever populates it later.

---

## Non-negotiable constraints — re-checked against what shipped

- **Data-honesty invariant:** held. `TESTIMONIALS` is genuinely `[]`, no
  fabricated quote/name/stat anywhere in the shipped section.
- **App-isolation:** N/A, unaffected — no `tenant.branding` reads, no
  `/g/[slug]/*` surfaces touched.
- **Technical limits:** hero overflow risk cleared programmatically (see
  Could-improve #1 for residual visual-confirmation preference, not a
  blocking gap). No new dependencies; `Reveal`/`fadeUp`/`stagger` reused
  as specified.
- **Legal gating:** N/A, none triggered — no new claims added.
