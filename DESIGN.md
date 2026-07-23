# Live Elevated — Design System

> Canonical visual spec for the Live Elevated workout tracker PWA. Every screen
> and component references this file. Dark-mode first, gym-floor optimized:
> high contrast, fat-thumb tap targets, big number readouts.
>
> **Brand direction:** Brian Pruett's _Live Elevated_ philosophy —
> strong, clean, athletic. Premium native fitness feel, not a SaaS dashboard.
> Accent is **vitality-lime** (energy + health). Tunable — swap the `accent`
> token to rebrand the whole app in one place.

---

## 1. Color tokens

Dark-mode is the **default and only** theme. All tokens are CSS variables in
`app/globals.css` and mapped to Tailwind names in `tailwind.config.ts`.

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `background` | `#121316` | `bg-background` | App canvas (carbon black) |
| `surface` | `#1B1C20` | `bg-surface` | Cards, sheets, input rows |
| `surface-raised` | `#25262B` | `bg-surface-raised` | Elevated / pressed surfaces, popovers |
| `border` | `#2E3036` | `border-border` | Hairlines, dividers, input borders |
| `accent` | `#A3E635` | `bg-accent` / `text-accent` | **Primary** — CTAs, active states, tempo badges, sparklines |
| `accent-press` | `#84CC16` | `bg-accent-press` | Pressed/active state of accent elements |
| `on-accent` | `#0B0B0C` | `text-on-accent` | Text/icons on top of accent fills (near-black) |
| `text-primary` | `#F5F5F4` | `text-text-primary` | Headings, primary copy, number readouts |
| `text-muted` | `#A1A1AA` | `text-text-muted` | Secondary labels, metadata |
| `text-faint` | `#6B7280` | `text-text-faint` | Placeholders, disabled, captions |
| `energy` | `#F59E0B` | `text-energy` | AMRAP / PR / "push" highlights (amber) |
| `success` | `#22C55E` | `text-success` | Completed sets, streak wins |
| `destructive` | `#EF4444` | `text-destructive` | Delete, errors, failed lift |

**Contrast:** `text-primary` on `background` ≈ 17:1, `on-accent` on `accent` ≈
13:1 — both clear WCAG AAA. `text-muted` on `surface` ≈ 6:1 (AA).

---

## 2. Typography

**Font:** `Inter` (geometric sans, variable), loaded via `next/font/google` and
exposed as `--font-inter` → Tailwind `font-sans`. Numbers use `tabular-nums` so
weight/rep readouts don't jitter as digits change.

| Step | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | **56px** / 1.0 | 800 | -0.02em | Weight & rep readouts, rest-timer clock |
| `h1` | 32px / 1.15 | 700 | -0.01em | Screen titles |
| `h2` | 24px / 1.2 | 700 | -0.01em | Section headers |
| `h3` | 20px / 1.3 | 600 | 0 | Card titles, exercise names |
| `body` | 16px / 1.5 | 400 | 0 | Default copy |
| `label` | 14px / 1.4 | 600 | 0.04em, UPPERCASE | Form labels, badge text, nav |
| `caption` | 12px / 1.4 | 500 | 0.02em | Metadata, helper text |

