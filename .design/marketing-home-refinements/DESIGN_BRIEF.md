# Design brief — Marketing-home refinements (hero scale, social proof, Pro exit-ramp, feature reorder)

Owner: Ivy (UX/UI). Advisory/design only — no build staffed for this pass.
Handoff target: Kevin. Grounded in Rex's `.design/dual-audience-marketing-
strategy/MARKETING_STRATEGY.md` (strategy, decisive calls) and the owner's
own feedback (below) on top of it. This brief turns both into build-ready
IA/visual spec for `components/home/ConsumerMarketing.tsx` — the one file
hosted at `/`'s first-time-visitor branch and standalone at `/welcome`
(`app/page.tsx:146-166`, `app/welcome/page.tsx`). No other file changes.

Supersedes nothing — extends `.design/consumer-sales-home/DESIGN_BRIEF.md`
(the original IA for this component) with four scoped changes only. Every
section not named below (Hero copy, Builder walkthrough, Final CTA, the
Utility strip) stays exactly as shipped.

---

## The four changes, owner-directed

1. Hero headline reads with more visual weight (type-scale bump).
2. A real social-proof **slot** — empty-safe, no fabricated data.
3. Rex's mid-scroll Pro exit-ramp (`"Run a gym or train clients?"` → `/pro`).
4. Rex's feature-grid reorder — SyncroFit handoff into the front third.

New section order for `ConsumerMarketing.tsx` (changes marked **NEW**/**MOVED**):

| # | Section | Status |
|---|---|---|
| 0 | Utility strip (hosting page, not this component) | unchanged |
| 1 | Hero | **type-scale bump** (§1 below) |
| 2 | Features grid | **reordered** (§4 below) |
| 3 | Builder walkthrough | unchanged |
| 4 | SyncroFit callout | unchanged |
| 5 | Social-proof slot | **NEW** (§2 below) |
| 6 | Pro exit-ramp | **NEW** (§3 below) |
| 7 | Final CTA | unchanged |

**Why social proof sits before the Pro exit-ramp, not after** (a sequencing
call this brief adds — Rex's strategy doc flagged the exit-ramp's placement
but didn't yet have a social-proof section to sequence against, since he
punted that section pending real data): keep every consumer-trust-building
section contiguous — features → builder proof → SyncroFit proof → social
proof — then place the one non-consumer fork (Pro exit-ramp) as the very
last thing before the close, mirroring how the Utility strip already works
as a quiet, always-available escape hatch at the *top* of the page. Putting
the B2B card in the middle of the trust-building run would break that
narrative for the 95%+ consumer majority reading straight through.

---

## 1. Hero headline — type-scale bump

**File:** `components/home/ConsumerMarketing.tsx:92-94`

**Current:**
```tsx
<motion.h1 variants={fadeUp} className="text-balance text-h1 font-extrabold leading-tight text-text-primary sm:text-[2.5rem]">
  A workout, built around you — in under a minute.
</motion.h1>
```
32px (h1 token) at mobile → 40px at `sm:`.

**New — adopt the same hero recipe already shipped and proven at `/pro`**
(`app/pro/page.tsx:102`, `text-[2.5rem] font-extrabold leading-[1.05]
tracking-tight sm:text-[3.5rem]`), promoted to a documented shared recipe
(`DESIGN.md` §6, "Marketing hero headline" — added as part of this brief):
```tsx
<motion.h1 variants={fadeUp} className="text-balance text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-text-primary sm:text-[3.5rem]">
  A workout, built around you — in under a minute.
