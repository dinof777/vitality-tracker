# The gym-phone audit: how to run it, and the acceptance baseline

**Date:** 2026-10-08 · **Branch:** `mc-task-2edbf238-ed72-439e-aeb6-edd9d3e26c51` ·
**Board item:** "Add Lighthouse PWA and performance audit task to validate mobile-first objective"

**No audit has been run yet.** This document was written in an unattended run that could not start a
browser, reach the network, or execute anything. It contains (1) the procedure, (2) the budgets the
project is committing to, (3) three defects found by *reading the code*, one of which is fixed on
this branch, and (4) an empty score table for the first real run to fill in. **Every score cell below
is blank on purpose. Do not fill one in from memory or from a different page — a wrong baseline is
worse than no baseline**, which this repo already learned the hard way in
`docs/FIX_MOBILE_OVERFLOW.md`.

---

## 1. The budgets

| Metric | Budget | Where the number comes from |
|---|---|---|
| First Contentful Paint | **< 2000ms** | This card's definition of done, on simulated 4G |
| Largest Contentful Paint | < 2500ms | Core Web Vitals "good" threshold |
| Cumulative Layout Shift | < 0.1 | Core Web Vitals "good" threshold |
| Tap targets | **≥ 48px**, hard floor 44px | `DESIGN.md` §5 — not Lighthouse's laxer 48px-with-spacing rule |
| Text contrast | 4.5:1 small / 3:1 large | WCAG 2.1 AA |
| Lighthouse Performance | ≥ 90 | Set on the first real run; see §5 |
| Lighthouse Accessibility | ≥ 95 | Tap targets and contrast are the gym-floor ones |

Why FCP matters more here than on a normal site: this app is opened **between sets**, one-handed,
on gym wifi, for about four seconds at a time. A 3-second load is not a slow page, it is a failed
interaction.

## 2. Two tools, and which question each answers

**`npm run audit:mobile`** (`scripts/audit-mobile.mjs`, added on this branch) — the repeatable half.
It measures FCP/LCP/CLS under Lighthouse's own mobile throttling profile (1638kbps down, 150ms RTT,
4× CPU), then walks the live DOM for undersized tap targets and sub-AA text contrast, compositing
translucent backgrounds so the ratio is computed against the colour an eye actually sees. No new
dependency, so it can run on every change.

```
cd /Users/dinoflora/dev/vitality-tracker && npm run audit:mobile -- https://www.liveelevated.fit
cd /Users/dinoflora/dev/vitality-tracker && npm run audit:mobile -- https://www.liveelevated.fit --strict
```

It inherits the viewport discipline of `scripts/measure-viewport.mjs` and **refuses to print numbers
if device emulation did not take effect**, for the reason documented in `docs/FIX_MOBILE_OVERFLOW.md`:
Chrome on macOS will not open a window under ~500px, so any phone-width measurement taken with
`--window-size` is a guaranteed false positive.

**`npx lighthouse`** — the 0-100 scores, which `audit:mobile` deliberately does not try to compute.

```
cd /Users/dinoflora/dev/vitality-tracker && npx lighthouse https://www.liveelevated.fit \
  --preset=desktop=false --form-factor=mobile --screenEmulation.mobile \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output-path=/tmp/lh-home.html --view
```

Or by hand: Chrome DevTools → Lighthouse → **Mobile** → Analyze page load.

> **Lighthouse no longer has a PWA category.** It was removed in Lighthouse v12 (2024), so a current
> run returns Performance, Accessibility, Best Practices and SEO only, and there is no "PWA score"
> to record. Installability is now checked in DevTools → **Application → Manifest**, which is where
> the subtask "fix any PWA installability failures" has to be judged. `audit:mobile` prints the
> machine-checkable parts (HTTPS, manifest link, viewport meta, theme-color, apple-touch-icon,
> service-worker registration count).

## 3. Pages worth auditing

Auditing only `/` would miss the app. In priority order:

