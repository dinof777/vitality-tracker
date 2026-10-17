# The gym-phone audit: how to run it, and the acceptance baseline

**Date:** 2026-10-08 · **Branch:** `mc-task-2edbf238-ed72-439e-aeb6-edd9d3e26c51` ·
**Board item:** "Add Lighthouse PWA and performance audit task to validate mobile-first objective"

**The audit has now been run. `/` is measured and §5 is filled in — see §6 for what the numbers
mean.** The run was executed by Dino on his own machine on 2026-10-08 against
`https://www.liveelevated.fit`, because the unattended runs that wrote this document have no network
and cannot start a browser. Every figure in §5 is pasted from that run's output; none of it is
inferred. Three of the project's budgets failed: **FCP, LCP and text contrast.**

The headline, because it changes who does the next piece of work: **two-thirds of the FCP miss is
time-to-first-byte, not payload.** Shrinking the bundle would not have moved it. §6.1 has the
evidence and the one cheap measurement that settles it.

This document was started in an unattended run that could read code but not run it, reviewed and
corrected in a second such run, and is now updated with real measurements in a third. It contains
(1) the procedure, (2) the budgets, (3) defects found by reading the code, one fixed on this branch,
(4) the measured baseline, and (5) the analysis and what is still open. Where a code-reading claim
and the live run disagree, that is called out rather than smoothed over — §6.3 is one such case and
is deliberately left unresolved instead of being decided from a desk.

### What the earlier code-reading passes verified (2026-10-08)

No browser and no network in either, so no measurement. What could be checked without one, was:

| Checked | How | Result |
|---|---|---|
| The nav fix in §4.1 is really in the code | read `components/layout/BottomNav.tsx` | confirmed — inset on `<nav>`, row keeps its full `h-16` |
| There is genuinely no service worker | `grep` across `app components lib public scripts next.config.mjs` | confirmed — the only hits are inside the audit script itself |
| The contrast figures in §4.3 | recomputed the WCAG formula from the real tokens in `app/globals.css` | **both were wrong; corrected below** |
| `scripts/audit-mobile.mjs` parses | `node --check` | passes |
| The three browser-side probe strings inside it compile | extracted from the source and compiled with `new Function` | all three pass — they had never been compiled before |
| Repo gates | `npx tsc --noEmit`, `npm run lint` | exit 0 / "No ESLint warnings or errors" |

Two things were **changed** as a result, both in `scripts/audit-mobile.mjs`:

- **`--strict` could never pass, which made it an inert gate.** The missing service worker was pushed
  onto the budget-failure list, so every run exited 1 — forever, by design, since §4.2 deliberately
  defers adding one. A gate that is always red is a gate nobody reads, and a real regression next to
  it looks like the same red it always was. The service worker is now a visible `WARN` labelled
  deferred-by-decision and is not counted as a budget failure.
- **The manifest was only checked for being *linked*, never read.** "manifest linked OK" was the
  whole report, which reads as a pass; a manifest can be present and valid and still not installable.
  It now fetches the manifest and prints `name`, `display`, `start_url` and every icon with its type,
  sizes and purpose, and flags a vector-only icon set — see §4.4, which that check surfaced.

Two of those three are now settled by the real run: §5 is measured, and `audit:mobile` does behave
correctly end-to-end — it emulated the phone viewport, did not trip its own "REFUSING TO REPORT"
guard, and produced all four sections. **The §4.1 nav fix is still unverified**, and §6.2 explains
why this run could not have verified it even in principle.

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

```bash
cd /Users/dinoflora/dev/vitality-tracker && npx -y lighthouse@12 https://www.liveelevated.fit \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output-path=/tmp/lh-home.html --view
```

Mobile emulation and 4G throttling are the Lighthouse CLI's **defaults**, so no form-factor flags are
needed — and an earlier draft of this file passed `--preset=desktop=false`, which is not a real flag
and would have made the command fail before it measured anything.

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
`text-caption` — 12px, weight 600.

| | value |
|---|---|
| Contrast ratio | **3.52:1** |
| WCAG AA needs (12px is not "large text") | 4.5:1 |
| Verdict | fails |

