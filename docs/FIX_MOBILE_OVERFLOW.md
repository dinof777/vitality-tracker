# The branded gym page does not overflow on a phone — the measuring tool did

**Date:** 2026-08-29 · **Branch:** `fix/mobile-overflow-measurement` · **Board item:** STATUS.md,
Queued finding #10 ("[MAJOR] The live branded gym page overflows horizontally on a phone").

**Verdict: the defect does not exist.** `https://www.liveelevated.fit/g/ironforge` lays out at
exactly 390px in a 390px viewport, with zero elements past the right edge. The "500px of content
in a 390px viewport" on the board is an artifact of how the page was measured, not a property of
the page. What is fixed here is the measurement, and the board entry it produced.

---

## 1. Reproducing the reported number

The board's own reproduction command was run first, unchanged, against the live site:

```
$ cd /Users/dinoflora/dev/vitality-tracker
$ node capture.mjs https://www.liveelevated.fit/g/ironforge /tmp/m.png 390 844
WARNING: content is 500px wide at a 390px viewport (horizontal overflow).
/tmp/m.png: 390x1234 (page 500x1234, viewport 390x844)
```

The warning reproduces exactly as the board describes it. So the finding was recorded in good
faith — that really is what the tool says.

## 2. Why that number is not about the page

`capture.mjs` and `probe-overflow.mjs` both size the viewport by passing `--window-size=390,844`
to headless Chrome. **Chrome on macOS will not open a window narrower than ~500 CSS px** and
silently clamps the request. The page is then laid out at 500px, and `Page.captureScreenshot`
clips the image back to the requested 390 — which is why the screenshot appeared to cut off the
right-hand end of the buttons. The layout was never 390 wide; the *photograph* was.

Proved by asking for a width the page cannot possibly be responsible for. If 500 were a property
of the page, requesting a 200px window would still report 500 — and it does:

```
$ node probe-overflow.mjs https://www.liveelevated.fit/g/ironforge 200 844
{ "vw": 500, "scrollWidth": 500, "count": 0, "worst": [] }
```

`document.documentElement.clientWidth` comes back **500 for a requested 200**. The 500 is the
browser window's floor on this operating system, independent of the URL. Any overflow measured
this way at any width below 500 is a guaranteed false positive.

Note the second signal that was there all along and was not read: `"count": 0` — even at that
clamped 500px width, the probe found **no element** sticking out past the viewport. A page 500px
wide inside a 500px viewport is not overflowing.

This matches the standing note in this repo's memory, `browser-mobile-viewport`: *tooling in this
environment cannot render a true mobile viewport; measure element geometry instead.*

## 3. Measuring it honestly

`Emulation.setDeviceMetricsOverride` (CDP) sets the layout viewport directly and is **not** subject
to the window minimum. That is what Chrome DevTools' own device toolbar uses, and it is what the
new `scripts/measure-viewport.mjs` uses.

```
$ npm run measure:viewport -- https://www.liveelevated.fit/g/ironforge 390 844 --strict
https://www.liveelevated.fit/g/ironforge
  viewport 390px · content 390px · 0 element(s) past the right edge
  OK — no horizontal overflow.
exit=0
```

### Before / after, same URL, same day