Tailwind helpers: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`,
`text-label`, `text-caption` (defined in `fontSize` config with line-height +
weight baked in). Always pair `text-display` with `tabular-nums`.

---

## 3. Spacing scale

4px base. Use these steps only — no arbitrary values.

| Token | px | Tailwind |
|---|---|---|
| `1` | 4 | `p-1` `gap-1` |
| `2` | 8 | `p-2` |
| `3` | 12 | `p-3` |
| `4` | 16 | `p-4` (default screen padding) |
| `6` | 24 | `p-6` |
| `8` | 32 | `p-8` |
| `12` | 48 | `p-12` |
| `16` | 64 | `p-16` |

Screen gutter: `px-4` (16px). Card padding: `p-4`. Section gap: `space-y-6`.

---

## 4. Radius, elevation, motion

- **Radius:** `rounded-lg` 16px (cards), `rounded-md` 12px (buttons/inputs),
  `rounded-sm` 8px (badges/chips), `rounded-full` (pills, toggles, avatars).
- **Elevation:** flat by default. Raised surfaces use `bg-surface-raised` +
  `border border-border` rather than heavy shadows. One shadow allowed:
  `shadow-lift` = `0 8px 24px rgba(0,0,0,0.4)` for sheets/modals.
- **Motion:** fast and physical. `transition-all duration-150 ease-out` for
  taps; `active:scale-[0.97]` on pressables. Rest-timer + streak use a 1s tick.
  Respect `prefers-reduced-motion` — the CSS-only rule (`app/globals.css`)
  covers CSS transitions/animations but **not** Framer Motion's JS-driven
  transforms; anything built on `components/marketing/Reveal.tsx` (§6) gets
  that fix via `useReducedMotion()` inside the shared wrapper instead of each
  caller having to remember it.

---

## 5. Touch targets

**Default minimum: 48px (`h-12`).** Buttons, input rows, toggles, nav items,
and any **standalone** icon action — a control that is the only (or dominant)
tappable thing in its row/area (favorite ★, delete 🗑, add-to-routine +, the
Daily 5 row-button, ghost/primary buttons). Primary actions `h-14` (56px).
Spacing between adjacent *independent* targets ≥ 8px so fat thumbs don't
cross into a different action mid-set.

**Dense in-row exception — 44px floor, never lower.** A small, named set of
mid-set logging controls packs several same-family options into one already-
dense row. These may drop to a firm **44px** minimum (not 48, never below 44)
when *both* hold:
1. The control is part of a grouped/segmented set of same-family,
   **non-destructive** options — reselecting a neighbor only changes a value,
   it never deletes or logs anything. In that case its segments may sit
   edge-to-edge with **no internal gap requirement** (a true segmented
   control, same as iOS's own pattern).
2. Any two controls that are **not** same-family — especially anywhere one is
   destructive — still need the full ≥8px gutter regardless of which band
   either one sits in.

This exception is scoped to exactly these controls, so §6's recipes and this
rule never contradict each other again:
- `SetLogRow`'s tempo-preset pills + Custom-tempo button/input
- `SetLogRow`'s AMRAP/dropset/half-rep segmented control
- `SetLogRow`'s L/R side toggle
- `/build`'s ▲/▼ reorder pair on picked-exercise rows (same-family,
  non-destructive — the adjacent ✕ remove button is a *different*, destructive
  action and stays at the 48px default with a full 8px gutter from the pair)
- `WorkoutStyleControl`'s Straight Sets/Circuit order toggle and its
  AMRAP/EMOM minutes-stepper `−`/`+` pair (same-family, non-destructive)

Nothing else gets to claim this exception without a doc update here first.

A decorative element nested inside a properly-sized tap target — e.g. the
28px checkbox glyph inside Daily 5's 48px+ row-button
(`components/daily5/ChecklistItem.tsx`) — is not itself "a target" and isn't
bound by either number; only the actual `<button>`/`<a>` wrapping it is.

---

## 6. Component patterns

Class recipes assume Tailwind + the tokens above. These are the source of truth
for Phase 4+ component builds.

### Selection state — never color alone

Every selectable tile/row pairs its `border-accent bg-accent/10` (or solid
accent fill) with a non-color signal, so state never depends on color
perception alone:
- **Full-width list row** (Goal/Intensity steps, `app/setup/page.tsx`;
  `WorkoutStyleControl`'s 4-style list): a trailing accent `●` dot, shown only
  when selected.
- **Checkbox-style row** (Equipment step): a `✓` inside a small bordered
  square that fills accent when selected.
- **Grid/emoji tile** (`MuscleDrillDown` — muscle picker + `FocusPicker` step
  1/2): a small accent-filled `✓` badge in the tile's top-right corner, so it
  doesn't crowd the centered emoji/label.

Pair with `aria-pressed` on plain toggle/select tiles, or an `aria-label` that
states the selection when the same button also carries `aria-expanded`
(disclosure tiles) — never rely on `border-accent` alone for assistive tech
either.

### Primary button
```
h-14 w-full rounded-md bg-accent text-on-accent text-label
flex items-center justify-center gap-2
active:bg-accent-press active:scale-[0.97]
transition-all duration-150 ease-out
disabled:opacity-40 disabled:active:scale-100
```

### Ghost button
```
h-12 rounded-md border border-border bg-transparent text-text-primary text-label
active:bg-surface active:scale-[0.97] transition-all duration-150 ease-out
```

### Row icon button (standalone)
Single icon action inside a list row (add-to-routine +, favorite ★, delete
🗑) — the row's only extra control beyond the row-tap itself. Full 48px
default (§5), not the dense-in-row exception.
```
flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-h2
active:bg-surface-raised                       (non-destructive)
active:text-red-500                            (destructive, e.g. delete)
```

### Set-log input row
One row per set: set #, weight input, reps input, tempo badge, set-type, ✓.
```
flex items-center gap-3 h-14 px-3 rounded-md bg-surface border border-border
```
- Number inputs: `w-20 h-12 bg-surface-raised rounded-md text-display text-2xl
  text-center tabular-nums text-text-primary` (large, centered, thumb-typed).
- Completed row: `border-success/40` + a `text-success` check.
- LOG SET is a Primary button (`h-14`) whose `disabled` state gates on
  validation — see "Log-set validation" below. Tempo, set-type and L/R
  controls below the inputs are the dense-in-row exception (§5) — see their
  own recipes.

### Log-set validation
LOG SET is **disabled** (`disabled:opacity-40`, same Primary-button recipe
above — no new pattern) until the set has a real value to log:
- Strength/reps mode: `reps` filled and ≥ 1. `weight` is intentionally **not**
  required — bodyweight moves are a valid logged set with `weight: null`.
- Timed mode (hold/cardio/carry): the seconds field (`reps`) filled and ≥ 1.

This removes the mis-tap-logs-a-blank-set failure at the source, rather than
cleaning it up after the fact.

### Undo (most-recent set only)
The **last** row in a exercise's completed-set list gets an inline "Undo" —
not a permanent delete affordance on every historical row (that's a bigger,
noisier change than the problem calls for). Undo disappears the moment the
next set for that exercise is logged; it's a grace-period correction for "the
thing I just did," not a session-log editor.
```
text-caption font-semibold text-destructive underline decoration-dotted
underline-offset-2 active:opacity-70
```
No confirm dialog — low-stakes and immediately reversible by relogging,
unlike the `window.confirm` reserved for irreversible actions elsewhere
(e.g. deleting a whole routine, `app/routines/page.tsx`).

### Tempo preset button (pill)
Interactive — dense-in-row exception (§5): same-family, non-destructive.
Shows eccentric-pause-concentric, e.g. `3-1-1`.
```
inline-flex items-center h-11 px-3 rounded-full bg-accent/15 text-accent
text-caption font-semibold tabular-nums
```
Active/selected: solid `bg-accent text-on-accent`. The Custom-tempo button and
its text input match the same `h-11` so the wrapped row stays visually even.

### AMRAP toggle
Segmented set-type control: `normal · amrap · dropset · half_rep`. Dense-in-row
exception (§5) — segments sit edge-to-edge inside the shared pill, no internal
gap.
```
inline-flex w-full rounded-full bg-surface-raised p-1
  > each option: h-11 flex-1 rounded-full text-caption
  > selected: bg-accent text-on-accent
  > amrap selected: bg-energy text-on-accent   (amber = push state)