**Corrected 2026-10-08.** The first draft of this file put the ratio at 3.83:1 and `text-muted` at
7.25:1. Both were wrong — recomputing the WCAG 2.1 relative-luminance formula from the actual token
values in `app/globals.css` (`--text-faint: #6b7280`, `--surface: #1b1c20`, `--background: #121316`)
gives **3.52:1** and **6.71:1**. The live run independently confirms the 3.52:1 figure to the digit,
so this pair is now measured rather than computed. The verdict does not change, and the real gap is
slightly worse than first reported. (The token is `--background`; an earlier draft of this paragraph
called it `--bg`, which does not exist in `globals.css` — the value was right, the name was not, and
a baseline document that miscites a token name invites the next reader to grep for nothing.) The
corrected `text-muted` figure also agrees with `DESIGN.md:36`, which independently
documents that pair as "≈ 6:1 (AA)"; 7.25:1 matched nothing and appears to have been produced from
memory rather than computed. Compositing makes no difference here, which is worth recording so
nobody re-derives it: `surface/95` over `bg` resolves to `#1b1c20` — the same colour — because the
two tokens are three or four values apart per channel.

A wrong number in a document whose stated job is to be the acceptance baseline is the specific
failure this repo already has a postmortem for (`docs/FIX_MOBILE_OVERFLOW.md`), which is why it is
corrected in place and the correction left visible rather than quietly overwritten.

This is not an implementation slip — `DESIGN.md` §7 names `text-text-faint` as the inactive tab
colour, and §3 lists `text-faint` for "placeholders, disabled, captions" without a contrast figure
(it documents ratios for `text-primary`, `on-accent` and `text-muted`, all of which pass). So the
token is doing what it was told to do, and the token is the problem at caption size.

**Not changed here on purpose.** `--text-faint` is a global design token used across the whole app;
re-picking it is a design-system decision for Ivy, not something to slip into an audit branch
unreviewed. Two candidate fixes for her: lighten `--text-faint` until it clears 4.5:1 on `surface`,
or keep the token and use `text-text-muted` (6.71:1, passes) for the nav labels specifically.

### 4.4 NOT fixed — every manifest icon is a vector, and no raster icon is declared

`app/manifest.ts` declares exactly two icons, both the same SVG:

```json
{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "maskable" }
```

This was missed on the first pass, which called the manifest "otherwise complete and correct" — it
is complete in its *fields*, and the icon set is the part that decides installability. Found only
because the audit script was changed to read the manifest rather than just confirm it is linked.

What is and is not at risk:

- **iOS Home Screen is unaffected.** Safari installs from `apple-touch-icon`, which exists and is a
  real 180×180 PNG (`app/apple-icon.tsx`), not from the manifest.
- **Chrome/Android installability is the open question.** Chrome's install criteria want a decodable
  icon of at least 192px, and its support for SVG manifest icons has varied across versions.

**Deliberately not "fixed" here, and not asserted either way.** Chrome's current behaviour is a
browser fact, not a code fact, so claiming a failure from a script would be exactly the guess this
document exists to prevent — and the fix (generating raster icons via `ImageResponse`, as
`apple-icon.tsx` already does) is a change that needs a build to verify, which this run cannot do.
`audit:mobile` now prints the full icon list and a `WARN` on a vector-only set; **the adjudication
is DevTools → Application → Manifest**, which either lists an install-blocking icon error or does
not.

**Status after the real run: confirmed as a fact, still unadjudicated as a defect.** The run
reproduced the icon list exactly — two entries, both `/icon.svg`, `image/svg+xml`, `sizes: any`, one
`any` and one `maskable` — so the vector-only set is now measured, not read. What the run did *not*
produce is Chrome's own verdict: the DevTools → Application → Manifest check was a separate,
optional ask and was not reported back, so **whether Chrome refuses to install is still unobserved.**

It is deliberately still not fixed here, and the reason is narrower than last time. The fix is two
`ImageResponse` routes (192px and 512px PNGs, the pattern `app/apple-icon.tsx` already uses
successfully) plus two manifest entries. That is easy to write and impossible to verify from an
unattended run with no build and no browser — and a *wrong* version of it is worse than the current
state: if a declared 192px PNG 404s, Chrome has a broken icon where it previously had a usable SVG,
turning a maybe-failure into a certain one. Shipping an unverifiable change to the install path of
an already-installed app is not a trade worth making to close a subtask. Routed to Kevin with the
one-line DevTools check as its first step. See STATUS.md #14.

