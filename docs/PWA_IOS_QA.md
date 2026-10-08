# iOS PWA install & offline — pass criteria and QA record

**Card:** Verify PWA install and offline behavior on real iPhone hardware and document pass criteria
(`6152942f-bc47-4927-8543-4d02508cc942`)
**Written:** 2026-10-08
**Scope of this document:** the pass criteria, the code-level audit behind each one, and the
device record to fill in. It is the QA gate the project was missing — previously "Build the
navigation shell + PWA install flow" was marked Done with no definition of done for iOS.

---

## 1. How this was verified, and what could not be

**Verified from source**, by reading the files named below in the committed tree.

**Not verified:** anything requiring the network or a device. This session's sandbox denied all
outbound network, so the live site at `https://www.liveelevated.fit` was never fetched and
`npm run build` could not complete (`next/font` fetches Inter from `fonts.googleapis.com` at build
time and failed). Consequently:

- No rendered `<head>` was inspected — the meta-tag conclusions below are read off
  `app/layout.tsx` and Next's documented metadata mapping, not off served HTML.
- Nothing on this list was observed on an iPhone. Sections 3 and 4 are predictions with the
  evidence attached; section 5 is the record a human fills in on the device.

Treat "Expected" below as "what the code says should happen", never as a result.

## 2. Pass criteria

Each criterion is a single yes/no with a named observation. A criterion with no observation is
not a pass.

| # | Criterion | Pass means |
|---|-----------|------------|
| C1 | Installs from Safari | Share → Add to Home Screen offers the app; icon lands on the Home Screen titled **Live Elevated** |
| C2 | Launches full-screen | Cold launch from the Home Screen icon shows **no Safari address bar and no bottom toolbar** |
| C2b | Nothing hides under the status bar | The topmost text/control on `/`, `/daily5`, `/plan` and `/settings` is **fully visible and tappable**, not behind the clock, battery or Dynamic Island |
| C3 | Offline shell | With the iPhone in Airplane mode, a **cold** launch from the Home Screen icon renders the app shell (nav + last-loaded screen), not Safari's "no internet" page |
| C4 | Icon at 180×180 | Home Screen icon is the lime chevron on the dark square, **sharp, not blurry, not a screenshot of the page** |
| C5 | Splash on cold open | Cold open shows a dark branded splash, **not a white flash**, before first paint |
| C6 | iOS 16 and iOS 17 | C1–C5 recorded on both majors, with any difference between them named |

## 3. Code audit — what each criterion rests on

### C1 / C2 — install and full-screen: expected PASS

- `app/layout.tsx:33-37` sets `appleWebApp: { capable: true, statusBarStyle: 'black-translucent',
  title: 'Live Elevated' }`. Next maps `capable: true` to
  `<meta name="apple-mobile-web-app-capable" content="yes">` — the tag iOS actually reads. The
  newer `mobile-web-app-capable` is also set (`app/layout.tsx:38-41`); that one is for Chromium
  and is not a substitute on iOS, so having both is correct rather than redundant.
- `app/manifest.ts:12` sets `display: 'standalone'`.
- `middleware.ts:38-44` — the matcher's extension exclusion list includes `webmanifest`, and the
  protected matcher is only `/dashboard`, `/onboarding`, `/admin`, `/g/*/branding`. So
  `/manifest.webmanifest` and `/` are not behind Clerk and an install is not gated on a login.
  **This was worth checking:** an auth wall on the manifest or start_url is the usual cause of a
  PWA that installs but opens to a sign-in page.

### C2b — content under the status bar: expected **FAIL**

This is the one finding that is not a device question. The combination
`statusBarStyle: 'black-translucent'` (`app/layout.tsx:35`) + `viewportFit: 'cover'`
(`app/layout.tsx:48`) means that in standalone mode the web view extends **behind** the status
bar: page content starts at y=0, under the clock and the Dynamic Island.

Compensating for that requires `env(safe-area-inset-top)`. Grepping the whole tree for
`safe-area` returns **seven matches, every one of them `safe-area-inset-bottom`**
(`components/layout/BottomNav.tsx:42`, `components/workout/WorkoutSession.tsx:219`, and five
bottom sheets). **`safe-area-inset-top` is used nowhere.** Top padding is instead a fixed
Tailwind step:

| Route | Top padding | Status-bar inset to clear |
|-------|-------------|---------------------------|
| `app/page.tsx:170` (the gym screen) | `pt-4` = 16px | ~47–59px on a notched/Dynamic Island iPhone |
| `app/daily5/page.tsx:60`, `app/plan/page.tsx:82` | `pt-8` = 32px | same |
| `app/settings/page.tsx:107`, `app/dashboard/page.tsx:30` and ~12 more | `pt-10` = 40px | same |

So in the browser everything looks right — Safari's own chrome occupies that space. Installed,
the first element moves up under the status bar, worst on `/`, the screen used during a workout.
The bottom edge is handled correctly everywhere; only the top was missed.