```

### L/R side toggle
Unilateral moves. Dense-in-row exception (§5) — two segments, edge-to-edge,
no internal gap.
```
inline-flex rounded-full bg-surface-raised p-1
  > each side: h-11 w-16 rounded-full text-caption font-semibold
  > selected: bg-accent text-on-accent
```

### Workout style control
Two-tier picker for how a circuit runs once handed to SyncroFit (Intervals ·
For Time · AMRAP · EMOM) — `components/workout/WorkoutStyleControl.tsx`. Top
tier reuses the **full-width list row** recipe from the Intensity step
(`BuilderControls.tsx`'s `sheet === 'intensity'` list), not the emoji-tile
grid — these four options each carry a full-sentence hint ("As many rounds as
possible in the time"), which is what that row shape is for; the tile+corner-✓
grid (`MuscleDrillDown`) is reserved for short single-word labels.
```
space-y-2
  > each row: flex w-full items-center justify-between rounded-lg border p-3 text-left
              border-accent bg-accent/10 (selected) | border-border bg-surface
  > title: text-body font-semibold text-text-primary (emoji + label)
  > hint:  text-caption text-text-muted
  > selected signal: trailing accent ● (§6 selection-state rule)
```
Exactly one conditional second tier appears directly below the list, in the
same expanded-panel chrome `MuscleDrillDown` uses for its own drill-down
(`rounded-lg border border-border bg-surface-raised/50 p-2.5`) — never both at
once, since ordering and duration are mutually exclusive by style:
- **Intervals selected** → Straight Sets/Circuit order toggle. Reuses the
  AMRAP-toggle segmented recipe above with 2 segments instead of 4. Default
  Straight Sets.
- **AMRAP or EMOM selected** → a minutes stepper (BuilderControls' fine-tune
  row recipe: `− value +`, `h-9 w-9 rounded-full border` buttons; the value
  span gets `aria-live="polite"` so the new total is announced without
  refocusing), range 1–60 default 12. Quick-pick chips (`10 · 12 · 15 · 20`,
  the Tempo-preset pill recipe above) sit above the stepper so picking a
  common length doesn't mean up to 59 taps of `+`.
- **For Time selected** → no second tier; nothing to configure.

A persistent footer line under the control states the SyncroFit handoff
plainly, so picking AMRAP never implies the app itself runs a live AMRAP
clock:
```
text-caption text-text-faint
  intervals: "SyncroFit runs the timer when you send this workout."
  other:     "SyncroFit runs the {Style} clock — Live Elevated doesn't have a
              built-in timer for this style yet."