## 5. The baseline — measured

**Source:** `node scripts/audit-mobile.mjs https://www.liveelevated.fit`, run by Dino on
**2026-10-08** on his own machine. Pasted from that run's output. One run, one page, cold — see
§6.1 before treating the timings as settled.

| | `/` | `/workout/[id]` | `/exercises` | `/daily5` |
|---|---|---|---|---|
| Date run | **2026-10-08** | not run | not run | not run |
| FCP (ms) | **3056** — FAIL (budget < 2000) | | | |
| LCP (ms) | **4896** — FAIL (budget < 2500) | | | |
| CLS | **0** — OK (budget < 0.1) | | | |
| TTFB (ms) | **2048** | | | |
| Transferred | **~612 KB** | | | |
| Tap targets < 48px | **0** — OK (but see §6.2) | | | |
| Contrast failures | **2** — FAIL (see §6.3) | | | |
| Performance score | not run — needs `npx lighthouse` | | | |
| Accessibility score | not run — needs `npx lighthouse` | | | |
| Best Practices score | not run — needs `npx lighthouse` | | | |
| SEO score | not run — needs `npx lighthouse` | | | |

**The four 0–100 Lighthouse scores are still unmeasured.** `audit:mobile` deliberately does not
compute them (§2); they need the separate `npx lighthouse` command. The three other pages in §3 are
also unmeasured — `/workout/[id]` especially, since it is the surface actually used mid-set and §3
calls it the one whose tap-target and contrast numbers matter most.

### PWA installability, as measured

| Check | Result |
|---|---|
| Served over HTTPS | OK |
| Manifest linked | OK — `/manifest.webmanifest`, name "Live Elevated", `display: standalone`, `start_url: /` |
| Maskable icon declared | OK |
| Raster icon declared | **WARN** — every icon is the same SVG; see §4.4 |
| `viewport` meta | OK |
| `theme-color` | OK — `#121316` |
| `apple-touch-icon` | OK — iOS Home Screen unaffected |
| Service worker registered | **WARN** — 0; deferred by decision, not a budget failure (§4.2). Offline does not work. |

These cells are the acceptance baseline for `/`: a change that regresses one is a defect, and
`npm run audit:mobile -- <url> --strict` exits non-zero so it can gate a push. **`--strict` is
currently red on this page** — FCP, LCP and contrast — so until those are closed it reports a known
state, not a clean gate. That is the honest position; it is not a reason to relax a budget.

## 6. What the numbers mean

### 6.1 The FCP miss is time-to-first-byte, not payload — and one warm re-run settles it

FCP was 3056ms against a 2000ms budget, and **TTFB alone was 2048ms** — 67% of it. Only ~1008ms was
spent between the first byte and the first paint. The 612KB transfer is real and worth trimming
eventually, but **no amount of bundle work moves a 2-second TTFB**, so anyone starting on payload
optimisation would be optimising the smaller third of the problem.

Two code facts, both checked rather than assumed, say the time is being spent before render:

- **`/` has no server-side data dependency at all.** `app/page.tsx` is `'use client'` and reads its
  state from `localStorage` and client fetches (`loadProfile`, `fetchRoutines`). There is no `await`
  on Supabase or Clerk in the server render path that could account for two seconds.
