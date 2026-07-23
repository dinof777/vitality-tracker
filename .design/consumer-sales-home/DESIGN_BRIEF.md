# Design brief — Consumer sales Home (sell the regular user, keep the fast path)

Owner: Ivy (UX/UI). Advisory/design only for this pass — no build staffed yet.
Handoff target: Kevin. Grounded in the files below; read the referenced line
ranges before building, don't reinvent what's quoted.

Supersedes/extends `.design/home-front-door/DESIGN_BRIEF.md` for the
`!profile` branch of `app/page.tsx` only. That brief's utility strip
(`For gyms & trainers` / `Trainer log in`) is **kept as-is** — this brief adds
the actual sales content underneath it for first-time visitors; it does not
touch the returning-user app.

---

## The ask (owner, verbatim)

"I still want a more sales-related home page for both the user and pro user,
with links to the pro features, but we really need to sell the regular user
as well. Show them the features and how to use the exercise builder and send
to SyncroFit."

## What exists already (reuse, don't rebuild)

- `app/page.tsx:138-298` — Home's full return. Utility strip
  `app/page.tsx:139-152` (unchanged, see above). Greeting `<header>`
  `app/page.tsx:153-159`. The `!ready`/`!profile`/profiled ternary starts at
  `app/page.tsx:161`. Today, `!profile` (`app/page.tsx:163-178`) renders one
  thin card ("⚡ Set up your profile") + a GET STARTED button — the entire
  first-time experience. **No feature pitch, no explanation of the builder,
  no SyncroFit mention anywhere for a cold consumer visitor.**
- `app/pro/page.tsx` — the B2B sales page. It already solved "long-scroll
  sales page that doesn't drift from the codebase": counts sourced from
  `SAMPLE_EXERCISES.length`/`EQUIPMENT_ORDER.length` (`app/pro/page.tsx:5,
  9-10`), a `Reveal`/`fadeUp`/`stagger` scroll-in wrapper
  (`app/pro/page.tsx:12-33`), a feature-card grid (`app/pro/page.tsx:67-76,
  166-179`), a numbered-step grid (`app/pro/page.tsx:78-83, 252-266`), and a
  callout box with a 3-fact row (`app/pro/page.tsx:268-291`). This brief
  reuses all four recipes for the consumer pitch instead of inventing new
  ones — see the DESIGN.md pattern extraction below.
- `components/workout/BuilderControls.tsx:132-193` — the FOCUS / INTENSITY /
  STYLE / EQUIPMENT summary rows that "the exercise builder" *is*, visually.
  This is the literal UI the owner wants explained — reuse its row recipe
  verbatim in the walkthrough preview rather than inventing a fake mock.
- `components/workout/StartSheet.tsx:93-108` — "LOG IN THE APP" /
  "SEND TO SYNCROFIT" are the two real buttons this callout is selling.
- `lib/exercises.ts` — `SAMPLE_EXERCISES` (291 entries) and
  `EQUIPMENT_ORDER` (19 entries, confirmed at `lib/exercises.ts:473-493`) —
  the only legitimate source for any count in consumer copy.
- `middleware.ts:7` only protects `/dashboard`, `/onboarding`, `/admin`,
  `/g/*/branding` — a new `/welcome` route needs no auth wiring.
- `components/layout/BottomNav.tsx:29` (`HIDE_ON`) does **not** include
  `/welcome` — the tab bar renders there automatically, so a return path
  already exists without new nav code.

---

## The core IA fork — decided

**A first-time visitor (`!profile`) gets sold. A returning visitor
(`profile` in localStorage) gets the app, unchanged, with one low-key way
back to the pitch.** Concretely:

- `!profile` → `app/page.tsx` renders `<ConsumerMarketing />` (new) in place
  of today's thin card. This *is* the sales-oriented Home the owner asked
  for — hero, features, builder walkthrough, SyncroFit callout, CTA.