| Measurement method | Reported viewport | Reported content width | Elements past the edge |
|---|---|---|---|
| `--window-size=390,844` (`capture.mjs`, the board's command) | 390 requested → **500 actual** | 500px | 0 |
| `--window-size=200,844` (control) | 200 requested → **500 actual** | 500px | 0 |
| `setDeviceMetricsOverride` 390×844 (`npm run measure:viewport`) | **390** | **390px** | **0** |
| `setDeviceMetricsOverride` 320×844 (iPhone SE) | **320** | **320px** | **0** |

The page tracks the viewport exactly at every width. There is nothing to fix in the layout.

## 4. The specific elements the board said were cut off

The board named four controls. Each was measured individually at a true 390px viewport
(`getBoundingClientRect`, absolute page coordinates, viewport right edge = 390):

| Control | Left | Right edge | Clipped? |
|---|---|---|---|
| `BUILD A WORKOUT` | 20 | **370** | no |
| `🔀 Refresh all` | 262 | **370** | no |
| `⏱ SEND TO SYNCROFIT` | 20 | **370** | no |
| `SAVE` (beside the workout-name field) | 293 | **357** | no |

All 17 interactive controls on the page were measured; **none** has a right edge past 390. The
widest right edge on the page is 370px — the layout's deliberate 20px gutter, intact on both
sides.

The page was also driven, not merely loaded: `🔀 Refresh all` was clicked (regenerating the
exercise list) and the "What happens when I tap this?" disclosure was expanded. Re-measured in
both states: `scrollWidth` 390, zero offenders.

## 5. The other surfaces and the other breakpoints

Every `/g/<slug>` surface, at both phone widths:

| Surface | 390px | 320px |
|---|---|---|
| `/g/ironforge` | 390 / 0 offenders | 320 / 0 offenders |
| `/g/ironforge/exercises` | 390 / 0 offenders | 320 / 0 offenders |
| `/g/ironforge/build` | 390 / 0 offenders | 320 / 0 offenders |
| `/g/ironforge/poster` | 390 / 0 offenders | 320 / 0 offenders |

Tablet and desktop on the main gym page, confirming nothing here regressed the wider layouts
(nothing could — no CSS was changed — but it was measured rather than assumed):

| Viewport | Content width | Offenders |
|---|---|---|
| 768px (tablet) | 768px | 0 |
| 1024px | 1024px | 0 |
| 1440px (desktop) | 1440px | 0 |

Full-page renders captured as proof: `fleet-design.png` (1440×900 viewport, page **1440×969**) and
`fleet-design-mobile.png` (390×844 viewport, page **390×1234**, captured with device emulation so
the layout viewport really is 390 — verified by the script before it writes the file). In the
mobile render every one of the four "cut off" controls is fully visible with even gutters.

## 6. What changed in the repo

No application code, no CSS, no component. Papering over a non-existent overflow with
`overflow-x: hidden` would have been actively harmful here — it would have hidden nothing,
disabled legitimate horizontal scrolling, and left a false MAJOR standing on the board.

Two things changed:

1. **`scripts/measure-viewport.mjs` + `npm run measure:viewport`** — the honest replacement for
   the command the board told the next worker to run. It refuses to report a number if the layout
   viewport it got is not the one asked for, names the offending elements widest-first with their
   DOM path when there is a real overflow, and exits 1 under `--strict`. It follows the existing
   `scripts/*.mjs` convention (read-only, network-only, deliberately not part of the build) rather
   than adding a new kind of thing.
2. **`STATUS.md`** — finding #10 moved out of Queued and recorded as resolved-as-not-a-defect,
   with the reproduction command corrected so it no longer sends the next worker to the tool that
   lies.

### Proof the detector actually bites

A checker that only ever prints "OK" proves nothing, so it was pointed at a page built to
overflow — a 500px fixed-width `div` at a 390px viewport:

```
$ node scripts/measure-viewport.mjs 'data:text/html,<meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div style="width:500px;height:40px;background:red">too wide</div></body>' 390 844 --strict
  viewport 390px · content 500px · 1 element(s) past the right edge
  Widest first — the first line is almost always the cause:
   · right 500px (width 500px, left 0px) "too wide"
     div < body < html
exit=1
```

It names the element, its width, its position and its DOM path, and fails the exit code. Against
the real gym page the same command exits 0.

The guard was also exercised: a page with no `<meta name="viewport">` gets Chrome's 980px fallback
layout, and the script exits 2 with "REFUSING TO REPORT" rather than emitting a meaningless
overflow figure.

## 7. On tests

**No unit test was written, because a truthful one is not possible here.** The suite runs under
Vitest with jsdom, which has no layout engine — `getBoundingClientRect()` returns zeros for
everything, so any "does this overflow" assertion would pass identically against a correct layout
and a catastrophically broken one. Writing one would have added a green test that can never fail,
which is worse than no test.

The brief's fallback applies instead: the reproducible measurement above is the check.
`npm run measure:viewport -- <url> <width> --strict` is a real command with a real exit code, it
was proven to fail on a real overflow, and it keeps working after this session ends.

## 8. Gates

Run in this repo, before and after the change:

| Gate | Before | After |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | **exit 0** |
| `npm test` | 38 files / 449 tests, 449 passed | **38 files / 449 tests, 449 passed** |
| `npm run lint` | clean | **No ESLint warnings or errors** |

No test count moved, because no application behaviour changed.

## 9. What this leaves for Dino

Nothing to fix on the page. The one decision is whether to keep the board entry as a recorded
false positive (recommended — it is the second time this class of mistake has cost a session in
this repo) or delete it outright.