- **Every request to `/` still runs middleware.** `middleware.ts` exports `clerkMiddleware` and its
  matcher excludes only `_next` and a list of static file extensions — `/` matches, so an otherwise
  prerenderable page sits behind a function invocation. On a cold Fluid instance that is the one
  plausible source of ~2s on this route. (`/` is not in `isProtected`, so no `auth.protect()` call
  is made; the cost would be the invocation and Clerk's own initialisation, not an auth check.)

**The cheap measurement that decides whether there is any work here:** re-run the same command a
second time within a minute of the first, while the instance is warm. If TTFB drops to a few hundred
ms and FCP lands near 1.2s, the budget is met on a warm path and the "failure" was a cold start on a
low-traffic site — no code change warranted, just a note that cold starts cost ~2s. If TTFB stays
near 2s warm, the cost is structural and the work is real: narrowing the middleware matcher so
public routes skip it (Nolan), with Elena on the prior question of whether Clerk should sit in front
of public routes at all.

**Deliberately not done here.** Changing auth middleware on the strength of a single cold
measurement is the wrong order of operations, and this run can neither measure nor build. Recorded
as STATUS.md #15 with the warm re-run as its first step.

### 6.2 "0 tap targets under 48px" does NOT verify the §4.1 nav fix

This is the easiest line in §5 to misread, so it is worth stating flatly. The §4.1 bug was that
`pb-[env(safe-area-inset-bottom)]` on the tab *row* ate the row's fixed 64px height, collapsing the
tabs to ~30px. **`env(safe-area-inset-bottom)` is 0 in headless Chrome's phone emulation** — there
is no notch and no home indicator to inset for. So this run could not have detected the original bug
either, and a clean tap-target result is exactly what the *broken* code would also have produced.

The fix remains a code-reading fix with nothing built, run or screenshotted. It is settled only by
`/` in iOS Simulator or on a real iPhone **in standalone (installed) mode**, which is also the
cheapest moment to do the sibling card, "Verify PWA install and offline behavior on real iPhone
hardware."

### 6.3 The scan found two contrast failures; reading the code predicts three — unresolved

The run reported exactly two distinct failing combinations:

| Ratio | Needs | Where |
|---|---|---|
| **3.52:1** | 4.5:1 | 16px `text-faint` on `surface`: the `Change ›` affordance (`components/home/BuilderPreview.tsx:31`; the same span recurs 5× in `components/workout/BuilderControls.tsx` and once in `WorkoutStyleRow.tsx`) |
| **3.84:1** | 4.5:1 | 12px `text-faint` on `background`: the marketing stat line, `components/home/ConsumerMarketing.tsx:115` |

Both are `--text-faint: #6b7280` — the same root cause §4.3 already describes, now measured on two
different backgrounds. §4.3's 3.52:1 computation is confirmed to the digit.

**The discrepancy:** §4.3's headline example is the bottom nav's *inactive tab label*, and it was
not reported. Checked against the code, it should have been a third entry:

- `components/layout/BottomNav.tsx:58,62` — inactive tabs are `text-text-faint`, label is
  `text-caption` = `0.75rem` = **12px**, `font-semibold` = 600 (so `bold` is false under the
  script's `>= 700` test, and the threshold is 4.5:1, not 3:1).
- Its composited background really is `#1b1c20`: `bgOf` walks span → a → li → ul → `nav`
  (`bg-surface/95`, α 0.95, pushed) → `body` (`background: var(--background)`, opaque, pushed, walk
  stops), then composites `surface/95` over `#121316` → `#1b1c20`.
- The script's dedupe key is `color|bg|px|bold` (`scripts/audit-mobile.mjs:244`), so **12px on
  surface is a distinct key** from both reported rows (16px on surface, 12px on background). It
  could not have been collapsed into either.
- `BottomNav` does render on `/`: `HIDE_ON` is `/workout/`, `/g/`, `/pro`, `/s/`, `/portal/`, and
  `pathname` is `/`. Its `visible()` filter is permissive (non-zero box, not `hidden`/`none`/opacity 0).

So either the nav was absent from the scanned DOM for a reason not visible in the code, or one of
the four inputs above is not what the source implies at runtime. **Not resolved, and not decided
from a desk** — guessing here is how §4.3's two wrong contrast numbers got written in the first
place. One line in the DevTools Console on the live page settles it:

```js
(() => { const s = document.querySelector('nav a span'); const c = getComputedStyle(s); return { text: s.textContent, color: c.color, px: c.fontSize, weight: c.fontWeight, navBg: getComputedStyle(s.closest('nav')).backgroundColor }; })()
```

If it returns `#6b7280` at 12px, the scan missed a failure and the script needs a look. If it
returns something else, §4.3's example is stale and should be rewritten around the two combinations
that *were* measured.

**No token was changed here.** §4.3 already routed `--text-faint` to Ivy as a design-system
decision, and the run confirms it is a global problem (two surfaces, seven-plus call sites), not a
local slip — which makes it more her call, not less. A per-site swap to `text-text-muted` (6.71:1,
passes, and `DESIGN.md:36` already documents it) is the cheap alternative she may prefer for the
nav and the `Change ›` rows specifically. Either way it is a visible change to shared UI, and this
run can produce no preview screenshot to review it against. STATUS.md #13.