- `profile` (returning) → today's fast quick-build, **unchanged**, plus one
  new low-key text link to `/welcome` (a standalone host for the same
  `<ConsumerMarketing />`) so a returning user can revisit the pitch — to
  remind themselves what's new, or to send the link to someone else. It is
  not inserted into the fast-build flow itself; it's the last thing on the
  screen, `text-faint`, easy to ignore.
- `/welcome` also exists as its own route (not just reachable from Home) so
  it's a shareable URL and works if Dino ever wants to link it from
  elsewhere (a future footer, an email, socials) without relitigating this
  brief.

**Why not gate/show marketing to profiled users on every visit:** Dino's own
stated use of returning-Home is immediate build/log — that's the thing the
prior brief already protected and this one must not undo. Marketing content
above the fold on a screen someone opens daily is friction, not sales.

**Why the greeting header (`app/page.tsx:153-159`, "Good morning" +
`StreakBadge`) does NOT show on the marketing branch:** `StreakBadge` at
`streak=0` renders "0 days" (muted, per `components/daily5/
StreakBadge.tsx:7-21`) — technically inert, but it's advertising the absence
of engagement to someone who hasn't started yet, which undercuts a sales
pitch instead of supporting it. The marketing Hero supplies its own
eyebrow+headline; the generic greeting is redundant next to a real headline
and the streak badge has nothing true to say yet. This means restructuring
where the header renders — see the file:line spec below.

---

## Sections, copy, and component spec

### New shared module: `components/marketing/Reveal.tsx`

Extract `Reveal`, `fadeUp`, `stagger` from `app/pro/page.tsx:12-33` verbatim,
**plus one real fix**: wrap in Framer Motion's `useReducedMotion()` so
`initial`/`whileInView` collapse to the final state with no animation when
the user has reduced motion set. The existing CSS-only rule
(`app/globals.css:56-63`, `prefers-reduced-motion` → zero transition/
animation duration) does **not** reach Framer Motion's JS-driven transform
interpolation — this has been a latent gap in `/pro` since it shipped.
Fixing it once in the shared module fixes both consumers instead of
duplicating (or duplicating the bug) a second time.

`app/pro/page.tsx:12-33` then becomes an import from this module — delete
the local copy. Zero visual change to `/pro`.

### New component: `components/home/ConsumerMarketing.tsx`

`'use client'`. No props. Imports `Reveal`/`fadeUp`/`stagger` from the module
above, and `SAMPLE_EXERCISES`, `EQUIPMENT_ORDER` from `@/lib/exercises` for
honest counts — same convention as `app/pro/page.tsx:5,9-10`, never a
hand-typed number. Renders, in order:

**1. Hero**
- Eyebrow: `LIVE ELEVATED` (same brand line the profiled header uses —
  keeps voice continuous on the one route that serves both states).
- H1: **"A workout, built around you — in under a minute."**
- Subhead: **"Tell Vitality your goal, your equipment, and how much time
  you've got. It builds the workout from a {291}-exercise illustrated
  library — log it here, or send it straight to SyncroFit's timer."**
  (interpolate `SAMPLE_EXERCISES.length`, not a literal "291")
- Primary CTA (Primary button recipe, DESIGN.md §6): **"BUILD YOUR FIRST
  WORKOUT"** → `/setup`
- Micro-proof line (`text-caption text-text-faint`, /pro's recipe at
  `app/pro/page.tsx:139-141`): **"{291} illustrated exercises · {19}
  equipment types · free, no account required"**

**2. Features** — feature-card grid (`app/pro/page.tsx:67-76,166-179`
recipe: `rounded-xl border border-border bg-surface p-5`,
`sm:grid-cols-2 lg:grid-cols-3`), section header **"Everything you need to
actually train."** Eight cards:

| Icon | Title | Body |
|---|---|---|
| 🎯 | Goals-first setup | Tell us your goal — build muscle, lose weight, general fitness, or recover an area — and every workout's shaped around it from your first session. |
| 🏋️ | {291} illustrated exercises | Every move shown, not just named. Filter to the {19} equipment types you actually own — dumbbells, bands, bodyweight, or gym machines. |
| ⚡ | Build in seconds | Pick a focus, your equipment, and how long you've got. Vitality assembles the workout — you don't have to. |
| 📈 | Progressive overload, tracked | Log weight and reps per set. Every exercise remembers your last session and shows a sparkline, so you can see yourself getting stronger. |
| ✅ | Daily 5 | Five daily habits, one tap each, streak-tracked — the stuff that matters even on a day you don't lift. |
| 📅 | Save it, plan your week | Turn a workout into a routine, then schedule it across your week so "what do I do today" is already answered. |
| ⏱️ | Send to SyncroFit | One tap hands your workout to SyncroFit's interval, AMRAP, or EMOM timer — cues and images ride along, no re-typing. |
| 🔓 | Free, no account | The whole app runs from your device. No login, no signup wall, to start training. |

**3. "How the exercise builder works"** — numbered-step grid
(`app/pro/page.tsx:78-83,252-266` recipe: filled accent circle + title +
body, `sm:grid-cols-2 lg:grid-cols-4`), eyebrow **"THE BUILDER"**, H2
**"From tap to trained, in four steps."** Steps:

1. **Pick your focus** — Full Body, a pillar (Strength / Cardio / Balance /
   Flexibility), or drill into one muscle or joint.
2. **Set equipment & time** — tell it what you've got and how many minutes
   you have; the length dial adjusts the exercise count on the fly.
3. **Tap Build** — Vitality assembles a workout from the library that
   matches your focus, equipment, and intensity.
4. **Log it, or send it** — log sets right here with progressive overload,
   or hand it to SyncroFit's timer in one tap.

Directly below the 4 steps (same section, `grid gap-8 lg:grid-cols-2` —
steps in one column, this in the other; stacks under it on narrow/embedded
Home): a **static, non-interactive preview** of the real builder UI, new
component `components/home/BuilderPreview.tsx`. Not a fake mock — reuse
`BuilderControls`' own row recipe verbatim (`components/workout/
BuilderControls.tsx:138-193`, the `border border-border bg-surface p-4`
summary rows) with representative static values (FOCUS "🔥 Full Body",
INTENSITY "Moderate — 5 exercises · 3×10 · 60s rest", STYLE "⏱ Intervals",
EQUIPMENT "Dumbbells, Bands, Bodyweight") and the Primary-button
"BUILD MY WORKOUT" row beneath, all four rows real `Link`s to `/setup`
(clicking anywhere in the preview does something, doesn't dead-end). Caption
above it, `text-caption text-text-faint`: **"This is the actual screen —
not a mockup."**

**4. SyncroFit callout** — callout-box recipe (`app/pro/page.tsx:268-291`:
`rounded-2xl border border-border bg-surface p-8 text-center` + 3-fact
`sm:grid-cols-3` row of `rounded-lg border border-border bg-background p-3`
tiles). Eyebrow **"⏱️ SYNCROFIT, CONNECTED"**, H2 **"We build the workout.
SyncroFit runs the clock."** Body: **"Vitality doesn't have its own live
workout timer — and it doesn't need one. Every workout you build sends
straight to SyncroFit's interval, AMRAP, or EMOM timer in one tap, with your
cues and images along for the ride."** (Honesty check: this matches
`WorkoutStyleControl`'s own in-app footer copy, DESIGN.md §6 — "SyncroFit
runs the {Style} clock — Vitality doesn't have a built-in timer for this
style yet." Never claim Vitality times anything itself.) Three fact tiles:
"Every style" (Intervals, For Time, AMRAP, or EMOM — SyncroFit calls it
out), "Cues travel" (your exercise images and coaching cues ride along into
the timer), "No re-typing" (one tap sends the whole workout).

**5. Final CTA** — mirrors `app/pro/page.tsx:343-353`. H2 **"Build your
first workout — see for yourself."** Subhead: **"No signup, no credit card.
Answer a few quick questions and start today."** Button (Primary recipe):
**"BUILD YOUR FIRST WORKOUT"** → `/setup`.

**No repeated Pro link inside `ConsumerMarketing` itself.** The utility strip
(`app/page.tsx:139-152`, unchanged, renders above this component on both
hosts — see below) is the one, singular secondary path to `/pro`. Per the
owner's own framing — *sell the regular user, **link to** Pro* — one clear
exit beats three diluted ones stacked through a long scroll.

### New route: `app/welcome/page.tsx`

```tsx
import ConsumerMarketing from '@/components/home/ConsumerMarketing';
import UtilityStrip from '@/components/home/UtilityStrip';

