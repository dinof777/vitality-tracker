# Design brief — Home front door (consumer quick-build + Pro entry points)

Owner: Ivy (UX/UI). Advisory/design only for this pass — no build staffed yet.
Handoff target: Kevin. Grounded in the files below; read the referenced line
ranges before building, don't reinvent what's quoted.

---

## The ask

`/` (`app/page.tsx`) is the consumer app itself — no login, no Pro entry
anywhere on it. It needs to also work as the front door for gyms/trainers
(sign up or log in to Vitality Pro) **without** gating, shrinking, or pushing
below the fold the thing 95%+ of visits are actually there for: build a
workout in one tap.

## What exists already (reuse, don't rebuild)

- Consumer Home: `app/page.tsx:138-145` (`<main>` + `<header>` — eyebrow
  "LIVE ELEVATED" + time-of-day greeting + `StreakBadge`), then the
  today's-plan card / builder / "PICK MY OWN EXERCISES" for the profiled
  case, or the "Set up your profile" card for `!profile` first-timers
  (`app/page.tsx:149-164`).
- Global chrome: `app/layout.tsx:41-47` — only `BottomNav` (Home · Exercises
  · Routines · Daily 5 · Profile). No top bar exists anywhere in the app
  today.
- `/pro` marketing header for style reference: `app/pro/page.tsx:105-116` —
  sticky, "V" mark + "VitalityPro" wordmark, "Sign in" (muted) / "Start free"
  (accent pill). Its own "Sign in" link already points at `/sign-in`
  (`app/pro/page.tsx:112`) — so the target route is already the shared one.
- Auth: `/sign-in` and `/sign-up` (Clerk) both `forceRedirectUrl="/dashboard"`
  — i.e. logging in lands you on the **trainer** dashboard. Consumers have no
  account; the consumer app is entirely public/localStorage
  (`middleware.ts:7` only protects `/dashboard`, `/onboarding`, `/admin`,
  `/g/*/branding`).
- `DESIGN.md` §5 Touch targets — nav items default to **48px minimum**; §3
  Spacing scale — only the documented steps (4/8/12/16/24/32/48/64px), no
  arbitrary values.

## Decision: a slim, text-only utility row — no wordmark, no logo, no sticky

Add exactly one new row to `app/page.tsx`, directly above the existing
`<header>`. It carries **only** the two audience entry points, right-aligned,
plain text — no pill, no border, no background fill.

```
[                                          For gyms & trainers   Trainer log in]
LIVE ELEVATED                                                          🔥 3 days
Good morning
[today's plan / builder — unchanged, starts exactly where it does today]
```

**Copy (exact):**
- `For gyms & trainers` → `/pro`
- `Trainer log in` → `/sign-in`

**Why "Trainer log in" and not bare "Log in":** the routing nuance is real —
login forces `/dashboard`, a trainer-only surface, and consumers have no
account at all today. A neutral "Log in" invites a consumer to tap it
expecting *their* login and land somewhere that isn't for them. Labeling it
"Trainer log in" pre-frames the destination in the copy itself, so no
consumer taps it thinking it's theirs, and no new account concept has to be
invented to solve the ambiguity. This is a **copy fix**, not a routing fix —
flagged as a product question below, not designed around.

**Why "For gyms & trainers" and not just "For gyms" or "Pro":** matches the
owner's own phrasing ("if you're a gym or personal trainer") — a solo trainer
reading just "For gyms" could reasonably assume it excludes them. "Pro" is
shorter but requires the visitor already know the product name; spelling out
the audience is clearer for a first-time cold visitor, which is exactly who
this row exists for.

**Why no wordmark/logo on this row:** the row directly below it already
carries brand voice ("LIVE ELEVATED" eyebrow + greeting), and the browser
tab / PWA already carries the product name ("Vitality Tracker" —
`app/layout.tsx:14`). Prepending a third "Vitality" text label 20px above
"LIVE ELEVATED" is redundant stacked branding for zero incremental
orientation value, and costs vertical space the builder can't spare. `/pro`'s
full wordmark+logo lockup belongs to its own long-scroll marketing register;
Home is a short, one-task utility screen and should stay in that register.

**Why no extra "what this is" sentence:** the `!profile` first-time state
already carries that framing verbatim — "Pick your equipment, focus &
intensity so the app can build workouts on the fly" (`app/page.tsx:153-155`).
Adding a second explanation above it would duplicate, not clarify.

**Why muted for the Pro link, accent for the login link:** the two links
carry different urgency for their audiences. "For gyms & trainers" is
*discovery* for a prospect who may be here by accident — low-key, same
treatment as the existing secondary path styling (`text-text-muted`, compare
the "or build a different workout" toggle at `app/page.tsx:188`). "Trainer
log in" is a *decisive* action for someone who already has an account and
just wants back in — it gets `text-accent` so it reads as the more
purposeful of the two, without competing with the primary BUILD MY WORKOUT
button below (which stays the only *filled* accent surface above the fold).