```
Two hosting shapes for the same `WorkoutStyleControl`:
- **Inline, always-visible** — the routine builder
  (`app/routines/[routineId]/page.tsx`), where a trainer is already editing a
  persistent, saved thing and the exercise list itself is fully expanded, not
  summarized behind a sheet.
- **Row + sheet** — a `STYLE` row added to `BuilderControls` alongside
  FOCUS/INTENSITY/EQUIPMENT (covers both the personal Home builder and the
  gym "For me" flow, which already share `BuilderControls`), and
  `WorkoutStyleRow` — a small standalone row+sheet wrapper around the same
  control — for hosts with no sheet plumbing of their own
  (`CustomWorkoutBuilder`). A repeat visitor who never touches it sees one
  calm "Change ›" row reading "Intervals," never the full list.

### Rest timer display
```
text-display tabular-nums text-text-primary   (MM:SS, 56px)
ring: accent stroke depleting; controls = ghost buttons
last 10s: text-energy + subtle pulse
```

### Exercise card
```
rounded-lg bg-surface border border-border p-4 space-y-3
  > title: text-h3 text-text-primary
  > cue:   text-caption text-text-muted   (default_cue from schema)
  > footer: last-set summary + sparkline container
active:scale-[0.99] transition-transform
```

### Sparkline container (progressive overload)
```
h-12 w-full rounded-md bg-surface-raised/50 px-2 py-1
stroke = accent (#A3E635), 2px; PR point = energy dot
empty state: "No history yet" text-caption text-faint centered
```

### Daily 5 checklist item
```
flex items-center gap-3 h-12 px-3 rounded-md bg-surface
  > checkbox: h-6 w-6 rounded-md border-2 border-border
              checked → bg-accent border-accent with on-accent check
  > label: text-body text-text-primary, checked → line-through text-faint
streak pill (top of list): bg-energy/15 text-energy rounded-full
```

### Picked-list row controls (reorder / remove)
`/build`'s picked-exercise rows: ▲/▼ reorder (same-family, non-destructive —
dense-in-row exception, no gap needed between the pair) + ✕ remove
(destructive — full 48px default, ≥8px gutter from the reorder pair).
```
▲/▼: h-11 w-11 flex items-center justify-center rounded-md text-text-faint
     active:text-accent disabled:opacity-30 · stacked with gap-1 between them
✕:   h-12 w-12 flex items-center justify-center rounded-full text-destructive
     active:bg-surface-raised · ≥8px (gap-2+) from the ▲/▼ stack
```
The row's height grows to fit these targets — the buttons never shrink to fit
the row.

### Two admin-list patterns — pick by whether there's something to illustrate

An admin/trainer *managing* a list (not just browsing) has TWO valid layouts
now, chosen by whether the entity has a visual identity worth showing:

**Disclosure row** — `components/admin/LifecycleRow.tsx` +
`components/admin/ScopeSelect.tsx`. For flat, text-only entities: muscle
groups, tags, equipment names. Nothing to illustrate, so the per-row
disclosure IS the content. Used by `/admin/taxonomy` and `/admin/equipment`.
For muscle groups specifically, a term can also carry a parent (a "region" —
"Upper Body" grouping Chest/Back/Shoulders): `LifecycleRow`'s `indent` prop
nests a child directly beneath its parent row (`ml-5 border-l-4`, no separate
list component) and `components/admin/ParentSelect.tsx` — a sibling of
`ScopeSelect`, same single-`<select>` shape — sits in the panel to set it.
**Responsive:** stays single column at every width (§7) — a per-row
disclosure panel expanding inline breaks a grid's row heights, so these lists
trade width for a comfortable, capped reading column instead.

**Illustrated browse + sheet** — `components/workout/ExerciseBrowseList.tsx`
(search + equipment-grouped rows, shared with the trainee-facing `/exercises`)
plus `components/workout/ExerciseDetailSheet.tsx`'s optional `manage` block
(edit fields + `ScopeSelect` + archive/restore, appended below the sheet's
normal read content). For exercises specifically — an entity with a real
illustration (`ExerciseThumb`), where a flat text row would throw that away.
Used by `/admin/exercises`. This replaced an earlier `/admin/exercises` build
on `LifecycleRow` that hand-rolled its own plain list instead of reusing the
illustrated one — the layout choice matters, not just picking whichever admin
list you saw last. **Responsive:** the shared `md:grid md:grid-cols-2
lg:grid-cols-3` convention (§7) — nothing here expands inline, so multi-column
is safe and desktop screen real estate should be used.

Don't reach for a third pattern (a generic `<EntityAdminList>`, a
schema-driven form) to unify these two — they're deliberately different
because the underlying content is different.

Rules both encode:
- **A list is for reading first.** One scannable line per row: title/name, one
  meta line, an optional badge. Managing a row is the exception, not the
  default view.
- **Controls live behind one disclosure** — a per-row panel (`LifecycleRow`)
  or a shared modal sheet (`ExerciseDetailSheet`) — never stacked open on
  every row. A 19-term list is 19 lines, not 19 open forms.
- **Scope is ONE control, not several.** `ScopeSelect` is a single `<select>`
  — "Shared library — every gym" or a named gym — never a separate promote
  button plus a demote dropdown plus a move button for what is one property.
- **Badge the exception, not the rule.** Omit the badge for the common case
  (shared, live); reserve it for what's different — gym-owned
  (`tone: 'local'`) or archived. A badge on every row stops meaning anything.
- **Destructive actions are not the widest control in a panel.** Delete/Archive
  is a narrow, fixed-width button (`px-4`/`px-5`) sitting next to — never
  instead of — the primary Save/Rename action, which stays the wide one
  (`flex-1` or `w-full`).

```
<LifecycleRow title meta badge={…|null} archived flagged open onToggle>
  {/* per-row panel: wide Save/Rename · ScopeSelect · narrow destructive */}
</LifecycleRow>
```

```
<ExerciseBrowseList items query onQueryChange onSelect renderTrailing={badge} />
{/* onSelect opens: */}
<ExerciseDetailSheet exercise onClose manage={{ /* wide Save · ScopeSelect · narrow destructive, below the read content */ }} />
```

### Marketing sections (long-scroll sales pages)

Shared scroll-reveal + card recipes for the app's sales surfaces — `/pro`
(trainers/gyms) and the consumer sales content (`components/home/
ConsumerMarketing.tsx`, hosted at `/`'s first-time state and standalone at
`/welcome`) — so a second sales page doesn't reinvent motion or card shape.
Full consumer copy/IA: `.design/consumer-sales-home/DESIGN_BRIEF.md`. Hero
scale, social-proof slot, and the Pro exit-ramp callout below:
`.design/marketing-home-refinements/DESIGN_BRIEF.md`.

**Reveal wrapper** — `components/marketing/Reveal.tsx` (extracted from
`/pro`'s original inline definition). Exports `fadeUp`, `stagger`, and a
`<Reveal>` wrapper around Framer Motion's `whileInView`. Also the one place
`prefers-reduced-motion` gets honored for Framer Motion specifically, via
`useReducedMotion()` — the CSS-only rule in `globals.css` (§4) stops at
CSS transitions/animations and doesn't reach Framer Motion's JS-driven
transform interpolation, so this was a real (if minor) latent gap in `/pro`
before the extraction, now fixed once for every consumer.
```
fadeUp:   opacity 0→1, y 24→0, 0.5s easeOut
stagger:  staggerChildren 0.08s
<Reveal>: motion.div, whileInView (viewport once, margin -80px)
```

**Feature card** — `rounded-xl border border-border bg-surface p-5`, emoji
icon at `text-h2`, `text-h3 font-semibold` title, `text-body text-text-muted`
body. Grid: `sm:grid-cols-2 lg:grid-cols-3`.

**Numbered step card** — filled accent circle (`h-11 w-11 rounded-full
bg-accent text-on-accent text-h3 font-extrabold`) holding the step number,
`text-h3 font-semibold` title, `text-body text-text-muted` body. Grid:
`sm:grid-cols-2 lg:grid-cols-4`.

**Callout box** — `rounded-2xl border border-border bg-surface p-8
text-center`, `text-label text-accent` eyebrow, `text-h2 font-bold`
headline, optional 3-column `sm:grid-cols-3` row of fact tiles
(`rounded-lg border border-border bg-background p-3`).

**Micro-proof line** — one `text-caption text-text-faint` line under a
hero's primary CTA, built from live source counts (e.g.
`SAMPLE_EXERCISES.length`, `EQUIPMENT_ORDER.length` from `lib/exercises.ts`)
so marketing copy can never drift from the shipped library — never a
hand-typed number.

**Marketing hero headline** — a step above `h1` (32px, §2) reserved for a
long-scroll sales page's single top-of-page H1. First used at `/pro`
(`app/pro/page.tsx:102`); promoted to a documented shared recipe here once
`ConsumerMarketing`'s hero adopted the same treatment for visual parity
between the app's two hero states. Not baked into the `fontSize` token table
(§2) because it's a one-per-page headline, always applied as an explicit
class stack rather than a `text-*` shorthand:
```
text-balance text-[2.5rem] font-extrabold leading-[1.05] tracking-tight
sm:text-[3.5rem]
```
40px → 56px at `sm:`. Same top-end size as `display` (§2) but with a tighter
`1.05` line-height tuned for a headline sentence that wraps across several
lines, versus `display`'s `1.0` tuning for a single-line numeric readout.
Confirmed safe at a 320px viewport with the standard `px-5` section gutter —
every word in both hero sentences wraps comfortably inside the ~280px
remaining column; a hero is expected to wrap to multiple short lines on a
phone (`text-balance` distributes them evenly), that's not a defect.

**Social-proof section (empty-safe)** — Cialdini social proof, designed to
ship truthfully empty today and become a populated grid later with **zero
markup changes**. Backing data is one array —
`TESTIMONIALS: { quote: string; name: string; role: string }[]` — declared
at the top of the hosting file, empty (`[]`) until real quotes exist. The
section branches on `TESTIMONIALS.length`:
- **Empty (ship now):** one centered `<Reveal>` block — no card grid, no
  boxes. An empty card grid reads as broken; a single honest sentence reads
  as intentional. `text-label text-accent` eyebrow + `text-h2 font-bold`
  headline + one `text-body text-text-muted` line stating plainly that
  proof is on the way. Never a stat placeholder (`"0 workouts built"`) and
  never a "trusted by" logo row with no logos in it — both read as either
  fake or broken; a plain sentence reads as neither.
- **Populated:** `sm:grid-cols-3` grid of the Feature-card shell above —
  opening `"` glyph at `text-h2 text-accent`, `text-body italic
  text-text-primary` quote, `text-caption text-text-muted` `Name · role`
  attribution line.

Never fabricate a quote, name, gym, or usage number to fill this section —
same discipline as the Micro-proof line's live-sourced counts above: real
data or an honest gap, never invented. Sits after the last product-proof
section (e.g. a SyncroFit-style callout) and before any exit-ramp or Final
CTA — proof of the product, then proof of the people, then the ask.

**Quiet exit-ramp callout** — for a secondary, non-competing CTA embedded
inside otherwise single-audience sales content (e.g. Home's consumer pitch
surfacing a Pro path mid-scroll). Related to but visibly smaller/quieter
than the Callout box above — same rounded-2xl family, tighter footprint, a
muted (not accent) eyebrow/headline, and a Ghost button (§6) rather than a
Primary button, so it can never read as competing with the surface's real
CTA:
```
rounded-2xl border border-border bg-surface/60 p-6 text-center, max-w-2xl
  > headline: text-h3 font-semibold text-text-primary (not text-h2 — stays
    visually subordinate to the page's real section headlines)
  > body: text-body text-text-muted
  > CTA: Ghost button (§6), max-w-xs (narrower than a Primary CTA's max-w-sm)
```

---

## 7. Layout & navigation — responsive system

The app runs from a phone on a gym floor to a widescreen monitor at a front
desk. **Every surface reacts fluidly to viewport width via Tailwind
breakpoints — nothing sits inside a single unconditional `max-w-*` that just
centers a phone-width column on a 1440px screen.** That "mobile view stranded
in the middle of a desktop tab" look is a bug, not a fallback, wherever it
shows up. Per-surface implementation table, wireframes, and sequencing for
Kevin: `.design/responsive-system/DESIGN_BRIEF.md`.

**Three container tiers.** Pick the one that matches what the surface *is* —
never copy whichever class was on the last file you touched:

1. **`.shell`** (`app/globals.css`) — `mx-auto w-full max-w-md md:max-w-3xl
   lg:max-w-5xl`. For **list/grid browsing surfaces**: the exercise library,
   gym Today/Library/Build pool, and illustrated admin lists — anywhere a
   desktop user should see real multi-column use of the width. Always paired
   with the list's own `md:grid md:grid-cols-2 lg:grid-cols-3` (the existing
   `ExerciseBrowseList` / `ExerciseFilterPicker` / bare `<ul>` convention) so
   the container and the grid open up together — a wide `.shell` around a
   list that never breaks into columns is the same bug in a different shape.
2. **`.shell-tight`** (`app/globals.css`) — `mx-auto w-full max-w-md
   sm:max-w-lg lg:max-w-xl`. For **task-focused surfaces**: the returning-user
   home builder, workout logging, onboarding/setup wizards, Settings/Profile,
   Daily 5, and any single-column *sequential* list (a picked/ordered workout,
   a disclosure-row admin list). Grows enough to breathe on desktop without
   ever letting a set-log row, a form field, or a numbered step list stretch
   past a comfortable line length.
3. **Marketing** — no shared class; each section hand-picks `max-w-6xl`
   (page/nav wrapper) or `max-w-5xl` + `sm:grid-cols-2 lg:grid-cols-3` (feature
   grids), the existing `/pro` / `ConsumerMarketing` convention. Full width,
   real multi-column — these are sales pages, not app chrome.

A **fourth pattern that is deliberately NOT part of this system**: modals and
bottom sheets (`BuilderControls`' change sheets, `ExerciseDetailSheet`,
`AddToRoutineSheet`) stay `max-w-md`, centered, at every viewport width. A
sheet is a focused overlay, not the page's reading column — matching its
width to the page underneath would make it feel like it's trying to fill the
screen instead of sitting on top of it.

- **Bottom tab bar** (thumb zone): Home · Exercises · Routines · Daily 5 ·
  Profile (`components/layout/BottomNav.tsx`). Fixed at **every** viewport —
  deliberate: this is a PWA, and a persistent bottom dock is the right
  native-feel affordance on a gym-floor phone *and* a reasonable persistent
  nav on a front-desk monitor, so it doesn't need a desktop-only sidebar
  variant. What changes with viewport is only the bar's own width: `max-w-xl`
  centered (a fixed, comfortable dock width, not tied to whichever content
  surface happens to be underneath it) so the 5 tabs get roomy spacing without
  ever spreading edge-to-edge on an ultrawide screen. `h-16`,
  `bg-surface/95 border-t border-border` with backdrop blur, active tab
  `text-accent`, inactive `text-text-faint`. Hidden on focus screens (active
  workout, gym/pro/share routes) so logging stays distraction-free.
- **Home utility strip** (`components/home/UtilityStrip.tsx`, mounted above
  the greeting `<header>` on `/` and above `ConsumerMarketing` on
  `/welcome`) — the one pairing where consumer chrome and trainer/Pro chrome
  coexist, because these are the only two screens serving both a consumer
  and a prospective/returning trainer or gym owner. A single right-aligned
  pair of plain-text links, no wordmark, no pill/border: `For gyms &
  trainers` (muted, → `/pro`) and `Trainer log in` (accent, → `/sign-in`).
  Each is `h-12` (48px, §5's nav-item default) via padding, not visible
  size, so the row stays visually slim. Full rationale:
  `.design/home-front-door/DESIGN_BRIEF.md`.
- **Consumer marketing** (`components/home/ConsumerMarketing.tsx`) — hero,
  features, "how the exercise builder works" walkthrough (paired with a
  static, non-interactive preview of `BuilderControls`' own row recipe —
  `components/home/BuilderPreview.tsx`), and a SyncroFit callout, selling
  the regular (non-trainer) user. Two hosts: `/`'s `!profile` branch
  (replacing the old thin "Set up your profile" card — a first-time
  visitor gets sold, not just funneled straight into a form) and the
  standalone `/welcome` route, reachable any time from returning-Home via a
  low-key `text-faint` link and shareable on its own. **Both hosts render it
  full-bleed, full-width** (marketing tier above) — `app/page.tsx`'s
  `!profile` branch renders `ConsumerMarketing` *outside* the returning-user
  `.shell-tight` app column, exactly like `/welcome` does, so a first-time
  visitor on desktop gets the real sales layout instead of the app's narrow
  task column squeezing the pitch into a stranded ~448px strip. The
  returning-user app branch (header, today's plan, `BuilderControls`) is the
  only part of `app/page.tsx` that uses `.shell-tight` — it's a task surface,
  the marketing branch isn't. Full rationale:
  `.design/consumer-sales-home/DESIGN_BRIEF.md`.
- Safe-area aware: `pb-[env(safe-area-inset-bottom)]` so the tab bar clears the
  iPhone home indicator in standalone PWA mode.

---

## 8. PWA / native feel

- `display: standalone`, `theme_color: #121316`, `background_color: #121316`.
- App name **Live Elevated**, short name **Live Elevated**.
- No light-mode flash: `<html>` is dark by default (`color-scheme: dark`).
- Disable text-size-adjust and tap-highlight for native feel.

---

## 9. Print artifacts (posters, handouts)

The app is dark-mode-only, but a few surfaces exist purely **to be printed**:
`app/g/[slug]/poster` and the QR block on `app/dashboard/embed`. Printing the
dark theme as-is is unreadable — `text-primary` etc. are literal light-on-dark
CSS vars, so light text lands on white paper and disappears; this isn't fixed
by the browser's "print background graphics" toggle, because that only omits
*backgrounds*, not text color. So print artifacts do **not** inherit the app's
dark tokens — they render their own light "paper" surface, on screen and on
paper alike (what you see in the browser preview is what comes out of the
printer, not a dark-mode screen that mysteriously inverts at print time).

**Paper ink — literal hex, not the app's CSS vars, scoped to print surfaces only:**

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FFFFFF` | The page/card background |
| `ink` | `#0B0B0C` | Headline / primary text on paper |
| `ink-muted` | `#52525B` | Subhead / body text on paper |
| `ink-faint` | `#8B8B93` | Fallback URL, footer, captions |

The gym's `accent` (from `tenant.branding`) is still the one brand color that
carries onto paper — used for the QR's frame/border and for the gym name
inside the headline, **never as a large fill** (keeps ink cost down and keeps
accent-on-white contrast readable regardless of how light a gym's brand color
is). Read it as a literal hex (`tenant.branding.accent ?? DEFAULT_BRANDING.accent`)
via inline `style`, not the `text-accent`/`border-accent` Tailwind classes —
those resolve to `var(--accent)`, which only exists where `brandingToCssVars`
wraps the tree, and a print artifact should stay self-contained. The QR
modules themselves stay fixed `#0B0B0C` on `#FFFFFF` (the `qrcode` lib's
`dark`/`light` options, already used this way in `build/page.tsx` and
`dashboard/embed/page.tsx`) — recoloring the modules risks scan failures, so
branding lives in the frame around the code, never in the code.

**Print CSS contract** for any full-bleed print artifact — put this on the
root paper element:
```
print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]
```
so the accent border/fill survives even when "print background graphics" is
off. Pair with `print:hidden` on every control that only makes sense on
screen (layout toggles, Print button, back link) — the same convention
`app/g/[slug]/build/page.tsx` already uses. Don't force `@page { size: ... }`
to Letter or A4 — let the OS print dialog's paper selection stand, and lay
out content with `justify-between`/generous vertical whitespace so it
absorbs the ~0.7in height difference between the two sizes instead of
clipping either one.

---

_Change the visual identity by editing the `accent` / `energy` tokens in
`tailwind.config.ts` + `globals.css`. Everything else cascades._