export default function Welcome() {
  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <div className="mx-auto max-w-6xl px-5 pt-4">
        <UtilityStrip />
      </div>
      <ConsumerMarketing />
    </div>
  );
}
```

No `max-w-md` clamp at the root (unlike `app/page.tsx`'s `<main>`) — this
route is the standalone, shareable marketing surface and should expand like
`/pro` does on tablet/desktop. `ConsumerMarketing`'s internal sections
already carry their own `max-w-2xl`/`max-w-5xl` caps (matching /pro's
per-section pattern) — nested inside `app/page.tsx`'s tighter `max-w-md`
host, those same classes simply never bind past 448px, so **one component
works correctly, unmodified, in both hosts** — no duplicate markup, no
props to toggle width.

---

## File:line implementation spec for Kevin

### 1. `components/marketing/Reveal.tsx` — **new**
Move `fadeUp`, `stagger`, `Reveal` from `app/pro/page.tsx:12-33` here
verbatim, add `useReducedMotion()` gating per above.

### 2. `app/pro/page.tsx`
- Delete lines 12-33 (local `fadeUp`/`stagger`/`Reveal`).
- Add `import { Reveal, fadeUp, stagger } from '@/components/marketing/Reveal';`
  near the top with the other imports (line 1-9 area).
- No other changes. Verify the page still renders identically (pure
  extraction).

### 3. `components/home/UtilityStrip.tsx` — **new**
Extract the `<div className="mb-2 flex items-center justify-end gap-6">…`
block verbatim from `app/page.tsx:139-152` into its own component (no
props — both links are static). This is the same JSX, just named and
reusable, so `/welcome` doesn't hand-copy it.

### 4. `components/home/ConsumerMarketing.tsx` — **new**
Per the full section spec above. `'use client'`.

### 5. `components/home/BuilderPreview.tsx` — **new**
Per the "How the exercise builder works" spec above — static rows reusing
`BuilderControls.tsx:138-193`'s row recipe with hardcoded example values,
each row a `Link` to `/setup`.

### 6. `app/page.tsx` — restructure
Current (`app/page.tsx:137-160`):
```tsx
<main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-4">
  <div className="mb-2 flex items-center justify-end gap-6"> … </div>   {/* utility strip, inline */}
  <header className="mb-4 flex items-start justify-between"> … </header> {/* unconditional today */}
  {!ready ? (...) : !profile ? (...) : (...)}
```

New:
```tsx
<main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-4">
  <UtilityStrip />
  {!ready ? (
    <div className="flex-1" />
  ) : !profile ? (
    <ConsumerMarketing />
  ) : (
    <>
      <header className="mb-4 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-label text-accent">LIVE ELEVATED</p>
          <h1 className="text-h1 text-text-primary">{greet}</h1>
        </div>
        <StreakBadge streak={streak} />
      </header>
      {/* existing profiled-branch content, app/page.tsx:181-279, unchanged */}
    </>
  )}
  {pending && params && <StartSheet ... />}  {/* app/page.tsx:283-295, unchanged */}
</main>
```

Precisely:
- Replace the inline utility-strip div (`app/page.tsx:139-152`) with
  `<UtilityStrip />` (import from `components/home/UtilityStrip`).
- Delete the standalone `<header>` at `app/page.tsx:153-159` from its
  current unconditional position.
- Delete the `!profile` branch's current contents
  (`app/page.tsx:165-170`, the thin "⚡ Set up your profile" card + GET
  STARTED button) and replace with `<ConsumerMarketing />`.
- Move the (unchanged) `<header>` JSX to become the first child inside the
  `profile` (final) branch, immediately before the existing
  `{today.length > 0 && (…)}` block (currently `app/page.tsx:182`).
- Add, as the **last** element inside the profiled branch (after both the
  `PICK MY OWN EXERCISES` link at `app/page.tsx:263-268` and the
  conditional `PLAN MY WEEK` link at `app/page.tsx:272-279` — i.e. it
  always appears regardless of `profile.goal`):
```tsx
<Link
  href="/welcome"
  className="mt-4 block text-center text-caption text-text-faint underline decoration-dotted underline-offset-2"