</motion.h1>
```
40px at mobile → 56px at `sm:` (matches `display`'s top-end size, §2, but
with a headline-tuned `1.05` line-height instead of `display`'s `1.0`
numeric-readout tuning).

**Why this exact change and not a bigger/smaller one:** the product already
has a second, larger hero at `/pro` running this exact class stack, shipped
and reviewed. Reusing it — rather than inventing a third size — gives Home's
hero visual parity with Pro's hero (both are "this app's front door," now at
the same weight class) and lets this brief cite a proven-safe precedent
instead of a net-new, unverified number. This is the "notch up" the owner
asked for: +25% at mobile (32→40px), +40% at `sm:` (40→56px) — a real,
noticeable jump, not a token tweak.

**320px overflow check:** section is `px-5` (20px gutter each side) →
~280px available width at a 320px viewport. Longest single word in the hero
sentence ("workout," / "minute.") is ≤8 characters; at 40px bold Inter that's
well under 200px, so it wraps cleanly inside 280px with no horizontal
overflow — same math `/pro`'s hero already clears in production. Expect 4-5
short lines at 320px (`text-balance` distributes them evenly) — more lines
than today, not wider ones; that's the intended tradeoff for a bigger,
punchier headline on a narrow screen.

**No other hero element changes** — subhead (`text-body`), primary CTA
button, and micro-proof line stay exactly as shipped (`ConsumerMarketing.tsx:
95-109`). Don't scale the subhead up to "match" the bigger H1 — the contrast
between a now-bolder headline and an unchanged, calmer subhead is doing real
work (the headline is the hook, the subhead is the explainer, and DESIGN.md's
ramp already separates those jobs by weight and size).

---

## 2. Social-proof slot — empty-safe, no fabricated data

**Placement:** new section between the SyncroFit callout
(`ConsumerMarketing.tsx:165-192`) and the Final CTA (`:194-211`) — i.e. right
after the last product-proof section, before any exit-ramp or ask. Per
Cialdini: proof of the product, then proof of the people, then the close.

**Treatment decided: testimonial quote-card grid, not a "trusted by" logo
row and not a stat band.** Reasoning:
- A **logo row** ("trusted by") implies named institutional partners or
  press mentions. None exist yet, and an empty/placeholder logo row reads as
  either broken (visibly missing logos) or, worse, deceptive (grey boxes
  standing in for names nobody can verify). It's also the wrong register —
  Home sells an individual consumer, who is persuaded by peer testimony, not
  institutional logos (that instinct is correctly reserved for `/pro`'s
  gym/trainer audience, once real data exists there — see Rex's strategy
  doc §4/§6).
- A **stat band** ("X workouts built," "Y active users") requires real usage
  numbers that don't exist yet. A zeroed-out or placeholder stat
  (`"0 workouts built"` or a dash) is actively misleading in the direction
  of looking *worse* than an honest sentence would, and inventing a number
  is the one thing explicitly ruled out by the ask.
- A **quote-card grid with an honest empty state** is the only one of the
  three that degrades gracefully to nothing: a single plain sentence reads
  as an intentional, confident "we're new" statement — consistent with the
  product's existing honesty pattern (the SyncroFit callout already tells
  visitors flatly "Live Elevated doesn't have its own live workout timer").

**Data contract — the thing that makes this "trivially swappable":**
```tsx
// Empty by design — see .design/marketing-home-refinements/DESIGN_BRIEF.md.
// Populate with real member quotes ({ quote, name, role }) once Dino
// supplies them; the section switches from the honest-empty statement to
// the 3-card quote grid automatically. Never fabricate an entry here.
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];
```
Declare this constant near `FEATURES`/`STEPS` at the top of
`ConsumerMarketing.tsx`.

**Empty state (ship now):**
```tsx
<section className="px-5 py-12">
  <Reveal className="mx-auto max-w-2xl text-center">
    <p className="mb-2 text-label text-accent">REAL PEOPLE, REAL WORKOUTS</p>
    <h2 className="text-h2 font-bold text-text-primary">Built by training, not by marketing.</h2>
    <p className="mx-auto mt-3 max-w-xl text-body text-text-muted">
      Live Elevated is brand new — the reviews are still being written. As real members log real
      workouts, their stories will show up right here.
    </p>
  </Reveal>
</section>
```

**Populated state (drop-in once `TESTIMONIALS.length > 0`):**
```tsx
<section className="px-5 py-12">
  <Reveal className="mx-auto mb-8 max-w-2xl text-center">
    <p className="mb-2 text-label text-accent">REAL PEOPLE, REAL WORKOUTS</p>
    <h2 className="text-h2 font-bold text-text-primary">What members are saying.</h2>
  </Reveal>
  <motion.div
    variants={stagger}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-60px' }}
    className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3"
  >
    {TESTIMONIALS.map((t) => (
      <motion.div key={t.name} variants={fadeUp} className="rounded-xl border border-border bg-surface p-5 text-left">
        <p className="mb-3 text-h2 text-accent">&ldquo;</p>
        <p className="text-body italic text-text-primary">{t.quote}</p>
        <p className="mt-3 text-caption text-text-muted">{t.name} · {t.role}</p>
      </motion.div>
    ))}
  </motion.div>
</section>
```

**Implementation note for Kevin:** wrap both blocks behind
`TESTIMONIALS.length === 0 ? (…) : (…)` in one section, so the whole thing
is one component with one branch point, not two dead code paths to keep in
sync by hand. This is the recipe now documented at `DESIGN.md` §6,
"Social-proof section (empty-safe)" — reuse the Feature-card shell
(`rounded-xl border border-border bg-surface p-5`) for populated cards
rather than inventing a new card shape.

**Accessibility:** empty and populated states both use a single `<h2>` per
section (heading hierarchy stays flat — one H2 per marketing section, same
as every other section in this file). Quote-card grid has no interactive
elements in either state, so no new focus/aria work is needed beyond what
`<Reveal>` already handles for reduced-motion.

---

## 3. Pro exit-ramp — mid-scroll secondary CTA

**Placement:** between the new social-proof section (§2) and the Final CTA
(`ConsumerMarketing.tsx:194-211`) — the last thing a consumer-focused
visitor scrolls past before the primary ask, catching a Pro-intent visitor
who didn't self-identify at the top Utility strip.

**Copy (Rex's, verbatim — no changes):**
- Headline: "Run a gym or train clients?"
- Body: "Give every member this exact workout experience — branded as yours."
- CTA label: "See Live Elevated Pro →" → `/pro`

**Treatment — deliberately smaller/quieter than the SyncroFit callout it
sits near, so it never competes with the consumer CTA below it:**
```tsx
<section className="px-5 py-8">
  <Reveal className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface/60 p-6 text-center">
    <h2 className="text-h3 font-semibold text-text-primary">Run a gym or train clients?</h2>
    <p className="mx-auto mt-2 max-w-md text-body text-text-muted">
      Give every member this exact workout experience — branded as yours.
    </p>
    <Link
      href="/pro"
      className="mx-auto mt-5 flex h-12 w-full max-w-xs items-center justify-center rounded-md border border-border bg-transparent text-label text-text-primary transition-all duration-150 active:scale-[0.97] active:bg-surface"
    >
      SEE LIVE ELEVATED PRO →
    </Link>
  </Reveal>
