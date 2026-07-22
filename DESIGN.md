# Vitality Tracker — Design System

> Canonical visual spec for the Vitality Workout Tracker PWA. Every screen and
> component references this file. Dark-mode first, gym-floor optimized: high
> contrast, fat-thumb tap targets, big number readouts.
>
> **Brand direction:** Brian Pruett's _Live Elevated / Vitality_ philosophy —
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
  Respect `prefers-reduced-motion`.

---

## 5. Touch targets

**Minimum 48px (`h-12`) for anything tappable.** Buttons, input rows, toggles,
nav items, badges-that-are-buttons. Primary actions `h-14` (56px). Spacing
between adjacent targets ≥ 8px so fat thumbs don't mis-tap mid-set.

---

## 6. Component patterns

Class recipes assume Tailwind + the tokens above. These are the source of truth
for Phase 4+ component builds.

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

### Set-log input row
One row per set: set #, weight input, reps input, tempo badge, set-type, ✓.
```
flex items-center gap-3 h-14 px-3 rounded-md bg-surface border border-border
```
- Number inputs: `w-20 h-12 bg-surface-raised rounded-md text-display text-2xl
  text-center tabular-nums text-text-primary` (large, centered, thumb-typed).
- Completed row: `border-success/40` + a `text-success` check.

### Tempo badge (pill)
Shows eccentric-pause-concentric, e.g. `3-1-1`.
```
inline-flex items-center h-8 px-3 rounded-full bg-accent/15 text-accent
text-caption font-semibold tabular-nums
```
Active/selected: solid `bg-accent text-on-accent`.

### AMRAP toggle
Segmented set-type control: `normal · amrap · dropset · half_rep`.
```
inline-flex rounded-full bg-surface-raised p-1 h-10
  > each option: h-8 px-3 rounded-full text-caption
  > selected: bg-accent text-on-accent
  > amrap selected: bg-energy text-on-accent   (amber = push state)
```

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

**Illustrated browse + sheet** — `components/workout/ExerciseBrowseList.tsx`
(search + equipment-grouped rows, shared with the trainee-facing `/exercises`)
plus `components/workout/ExerciseDetailSheet.tsx`'s optional `manage` block
(edit fields + `ScopeSelect` + archive/restore, appended below the sheet's
normal read content). For exercises specifically — an entity with a real
illustration (`ExerciseThumb`), where a flat text row would throw that away.
Used by `/admin/exercises`. This replaced an earlier `/admin/exercises` build
on `LifecycleRow` that hand-rolled its own plain list instead of reusing the
illustrated one — the layout choice matters, not just picking whichever admin
list you saw last.

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

---

## 7. Layout & navigation

- **Mobile-first**, max content width `max-w-md` centered on larger screens.
- **Bottom tab bar** (thumb zone): Log · Routines · Progress · Daily 5. Fixed,
  `h-16`, `bg-surface border-t border-border`, active tab `text-accent`.
- Safe-area aware: `pb-[env(safe-area-inset-bottom)]` so the tab bar clears the
  iPhone home indicator in standalone PWA mode.

---

## 8. PWA / native feel

- `display: standalone`, `theme_color: #121316`, `background_color: #121316`.
- App name **Vitality Tracker**, short name **Vitality**.
- No light-mode flash: `<html>` is dark by default (`color-scheme: dark`).
- Disable text-size-adjust and tap-highlight for native feel.

---

_Change the visual identity by editing the `accent` / `energy` tokens in
`tailwind.config.ts` + `globals.css`. Everything else cascades._
