# Responsive system — DESIGN_BRIEF

**Owner:** Ivy (design). **Builder:** Kevin. **Status:** advisory brief, no build yet.
**Reference:** `DESIGN.md` §7 (canonical rule — read that first, this is the
implementation table + rationale behind it).

## The problem

The app was built mobile-first and almost every surface got clamped to a
single `max-w-md` (448px) container that just centers on desktop — so a
1440px monitor shows a phone-width column floating in a sea of background.
The worst instance is live right now: `app/page.tsx`'s `<main>` wraps BOTH
the returning-user app AND the first-time marketing pitch
(`ConsumerMarketing`) in `max-w-md`, so a brand-new visitor to the newly-live
domain — no localStorage, no profile — lands on a squished ~448px sales page,
while `/welcome` and `/pro` (which host the same content, or its trainer
equivalent) render correctly at `max-w-6xl`. **Fix that one first** — it's
the most visible break and it's isolated to one file.

## The system: three container tiers + one exemption

See `DESIGN.md` §7 for the canonical version of this. Two new utility classes
go in `app/globals.css` next to the existing `.shell`:

```css
@layer utilities {
  /* EXISTING — keep as-is. List/grid browsing surfaces. */
  .shell {
    @apply mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl;
  }

  /* NEW — task-focused surfaces. */
  .shell-tight {
    @apply mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl;
  }
}
```