</section>
```

**Why every one of these choices, named:**
- `bg-surface/60` (not the SyncroFit callout's solid `bg-surface`) and
  `max-w-2xl` (not its `max-w-4xl`) — visually lighter and narrower than a
  full callout box, so it reads as a smaller aside, not a peer section.
- `text-h3` headline (not `text-h2`, which every real section headline in
  this file uses) — semantically still an `<h2>` tag (flat heading
  hierarchy preserved) but visually subordinate, per `DESIGN.md` §6's new
  "Quiet exit-ramp callout" recipe.
- Ghost button (`DESIGN.md` §6), not Primary — outline, transparent fill,
  `text-text-primary` not `text-on-accent`. This is the one hard constraint
  from Rex's strategy doc: never a second filled-accent button competing
  with "BUILD YOUR FIRST WORKOUT" on the same screen.
- `max-w-xs` on the button (not the Primary CTA's `max-w-sm`) — one more
  small, deliberate size cue that this is the secondary path.
- `py-8` section padding (lighter than the `py-10`/`py-12`/`py-16` used
  elsewhere) — takes less scroll real estate, reinforcing "aside," not
  "destination."
- Single `<Reveal>` (fadeUp, no stagger) — matches the SyncroFit callout's
  own motion, per Rex: "no motion emphasis beyond the existing scroll-reveal."
- No feature list, no fact-tile row, no stats — Rex's explicit instruction:
  "the point is the exit, not a second sales pitch."

**Relationship to the existing Utility-strip exit:** this is the *second*
Pro exit on the page, not a replacement for the first
(`components/home/UtilityStrip.tsx`, unchanged). Two quiet, low-emphasis
exits at two different scroll depths — top (before any content) and here
(after the consumer pitch has run its course) — both deliberately never
compete with the one consumer-facing filled CTA.

---

## 4. Feature grid reorder

**File:** `components/home/ConsumerMarketing.tsx:14-55` (`FEATURES` array).

**Current order:** Goals-first setup → 291 exercises → Build in seconds →
Progressive overload → Daily 5 → Save/plan week → Send to SyncroFit →
Free, no account.

**New order (Rex's, per the serial-position effect — differentiators at the
front, reinforcement at the end, adjacent to the CTA that follows):**
1. Goals-first setup
2. 291 illustrated exercises
3. Build in seconds
4. **Send to SyncroFit** ← moved up from position 7
5. Progressive overload, tracked
6. Daily 5
7. Save it, plan your week
8. Free, no account ← stays last

**Implementation note:** this is a pure array reorder — move the existing
`{ icon: '⏱️', title: 'Send to SyncroFit', ... }` object
(`ConsumerMarketing.tsx:46-49`) to the 4th position in the `FEATURES` array
literal. No copy, icon, or card-shape changes. The grid itself
(`sm:grid-cols-2 lg:grid-cols-3`, `ConsumerMarketing.tsx:118-132`) is
unaffected — 8 cards flow into the same 2/3-column responsive grid
regardless of array order.

---

## Non-negotiable constraints this brief respects

- **Data-honesty invariant:** no fabricated testimonials, names, gyms, or
  usage numbers (§2) — this is the central constraint of the whole brief,
  not an afterthought. The empty-state copy makes the absence of proof
  explicit rather than papering over it.
- **App-isolation:** N/A — `ConsumerMarketing.tsx` is consumer-only content
  on both its hosts (`/`, `/welcome`); nothing here touches tenant-branded
  (`/g/[slug]/*`) surfaces or reads `tenant.branding`.
- **Technical limits:** hero type-scale bump verified not to overflow at a
  320px viewport (§1). No new dependencies — reuses `Reveal`/`fadeUp`/
  `stagger` from `components/marketing/Reveal.tsx` and the existing
  Feature-card/Ghost-button recipes; `prefers-reduced-motion` is already
  handled inside `<Reveal>` for every new section that uses it.
- **Legal gating:** none triggered — no new health/outcome claims, no
  pricing or contractual language added.

## DESIGN.md updated as part of this brief

`DESIGN.md` §6 "Marketing sections" now documents three recipes this brief
introduces, since two (`Marketing hero headline`, once used at both `/pro`
and Home) or all three (`Social-proof section`, `Quiet exit-ramp callout`)
are reusable beyond this one component: **Marketing hero headline**,
**Social-proof section (empty-safe)**, **Quiet exit-ramp callout**. Kevin
should build against those recipes, not hand-roll new class stacks.