**Why not sticky, why no visible border/pill despite 48px tap targets:** Home
is short, not a long scroll — nothing to keep pinned. Each `Link` gets `h-12`
(48px, §5's documented nav-item default) as an **invisible** hit area via
flex-center padding, not a visible button box — so the row reads as one slim
text line while still meeting the touch-target rule. This mirrors how the
row-icon-button pattern already separates visual size from tap size
elsewhere in `DESIGN.md` §6.

## Placement & spacing (file:line spec for Kevin)

`app/page.tsx`:

1. Line 138 — change `<main>`'s className from `pt-10` to `pt-4` (the new
   row supplies its own vertical rhythm; keeping `pt-10` on top of it would
   double up the breathing room the builder can't spare).
2. Insert immediately after line 138 (before the existing `<header>` at line
   139):

```tsx
<div className="mb-2 flex items-center justify-end gap-6">
  <Link
    href="/pro"
    className="flex h-12 items-center text-caption text-text-muted active:text-text-primary"
  >
    For gyms &amp; trainers
  </Link>
  <Link
    href="/sign-in"
    className="flex h-12 items-center text-caption font-semibold text-accent active:text-accent-press"
  >
    Trainer log in
  </Link>
</div>
```

3. Lines 139-145 (existing `<header>`) — **unchanged**.
4. Everything from line 147 down (`!ready` / `!profile` / profiled builder
   branches) — **unchanged**. No conditional hiding of the new row in any
   state; it renders for first-timers and returning users alike, since both
   need the same two exits.

`Link` is already imported at `app/page.tsx:4` — no new import needed.

**Net vertical cost:** old layout put the header content at `pt-10` = 40px
from the safe area. New layout: `pt-4` (16px) + row (48px tall, text
vertically centered) + `mb-2` (8px) = 72px before the header — a net **+32px**
on a phone screen, well under one line of the builder's own controls, and
`BuilderControls` + `BUILD MY WORKOUT` still land inside a standard phone
viewport (iPhone SE and up) without new scrolling to reach the primary CTA.

**Spacing scale compliance:** `pt-4`(16) / `mb-2`(8) / `gap-6`(24) / `h-12`(48)
are all documented steps in `DESIGN.md` §3 — no arbitrary values introduced.

## Responsive behavior at phone width

- Row width budget at the narrowest supported viewport (320px, minus `px-4`
  gutters = 288px content): "For gyms & trainers" (~145px) + `gap-6` (24px) +
  "Trainer log in" (~95px) ≈ 264px — fits with margin at 320px and above.
- If a future copy change or a locale ever pushes it past that budget, allow
  the row to wrap to two lines (`flex-wrap`) rather than truncate or
  overflow-scroll — a clipped link label is worse than one extra 20px row.
  Not needed at today's copy length; noting as the fallback so nobody reaches
  for `overflow-hidden`/`truncate` here later.
- `max-w-md` centering (existing, `app/page.tsx:138`) means this scales the
  same way the rest of Home already does on tablet/desktop widths — no
  separate breakpoint logic needed.

## Accessibility

- Both are real `<Link>` elements — native keyboard focus + default browser
  focus ring preserved (no `focus:outline-none` anywhere in this addition).
- No icon-only targets, so no `aria-label` needed beyond the link text itself
  — "For gyms & trainers" and "Trainer log in" are self-describing.
- Contrast: `text-muted` (#A1A1AA) and `text-accent` (#A3E635) against
  `background` (#121316, darker than the `surface` DESIGN.md already
  contrast-checks at ≥6:1) both clear WCAG AA comfortably.
- 48px tap targets meet §5's nav-item default; ≥8px gap between adjacent
  independent targets is exceeded (`gap-6` = 24px).

## Constraints check

- **App isolation** (the one that actually matters here): this change adds
  **navigation only** — two links to already-existing, already-isolated
  destinations (`/pro` marketing, `/sign-in` Clerk flow). It does not merge
  the consumer's localStorage profile with trainer/Clerk auth, does not add
  any new account concept, and does not change what `/dashboard` or
  `/sign-in` do. The consumer quick-build stays fully public and
  account-free, exactly as it is today.
- **Data-honesty / legal gating:** not applicable — no stats, claims, or
  consent content added.
- **Technical limits:** zero new state, zero new components, zero schema/API
  changes — two `Link`s and a padding/margin adjustment.

## Product decision to flag (not designed, per scope)

Today "Trainer log in" is unambiguous because trainers are the *only* people
with accounts. If Dino later wants consumers to have accounts too (saved
profiles across devices, etc.), the current binary (public localStorage app
vs. Clerk-trainer-only) will need a real decision about whether consumers get
their own identity or something lighter — **that's a product call, not a UX
polish**, and this brief deliberately does not assume or design toward it.

## DESIGN.md pattern added

New bullet under §7 "Layout & navigation" — **"Home utility strip"** —
documenting this as the one screen where consumer chrome and trainer/Pro
chrome coexist, and why it's scoped to `/` only (every other route stays
either pure consumer chrome via `BottomNav`, or pure trainer chrome via the
dashboard). See `DESIGN.md` diff below.