- **`.shell`** — browsing/grid surfaces. Always paired with the list's own
  `md:grid md:grid-cols-2 lg:grid-cols-3` (already the convention in
  `ExerciseBrowseList`, `ExerciseFilterPicker`, and several bare `<ul>`s —
  see the table below for which ones already have it and which don't yet).
- **`.shell-tight`** — task-focused surfaces: builders, forms, logging,
  sequential/ordered lists. Grows from phone-width to a comfortable ~576–640px
  reading column, never further — a set-log row or a settings form field at
  1024px is worse UX than at 448px, not better.
- **Marketing** — no shared class, uses the existing `/pro` convention
  (`max-w-6xl` page wrapper, `max-w-5xl` + `sm:grid-cols-2 lg:grid-cols-3`
  feature grids). Nothing to change here except the `/` acute fix.
- **Modals/sheets — exempt.** `BuilderControls`' change sheets,
  `ExerciseDetailSheet`, `AddToRoutineSheet` stay `max-w-md` centered at every
  width. A sheet is an overlay, not the page's reading column; don't touch
  these.

## Acute fix — land first

**File:** `app/page.tsx`.

Today, one `<main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-4">`
wraps the `!ready` / `!profile` / returning-user branches together. Split it:

1. Move `<UtilityStrip />` + the `!profile ? <ConsumerMarketing /> : (...)`
   branch **out from under** the `max-w-md` main. Structure becomes:

```tsx
return !ready ? (
  <div className="min-h-dvh" />
) : !profile ? (
  // Marketing tier — full-bleed, exactly like /welcome.
  <div className="min-h-dvh bg-background pb-28 text-text-primary">
    <div className="mx-auto max-w-6xl px-5 pt-4">
      <UtilityStrip />
    </div>
    <ConsumerMarketing />
    {pending && params && <StartSheet ... />}
  </div>
) : (
  // App tier — task-focused, tight column.
  <main className="shell-tight flex min-h-dvh flex-col px-4 pb-28 pt-4">
    <UtilityStrip />
    <header>...</header>
    {/* today's plan / BuilderControls / etc, unchanged */}
    {pending && params && <StartSheet ... />}
  </main>
);
```

2. Swap the returning-user `<main>`'s class from `mx-auto flex min-h-dvh
   max-w-md flex-col px-4 pb-28 pt-4` to `shell-tight flex min-h-dvh flex-col
   px-4 pb-28 pt-4` (once `.shell-tight` exists in `globals.css`).
3. `StartSheet` (the bottom-sheet modal) is host-agnostic and already
   self-clamps — render it once, after whichever branch is active, not
   duplicated per-branch if that's easier structurally.

This is a **small, mechanical, one-file change** — no component logic moves,
only which container wraps `ConsumerMarketing` vs. the app branch. Update the
one now-stale line in `DESIGN.md` §7's "Consumer marketing" bullet — already
done in this pass — confirms both hosts render full-bleed.

## Per-surface table

| Surface | File(s) | Container | Column behavior | Effort |
|---|---|---|---|---|
| **Home marketing** (`!profile`) | `app/page.tsx` | `max-w-6xl` (marketing tier, matches `/welcome`) | `ConsumerMarketing`'s own internal grids (already responsive) | **Acute fix — small** |
| **Home app** (returning user) | `app/page.tsx` | `.shell-tight` (was `max-w-md`) | single column always (task flow) | Small — class swap, part of the acute-fix commit |
| **`/welcome`** | `app/welcome/page.tsx` | `max-w-6xl` | already correct | None |
| **`/pro`** | `app/pro/page.tsx` | `max-w-6xl` | already correct | None |
| **Workout logging** | `components/workout/WorkoutSession.tsx` | `.shell-tight` (was `max-w-md`, incl. the sticky Finish-Workout footer) | single column; `ExerciseCard`/`SetLogRow` are `w-full`, no change needed inside them | Small — 2 class swaps in one file |
| **Onboarding wizard** | `app/setup/page.tsx` | `.shell-tight` (was `max-w-md`) | single column (goal/intensity/equipment steps) | Small — class swap |
| **Exercise library** | `app/exercises/page.tsx` + `components/workout/ExerciseBrowseList.tsx` | `.shell` (already correct) | already `md:grid md:grid-cols-2 lg:grid-cols-3` — **no change** | None (verify only) |
| **Routines** | `app/routines/page.tsx` | `.shell` (was bare `<main className="shell ...">` — container already right) | **add** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` to the routine-card list (currently `space-y-3`, single column at every width) | Small — wrap change on one `<div>` |
| **Daily 5** | `app/daily5/page.tsx` | `.shell-tight` (was `.shell`) | single column (a checklist row is a task control, not a browsing tile — don't let it stretch to 1024px) | Small — class swap |
| **Settings / Profile** | `app/settings/page.tsx` | `.shell-tight` (was `.shell`) | single column for the form/history sections; the trainer-tools `grid-cols-2` block may grow to `sm:grid-cols-2 lg:grid-cols-3` since those are nav tiles, not form fields | Small — class swap + one grid tweak |
| **Trainer dashboard hub** | `app/dashboard/page.tsx` | `.shell` (already correct) | "START HERE" numbered steps stay single column (order matters, 1→5); **add** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` to the "MANAGE" link stack (currently individually `mt-3`-stacked full-width rows) | Small — wrap change |
| **Dashboard sub-pages** (`clients`, `workouts`, `equipment` — illustrated/browse lists) | `app/dashboard/{clients,workouts}/page.tsx` etc. | `.shell` (already correct) | already `md:grid md:grid-cols-2 lg:grid-cols-3` — **no change** | None (verify only) |
| **Dashboard sub-pages** (`exercises` — flat manage list, rename/archive, no illustration) | `app/dashboard/exercises/page.tsx` | `.shell` container is fine to leave, but **cap the list itself** at `max-w-2xl` (management row, not a browsing tile — see admin-list exception below) | single column | Small — wrap the `<ul>` |
| **Admin taxonomy / equipment** (`LifecycleRow` disclosure lists) | `app/admin/taxonomy/page.tsx`, `app/admin/equipment/page.tsx` | `.shell` container fine; **cap the `<ul>`** at `max-w-2xl` | single column always — a disclosure panel expanding inline breaks a grid's row heights, don't grid these | Small — wrap the `<ul>` |
| **Admin exercises** (illustrated browse + sheet) | `app/admin/exercises/page.tsx` | `.shell` | uses `ExerciseBrowseList` — already responsive | None (verify only) |
| **`/build` (personal builder)** | `app/build/page.tsx` | `.shell` stays for the page (the "ADD EXERCISES" `ExerciseFilterPicker` grid needs the width) | "YOUR SESSION" ordered picked-list + its header copy: wrap in `mx-auto w-full max-w-2xl` (sequential list, order matters — don't let it sprawl even inside a wide shell); "ADD EXERCISES" section: leave as-is, already `md:grid md:grid-cols-2 lg:grid-cols-3` | Medium — one wrapper `<div>` around an existing section, no logic change |
| **Gym Today** (`/g/[slug]`) | `app/g/[slug]/page.tsx` | `.shell` (already correct, via `TenantNav`'s own `.shell` header) | "Today's suggestion" list already `md:grid md:grid-cols-2 lg:grid-cols-3` — **no change** | None (verify only) |
| **Gym library** (`/g/[slug]/exercises`) | `app/g/[slug]/exercises/page.tsx` | `.shell` (already correct) | already `md:grid md:grid-cols-2 lg:grid-cols-3` — **no change** | None (verify only) |
| **Gym builder** (`/g/[slug]/build`) | `app/g/[slug]/build/page.tsx` | `.shell` stays for the page | Wrap `TenantBuilderControls` through the generated-workout `<ul>`, SyncroFit/Share/Save buttons, and QR box in `mx-auto w-full max-w-2xl` — same reasoning as `/build` above (sequential content, controls + numbered list). The "For me / My own" 2-col mode toggle and the tag-filter chip rows above it can stay full `.shell` width (small elements, harmless either way) | Medium — one wrapper `<div>` around most of the page body, no logic change |
| **Gym custom builder** | `components/workout/CustomWorkoutBuilder.tsx` (rendered inside the `.shell`/`max-w-2xl` zone above) | inherits parent wrapper | its own picked-list stays single column inside the `max-w-2xl` zone; `ExerciseFilterPicker` inside it already grids — if it's visually inside the `max-w-2xl` wrapper this caps the picker's grid to 2 columns max, which is an acceptable tradeoff for keeping the picked-list from sprawling. If Kevin wants the picker at full `.shell` width, structure the wrapper as a sibling split (picked-list in `max-w-2xl`, picker below spanning full `.shell`) — call is his to make mechanically, constraint is: **picked list never exceeds `max-w-2xl`** | Medium |
| **Gym onboarding** (trainer creates a gym) | `app/onboarding/page.tsx` | `.shell-tight` (was `.shell`) | linear form wizard — single column | Small — class swap |
| **Bottom nav** | `components/layout/BottomNav.tsx` | `max-w-xl` (was `max-w-md`) | n/a — fixed tab bar, stays a bottom dock at every width (see DESIGN.md §7 rationale) | Small — one class swap |
| **Print artifacts** (`/g/[slug]/poster`, `dashboard/embed`) | out of scope | unchanged | Print CSS is its own contract (DESIGN.md §9) — do not touch | None |

## Notes on sequencing for Kevin

1. **Land the acute fix first** (`app/page.tsx` split) — it's isolated,
   high-visibility, and doesn't depend on `.shell-tight` existing... actually
   it does (step 2 of the acute fix uses `.shell-tight`), so land the
   `globals.css` addition of `.shell-tight` in the *same* commit as the
   `app/page.tsx` split. That's still a two-file, mechanical commit.
2. **Then the other `.shell-tight` swaps** (`WorkoutSession.tsx`,
   `app/setup/page.tsx`, `app/daily5/page.tsx`, `app/settings/page.tsx`,
   `app/onboarding/page.tsx`, `BottomNav.tsx`) — all independent one-line
   class changes, safe to batch in one commit.
3. **Then the grid additions** on already-`.shell` pages (Routines,
   Dashboard hub's MANAGE block) — slightly more than a class swap (wrapping
   `space-y-*` divs in `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
   and dropping the redundant `space-y-*`), but still mechanical, no logic
   touched.
4. **Then the two-zone builder pages** (`/build`, `/g/[slug]/build`,
   `CustomWorkoutBuilder`) — the only genuinely "medium" work here, since it
   means adding a wrapper `<div>` around an existing JSX block rather than
   just swapping a className. No component logic changes; purely a layout
   wrapper.
5. **Everything marked "no change (verify only)"** is already correctly
   responsive (`ExerciseBrowseList`, `ExerciseFilterPicker`, and the several
   bare `<ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2
   md:space-y-0 lg:grid-cols-3">` lists already in `dashboard/clients`,
   `dashboard/workouts`, `g/[slug]`, `g/[slug]/exercises`) — a prior pass
   already applied this pattern in several places, just not everywhere. Kevin
   should screenshot these at `sm`/`lg`/`xl` widths as part of the
   design-review pass to confirm, not re-implement.

## Accessibility / interaction notes

- No new interaction states are introduced — this is a layout-only pass.
  Existing tap-target sizes (§5), selection-state signals (§6), and focus
  order are unaffected by widening a container; verify tab order still
  matches visual order once grids introduce multi-column reading order
  (screen-reader users still hit DOM order, which should stay
  reading-order-correct top-to-bottom-then-left-to-right for these grids —
  no `order-*` utilities anywhere in this plan, so this should already hold).
- The `.shell` → grid pairing must land together per row in the table above —
  a wide container with a list that doesn't also gain `md:grid-cols-*` is a
  regression (more empty space, not better use of it), not a partial fix.

## Non-negotiable constraints this respects

- **App isolation / gym theming:** none of these changes touch
  `brandingToCssVars` or any tenant-scoped styling — container-width classes
  are layout-only and apply identically regardless of which gym's `accent`
  is active.
- **Data honesty:** no content, copy, or counts change — this is purely how
  wide the existing content is allowed to render.
- **Mobile experience preserved exactly:** every `.shell` / `.shell-tight`
  value at the base (no-prefix) breakpoint is unchanged from today's
  `max-w-md` — nothing shifts below `sm`/`md`, so the gym-floor phone
  experience is bit-for-bit the same as before this pass.