>
  See everything Vitality can do →
</Link>
```
  (Dotted-underline low-emphasis link is an existing convention — same
  visual family as the Undo link, DESIGN.md §6 "Undo (most-recent set
  only)" — reused here for tone, not color, since this isn't destructive.)
- New imports needed: `UtilityStrip` (`@/components/home/UtilityStrip`),
  `ConsumerMarketing` (`@/components/home/ConsumerMarketing`). `Link` is
  already imported (`app/page.tsx:4`).
- `!ready` guard, `pending`/`StartSheet` rendering
  (`app/page.tsx:283-295`) — unchanged, unaffected by this restructure.

### 7. `app/welcome/page.tsx` — **new**
Per the route spec above.

---

## Accessibility

- `Reveal`'s `useReducedMotion()` fix (above) — the one real a11y gap this
  brief closes, not just inherits.
- Hero H1/H2s follow the existing heading scale (`text-h1`/`text-h2`) so
  screen-reader heading navigation gets a real outline of the page, not flat
  `<div>`s styled to look like headings.
- `BuilderPreview`'s rows are real `Link`s (native focus + keyboard
  activation), same as `BuilderControls`' own rows — no new custom
  interaction pattern to test.
- FAQ/accordion pattern is **not** used here (no FAQ section on this pass —
  the owner's ask was features + builder walkthrough + SyncroFit, not
  objection-handling; adding one is a future option, not this brief's scope).
- Color contrast: every token used (`text-primary`/`text-muted`/`text-faint`
  on `background`/`surface`) is already contrast-checked in DESIGN.md §1 —
  no new colors introduced.

## Constraints check

- **App isolation:** purely additive marketing + navigation. No consumer
  localStorage profile data is read or written by `ConsumerMarketing` or
  `/welcome`. No trainer/Clerk auth surface is touched. `/setup` (the CTA
  target) is the existing onboarding flow, unmodified.
- **Data-honesty:** every count (291 exercises, 19 equipment types) is
  interpolated from `SAMPLE_EXERCISES.length`/`EQUIPMENT_ORDER.length` at
  render time, never hand-typed — copy cannot silently drift from the
  shipped library. The SyncroFit copy explicitly states Vitality does *not*
  have its own live timer, matching `WorkoutStyleControl`'s existing in-app
  disclosure (DESIGN.md §6) — no overclaim introduced anywhere in this pass.
- **Legal gating:** no health/medical claims beyond the existing goal labels
  already shipped in onboarding (`lib/pillars.ts` `GOAL_CHOICES`, e.g.
  "Recover / Rehab an Area") — this brief doesn't add new claims, only
  restates existing, already-reviewed product language.
- **Technical limits:** two new components, one new static preview
  component, one new route, one extraction (`Reveal`), one restructure of
  an existing file. No new schema, no new API, no new client state beyond
  what `ConsumerMarketing`'s own scroll-reveal already needs (stateless
  besides that).

## DESIGN.md pattern added

Two additions (see diff applied to `DESIGN.md`):
1. New §6 subsection **"Marketing sections (long-scroll sales pages)"** —
   formalizes the `Reveal`/feature-card/numbered-step/callout-box/
   micro-proof-line recipes `/pro` originated, now shared with the new
   consumer marketing surfaces via `components/marketing/Reveal.tsx`.
2. §7 **"Home utility strip"** bullet updated to note its extraction into
   `components/home/UtilityStrip.tsx` and its second host at `/welcome`; a
   new bullet **"Consumer marketing"** documents `ConsumerMarketing`'s two
   hosts and the width-clamp reasoning above.