**Fix direction** (not applied here — this card verifies and documents, it does not change UI;
the fix is Kevin's lane): replace the fixed top padding with
`pt-[max(1rem,env(safe-area-inset-top))]` per route, or add a `pt-safe` utility in
`tailwind.config.ts` and use it, so one token covers every screen. Either way it needs a
screenshot from a real notched viewport before it ships.

### C3 — offline shell: expected **FAIL**

**There is no service worker in this repo.** Searched `app`, `components`, `lib`, `public`,
`next.config.mjs` and `package.json` for `navigator.serviceWorker`, `caches.`, `sw.js`,
`workbox` and `next-pwa`: no registration, no worker file, no plugin, no dependency. The single
grep hit for "offline" is a comment in `app/daily5/page.tsx:33` about localStorage.

Without a service worker, iOS standalone mode has no cache to launch from, so a cold open in
Airplane mode gets Safari's network-error page. A warm resume of an already-rendered screen may
survive from memory — which is exactly how this gap stays hidden if the test is done by
backgrounding the app rather than force-quitting it first. **C3 must be tested after a force-quit
(swipe up from the app switcher), or it proves nothing.**

Worth separating two things the card wording runs together: *last-loaded data* partly does
persist — Daily 5 checks, the active-session draft and the profile are in localStorage
(`lib/daily5.ts`, `lib/profile.ts`, `lib/account.ts`, `components/workout/StartSheet.tsx`). The
data is there; there is no cached shell to render it with.

**Fix direction** (a separate build card, not this one): a minimal service worker that
precaches the app shell and serves a stale-while-revalidate fallback. That is a real feature with
cache-invalidation consequences on a `git push`-deploys-instantly project, so it should be scoped
on its own card rather than bolted on inside a QA pass.

### C4 — 180×180 icon: expected PASS

`app/apple-icon.tsx` declares `size = { width: 180, height: 180 }`, `contentType = 'image/png'`,
and renders the lime chevron on `#121316` via `ImageResponse`. `apple-icon` is the Next file
convention that emits `<link rel="apple-touch-icon">`, which is what iOS uses for Add to Home
Screen — iOS does **not** read manifest icons for this. The artwork has no built-in padding, but
iOS only rounds the corners (it does not apply a maskable safe zone), and the chevron is well
inside the frame, so clipping is unlikely. Still a visual check, not a code check.

**Separate, real, and not an iOS problem:** `app/manifest.ts:16-19` lists only `/icon.svg` at
`sizes: 'any'` for both `any` and `maskable` purposes. There is no 192×192 or 512×512 PNG. iOS
doesn't care, so C4 can pass anyway — but a Lighthouse PWA audit will flag it and Android install
quality depends on it. That belongs to the sibling card "Add Lighthouse PWA and performance audit
task", and is noted there rather than fixed here.

### C5 — splash screen: **cannot be predicted, must be observed**

No `apple-touch-startup-image` link exists anywhere in the tree. Modern iOS generates a launch
image from the manifest's `name`, icon and `background_color` instead, and `background_color` is
`#121316` (`app/manifest.ts:13`) — dark, so the classic white flash should at least not be white.
Whether a *branded* splash with the icon appears, or just a flat dark screen, and whether iOS 16
behaves like iOS 17 here, is precisely what the device test is for. I am not going to assert an
iOS-version behaviour table from memory; that is how a QA doc becomes confidently wrong.

### C6 — two iOS majors

Needs either two physical devices or the Xcode Simulator with an iOS 16 runtime installed.
Note the limit before relying on it: the Simulator can exercise the meta tags, standalone display
and the icon, but Airplane-mode offline behaviour and a true cold-launch splash are not
faithfully reproduced there. C3 and C5 need real hardware on both versions, or the result has to
be recorded as device-only-on-17.

## 4. Summary of the prediction

| Criterion | Expected | Basis |
|-----------|----------|-------|
| C1 installs | Pass | meta tags + manifest present, start_url unauthenticated |
| C2 full-screen | Pass | `apple-mobile-web-app-capable` + `display: standalone` |
| C2b no status-bar overlap | **Fail** | `black-translucent` + `viewportFit: cover` with zero `safe-area-inset-top` usage |
| C3 offline cold launch | **Fail** | no service worker anywhere in the repo |
| C4 icon 180×180 | Pass | `app/apple-icon.tsx` at exactly 180×180 |
| C5 splash | Unknown | no startup-image; depends on iOS-generated fallback |
| C6 16 vs 17 | Unknown | no second runtime available to this session |

Two of the seven are expected to fail for reasons already readable in the code. That is the
useful output of this card: the device test should **confirm** C2b and C3 rather than discover
them, and the two fixes can be scoped before the phone is ever picked up.

## 5. Device record — to be filled in on the iPhone

Leave this table empty rather than guessed. One row per device.

```text
Device model:
iOS version:
Date tested:
Installed from:            (URL used — www.liveelevated.fit or a preview URL)

C1  installs ...................  PASS / FAIL   notes:
C2  full-screen ................  PASS / FAIL   notes:
C2b no status-bar overlap ......  PASS / FAIL   notes: (which screen, how much is hidden)
C3  offline cold launch ........  PASS / FAIL   notes: (force-quit first — confirm you did)
C4  icon sharp at 180 ..........  PASS / FAIL   notes:
C5  splash not a white flash ...  PASS / FAIL   notes: (branded? flat colour? which colour?)
```

**Procedure, in order** — C3 is last because Airplane mode has to come after a successful online
load, and the force-quit is the step that makes the test honest:

1. Safari → the live URL → Share → Add to Home Screen. Screenshot the Home Screen (covers C1, C4).
2. Force-quit Safari. Tap the icon. Screenshot the first screen (covers C2, C2b, C5 — watch the
   first half-second for the splash).
3. Open `/`, `/daily5`, `/plan`, `/settings` and screenshot the top of each (C2b per screen).
4. Let data load on `/`. Then: Airplane mode **on** → swipe up from the app switcher to
   **force-quit** the app → tap the icon again. Screenshot whatever appears (C3).
5. Repeat 1–4 on the second iOS major, or record that only one was available (C6).