| Page | Why this one |
|---|---|
| `/` | The install target and `start_url`. Serves two different trees (first-time marketing vs. returning-user app), so audit it both ways. |
| `/workout/[id]` | The real product surface — used mid-set, one-handed. The tap-target and contrast numbers that matter most are here. |
| `/exercises` | 291 illustrated exercises; the one page where image payload could plausibly break LCP. |
| `/daily5` | The mobility checklist — pure tap-target territory. |
| `/g/ironforge` | The live branded tenant; a public, cacheable, bot-visited page. |
| `/portal/<token>` | Needs a real token (see STATUS.md "Blocked — on Dino" #2). Skip until one exists. |

## 4. Found by reading the code

### 4.1 FIXED on this branch — the bottom tab bar collapsed to ~30px on a notched iPhone

`components/layout/BottomNav.tsx` had the safe-area inset on the tab row itself:

```jsx
<ul className="flex h-16 items-stretch pb-[env(safe-area-inset-bottom)]">
```

With `box-sizing: border-box` (Tailwind preflight), padding-bottom is taken **out of** the fixed
`h-16`, not added below it. On an iPhone in standalone PWA mode the inset is ~34px, so the 64px row
has a ~30px content box, and the `h-full` tab links stretch to ~30px — **under `DESIGN.md` §5's 48px
nav default and under its "never below 44px" hard floor**, on the single control that most has to be
hittable one-handed mid-set. In a desktop browser the inset is 0 and the bar looks perfect, which is
why this survived review.

The fix moves the inset to the `<nav>`, so the bar extends below the row instead of eating it — the
row stays a full 64px and still clears the home indicator, which is what `DESIGN.md` §7 asks for.

**Unverified:** this was a code-reading fix. Nothing was built, run, or screenshotted. It needs a
look at `/` in iOS Simulator or on a real iPhone in standalone mode, and that is also the cheapest
moment to do the sibling card ("Verify PWA install and offline behavior on real iPhone hardware").

### 4.2 NOT fixed — there is no service worker, so the app does not work offline

`grep` for `serviceWorker`, `sw.js`, `workbox` and `next-pwa` across `app/`, `components/`, `lib/`,
`public/` and `scripts/` returns **nothing**, and `next.config.mjs` is empty. The manifest
(`app/manifest.ts`) is otherwise complete and correct.

What this does and does not break:

- **iOS Add to Home Screen still works.** Safari does not require a service worker to install, so
  the Home Screen icon and standalone display are unaffected.
- **Offline does not work at all.** Opened in a dead-zone corner of a gym, the installed app shows
  an error page, not a cached one. The project objective says "works like a native app," and the
  sibling card is specifically about offline behaviour.

**Left for Dino deliberately, not overlooked.** Adding a service worker is a feature, not an audit
fix, and a *wrong* one is worse than none: a bad cache strategy serves stale JS to already-installed
users and is genuinely hard to undo remotely. It also overlaps the sibling offline card. Routed to
Kevin with Elena on the caching strategy — see STATUS.md.

### 4.3 NOT fixed — the inactive tab label fails AA, but the colour is what DESIGN.md specifies

The bottom nav's inactive tabs are `text-text-faint` (`#6b7280`) on `bg-surface/95` (`#1b1c20`) at
`text-caption` — 12px, weight 600. Computed by hand:

| | value |
|---|---|
| Contrast ratio | **3.83:1** |
| WCAG AA needs (12px is not "large text") | 4.5:1 |
| Verdict | fails |

This is not an implementation slip — `DESIGN.md` §7 names `text-text-faint` as the inactive tab
colour, and §3 lists `text-faint` for "placeholders, disabled, captions" without a contrast figure
(it documents ratios for `text-primary`, `on-accent` and `text-muted`, all of which pass). So the
token is doing what it was told to do, and the token is the problem at caption size.

**Not changed here on purpose.** `--text-faint` is a global design token used across the whole app;
re-picking it is a design-system decision for Ivy, not something to slip into an audit branch
unreviewed. Two candidate fixes for her: lighten `--text-faint` until it clears 4.5:1 on `surface`,
or keep the token and use `text-text-muted` (7.25:1, passes) for the nav labels specifically.

## 5. The baseline — to be filled in by the first real run

Run both tools, then fill this in **with the date and the exact URL**. Until then it stays blank.

| | `/` | `/workout/[id]` | `/exercises` | `/daily5` |
|---|---|---|---|---|
| Date run | | | | |
| Performance | | | | |
| Accessibility | | | | |
| Best Practices | | | | |
| SEO | | | | |
| FCP (ms) | | | | |
| LCP (ms) | | | | |
| CLS | | | | |
| Tap targets < 44px | | | | |
| Contrast failures | | | | |

Once filled in, these become the acceptance baseline: a change that regresses a cell is a defect,
and `npm run audit:mobile -- <url> --strict` exits non-zero so it can gate a push.
