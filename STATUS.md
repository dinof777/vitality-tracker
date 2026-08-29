# Live Elevated (vitality-tracker) — Status Board

**Last reconciled:** 2026-08-29

This repo is **Live Elevated** — a phone-first workout app, live to the public at
<https://www.liveelevated.fit>. It is really two products sharing one codebase:

1. **The training app** — anyone can open it, no account, no login. It builds you a workout from
   a 291-exercise illustrated library, logs your sets, plans your week, and hands the workout to
   the SyncroFit interval-timer app.
2. **Live Elevated Pro** — a white-label version. A gym or personal trainer signs up, gets a
   branded copy of the app at its own web address (`/g/<gym-name>`), and can share workouts and a
   private progress page with individual clients.

It is a Next.js site hosted on Vercel, deployed from the `main` branch of the private GitHub repo
`dinof777/vitality-tracker`, with its data in a Neon Postgres database.

This board is the record of what is in flight and what is waiting on Dino. It is not a changelog.
Every claim below was checked against the real thing on 2026-08-29 — a command that ran and its
exit code, a file read on disk, or the live website answering a request. **Where something could
not be checked, the entry says so instead of guessing.** Production settings and passwords were
deliberately not inspected; everything about the live site here comes from what the public side of
it says out loud.

**Read this first, because it frames everything else: nothing here is abandoned half-finished.**
The repo sat quiet from 2026-07-26 until today, when two loose ends closed: the AI-crawler index
now advertises only the gym that is actually live, and the type-checker is green for the first
time. There is **no work sitting on this laptop that does not also exist on GitHub**, the tests
all pass, the site builds, and the last two things that shipped — the bot-traffic caching fix and
today's index fix — were both confirmed working on the live site, not just in code. What follows
is the real, short list of loose ends.

---

## Blocked — on Dino

| # | Item | The decision |
|---|---|---|
| 1 | [BLOCKER] [since 2026-08-29] **The trainer side of the business is running on a "test/development" login system, not a real one.** Verified from the public page source alone: the live sign-in page at `https://www.liveelevated.fit/sign-in` loads its login service from `clerk.accounts.dev` using a key that begins `pk_test`. Those are the **development** credentials the login provider (Clerk) hands out for building — not the production ones. Two consequences confirmed today. (a) A development instance is capped at a small number of accounts and its sign-in pages can carry a development banner, so it is not something you can put real paying gyms on. (b) A visitor who goes to the trainer dashboard at `/dashboard` while logged out gets a plain **404 "page not found"** instead of being asked to log in — the response headers show the login service itself causing this (`x-clerk-auth-reason: protect-rewrite, dev-browser-missing`). So a trainer who bookmarks their dashboard and comes back the next day is told the page does not exist. | **Decide whether Live Elevated Pro is a real product you intend to sell.** If yes: create the production login instance and put its keys into the Vercel project settings — only Dino can do that, it is a password-type setting — and then re-check that logged-out `/dashboard` sends people to the login page instead of a 404. If no, and Pro is still a demo: say so, and the `/pro` sales page with its pricing section should come down or be marked "early access" so nobody signs up for something that cannot take them. **Note on limits:** whether the production keys already exist and simply are not wired up is **UNVERIFIED** — checking that means reading production settings, which was ruled out of scope for this board. |
| 2 | [MAJOR] [since 2026-08-29] **The trainee progress portal — the last feature built — has never been opened by a real person on the live site.** Shipped 2026-07-25 (`774d1c1`, plus a fix pass `8cf46ef`). It is the private link a trainer sends a client so the client can see their own weight, BMI, heart-rate-variability and workout count. It is code-complete, it has automated tests covering the data-loading half, and the designer (Ivy) reviewed screenshots of it before it shipped. What has **not** happened is anyone generating a real link on the live site and opening it as a client would. Verified from the public side today: `/portal/<made-up-token>` correctly returns 404, which proves the page exists and rejects bad links — it proves nothing about whether a *good* link works. A private link cannot be tested from outside without a trainer login. | **Dino (or any trainer account) needs to do this once: open a client in the dashboard, create a portal link, and open it on a phone.** Five minutes. Until that happens this feature is "built" but not "known to work," and it is the one that puts a client's body-measurement data on a public web address, so it is the worst one to find out about later. If the portal is on hold as a product idea, say that instead and it moves to Queued. |
| 3 | [MINOR] [since 2026-08-29] **Three product questions were asked in writing when the portal was designed and never answered.** They sit in the design brief (`.design/trainee-portal/DESIGN_BRIEF.md`, section 7), addressed to Dino by name. Verified they are still unanswered — nothing in the repo or the commit history records a decision. (a) When a client has no goal weight set, should the portal quietly leave the goal off, or should the trainer be nudged to set one before the link goes out? (b) Should the portal say "3 kg to go," or just show the numbers? The warmer wording cannot be built yet, because the database does not record whether a client is trying to *lose* or *gain* — adding that is a real change, not a wording tweak. (c) The 🔥 emoji next to the workout count — keep or cut? | **Answer (a), (b) and (c).** They are one-line answers each; only (b) implies any build work, and only if the answer is "yes, the warmer wording." The designer shipped the safe default for all three, so nothing is broken — but they were flagged as real questions, not rhetorical ones, and they will otherwise be rediscovered from scratch in six months. |

---

## In flight — owner named

**Nothing.** No specialist is working in this repo right now, and nothing is part-built.

Verified rather than assumed:

- `git status --short` showed **no changes of Dino's at all** — nothing modified, nothing
  half-saved, before and after this reconcile. (Four untracked files exist, all created by
  sessions photographing the live site: `capture.mjs`, `probe-overflow.mjs`, `fleet-design.png`,
  `fleet-design-mobile.png`. They are throwaway and were deliberately not committed.)
- **There is no work on this laptop that exists nowhere else.** `git log --branches --not
  --remotes` returned **nothing at all** — every commit on every local branch is also on GitHub.
  This is the check that matters after a disk failure, and it comes back clean.
- Three branches exist: `main`, `fix/llmstxt-tenant-directory-and-tsc-target` (today's shipped
  work, pushed, and already merged into `origin/main` — it is at the same commit, `81935d3`), and
  `phase-0-multitenant`. The last looks
  unpushed at a glance — Git reports it "ahead 1" — but that is misleading: its one extra commit
  (`7eedcaf`, 2026-06-08) is **already on `main`** and already on GitHub. Verified with
  `git branch --contains`. Nothing is at risk; the branch is simply stale, 122 commits behind.
- Last commit landed **2026-08-29** (`81935d3`, today) — the llms.txt/tsc fix in Settled. Before
  that the repo had been quiet since 2026-07-26.

---

## Queued — not started

### Work this repo owes someone else (inbound NEEDs)

**None.** Verified by reading every file in `~/dev/_needs/`: there is no `NEED-*-to-vitality-tracker-*`
document. This repo currently owes nothing to any other project.

One thing worth knowing, in the other direction: this app *shares* a file with the SyncroFit repo
(the agreed format for handing a workout to the timer app). Under the cross-repo rules, changing it
from this side has to go through a NEED. Verified today that the two are **in agreement** —
`npm run check:syncrofit` reports "In sync with the hosted contract (v2)."

### Findings from this reconcile

| # | Item |
|---|---|
| 1 | [MINOR] [since 2026-08-29] **`README.md` is still the untouched Create-Next-App boilerplate.** Verified by reading it — generic "run npm run dev" instructions, a link to the Next.js tutorial, and nothing whatsoever about Live Elevated. Anyone opening this repo cold learns nothing. Notable because the two *good* documents are already here and are genuinely detailed (`SITE.md` maps every page and database table, `DESIGN.md` is a 40KB design system) — it is only the front door that is empty. Owner: **Wren** (docs/DX). |
| 2 | [MINOR] [since 2026-08-29] **`SITE.md` has drifted from reality in two places.** (a) It says the exercise library holds **227** exercises; the live site's own auto-generated index says **291**, and that number is computed from the actual library file, so 291 is the truth and `SITE.md` is 64 behind. (b) It says the address `liveelevated.fit` is "pending DNS" — verified today that it is fully live, and `liveelevated.fit` correctly forwards to `www.liveelevated.fit`, both HTTP 200. Owner: **Wren**. |
| 3 | [MINOR] [since 2026-08-29] **A design decision document still says "not yet implemented" — it was implemented a month ago.** `.design/g-slug-caching/DECISION.md` carries the status line *"Approved recommendation — build-ready. Not yet implemented."* Verified false: it shipped across four commits on 25–26 July and is confirmed working in production today (see Settled). Anyone reading that folder cold would conclude a month of work is still outstanding. Owner: **Wren** to correct the status line; the decision itself was **Elena's**. |
| 4 | [MINOR] [since 2026-08-29] **One known security shortcut is written down in the code and never closed.** In `app/api/brand-scrape/route.ts` — the feature where a trainer pastes their own website address and the app pulls their logo and colours out of it — there is a guard stopping that from being pointed at private internal addresses. The comment above it says a fully hardened version would also pin the address it resolves to, and marks that as a TODO. This is the **only** TODO/FIXME/HACK comment in the entire codebase (verified by searching every source folder). Real but narrow: it requires a trainer account to reach. Owner: **Nolan** (TypeScript/Node backend). |
| 5 | [MINOR] [since 2026-08-29] **A known bot-cost risk was deliberately left open and nobody is watching it.** The July caching work closed the expensive hole (bots hammering one real gym page with junk web addresses). The design document flags a smaller, still-open one: a bot inventing gym names that don't exist (`/g/asdf1`, `/g/asdf2`, …) still costs one server call per new fake name. Verified live that a made-up name returns 404 as expected. The document's own instruction was *"watch it in the post-ship metrics"* — no evidence anyone has, because checking Vercel usage figures needs an account login, which is **UNVERIFIED from here**. Owner: **Cal** (infrastructure) to look at the Vercel usage page once. |
| 6 | [MINOR] [since 2026-08-29] **Every branded gym page shows the platform's name in the browser tab, not the gym's.** Verified live: the page source for `/g/ironforge` — a real, working, branded gym page that correctly says "Iron Forge" all over it — sets the browser tab title to `Live Elevated`. On a white-label product, whose entire promise is "your gym, your branding," the browser tab is a visible leak of the platform name. Small fix, real product point. Owner: **Ivy** (design call on the wording) and **Kevin** (build). **[2026-08-29] Built and verified, awaiting merge — NOT yet live.** Branch `fix/branded-gym-page-titles`, pushed to origin. All five `/g/<slug>` surfaces now export `generateMetadata` reading `lib/tenant-metadata.ts`, which derives the gym's name from `fetchTenantBySlug` with the shared `lib/tenant-directory.ts` as fallback — no second gym list. Title is the gym's name alone (`Iron Forge`, `Iron Forge — Exercise library`), no platform suffix; description, `og:title`, `og:site_name` and the Twitter tags were leaking the platform name too and were fixed in the same pass. 8 new tests, proven to fail against the pre-fix code; `tsc`, lint, build and the full suite (38 files / 449 tests) all green. Full write-up: `docs/FIX_GYM_PAGE_TITLES.md`. **The live site still serves `<title>Live Elevated</title>` until this is merged to `main`** — merge is **Cal's**. |
| 10 | [MINOR] [since 2026-08-29] **A phone touch target on the branded gym page is 17px tall.** Measured at a true 390px viewport: the "What happens when I tap this?" disclosure link under the SyncroFit button has a 17px hit box, against the ~44px minimum for a thumb. Every other control on the page measures 35–56px and is fine. Found while disproving finding #10 below; recorded rather than fixed, because it is a separate question from that one. Reproduce with `cd /Users/dinoflora/dev/vitality-tracker && npm run measure:viewport -- https://www.liveelevated.fit/g/ironforge 390 844`. Owner: **Ivy** (is the link the right control at all) then **Kevin** (build). |
| 7 | [MINOR] [since 2026-08-29] **The stale branch `phase-0-multitenant` can be deleted.** 122 commits behind `main`, last touched 2026-06-08, and its only distinct commit is already merged into `main` and on GitHub (verified — nothing would be lost). It exists only as clutter that makes the branch list look like there is unfinished work. Owner: **Cal**. Confirm with Dino before deleting, per the standing rule that branch deletion is never done unasked. |
| 8 | [MINOR] [since 2026-08-29] **Whether the live database has had the latest structural change applied is unverified.** Database changes in this project are applied **by hand** — they do not happen automatically when the site deploys. The repo holds 13 numbered change files, the newest being `0013`, which added the client-profile and body-measurement tables the trainee portal depends on. Whether the live database has actually had `0013` applied **cannot be checked from here** — it needs the database password, which this board deliberately did not touch. Strong circumstantial evidence that it has: the trainee-profile features that need those tables were built and shipped on top of them. Confirming it is one command Dino can run from the repo folder: `cd /Users/dinoflora/dev/vitality-tracker && npm run migrate` — it is safe to re-run and skips anything already applied. |
| 9 | [MINOR] [since 2026-08-29] **The trainee portal has no written design review on file, unlike every other recent feature.** Four other features each have a `DESIGN_REVIEW.md` saved in `.design/`; the trainee-portal folder has only the brief. A review clearly *did* happen — the commit message for `8cf46ef` lists Ivy's findings and the fixes applied to them — but it lives only in a commit message, so the reasoning is not findable where anyone would look for it. Recorded so it is not mistaken for a skipped review. Owner: **Ivy**. |

---

## Settled

Done **and** verified on 2026-08-29. Prune after about a week.

- **The reported phone overflow on the branded gym page was not real — the measuring tool was
  wrong, and the tool is now fixed.** This closes what this board carried as Queued finding #10,
  a MAJOR: *"the live `/g/ironforge` lays out 500px of content in a 390px viewport."* It does not.
  Measured against the live site with Chrome's device emulation (`Emulation.setDeviceMetricsOverride`,
  the same mechanism DevTools' device toolbar uses): **viewport 390px, content 390px, zero elements
  past the right edge** — and the same at 320px, on all four `/g/<slug>` surfaces, and at 768 /
  1024 / 1440. The four controls the finding named as cut off were each measured individually and
  all end at **370px** or less inside a 390px viewport, the layout's 20px gutter intact.
  **The cause of the false reading:** `capture.mjs` and `probe-overflow.mjs` size the viewport with
  `--window-size`, and **macOS Chrome refuses to open a window narrower than ~500px**, so the page
  was laid out at 500 and the screenshot then clipped back to 390 — which is why buttons *looked*
  cut off. Proved by asking for a 200px window and still being handed 500. The fix is a correct
  measuring tool, `npm run measure:viewport -- <url> <width> [--strict]`
  (`scripts/measure-viewport.mjs`): it refuses to report at all if the layout viewport it got is
  not the one requested, and names the offending elements widest-first when there is a real
  overflow. Proven to bite — pointed at a deliberate 500px-wide element it names it and exits 1;
  against the real gym page it exits 0. **No application code or CSS was changed**, and
  `overflow-x: hidden` was deliberately not reached for. `tsc` exit 0 and the full suite
  (38 files / 449 tests) unchanged and green. Full write-up: `docs/FIX_MOBILE_OVERFLOW.md`.
  *Worth keeping rather than pruning: this is the second time viewport-measuring tooling has misled
  a session in this repo — see the `browser-mobile-viewport` note.*

- **The site is live on both addresses and every public page works.** Checked one at a time
  against `https://www.liveelevated.fit`: home, `/welcome`, `/pro`, `/exercises`, `/routines`,
  `/plan`, `/daily5`, `/settings`, `/setup`, `/sign-in`, `/llms.txt`, `/robots.txt`,
  `/sitemap.xml`, `/manifest.webmanifest` — all HTTP **200**. The bare `liveelevated.fit`
  correctly forwards to the `www` version. Bad or private links (`/portal/<junk>`, `/s/<junk>`,
  a gym name that doesn't exist) correctly return 404 rather than an error page.
- **The expensive bot-traffic problem is genuinely fixed — confirmed in production, not just in
  code.** This was the point of the last four commits. The July incident was bots hitting one gym
  page with thousands of junk web addresses (`?v=1`, `?v=2`, …), each one billed as a fresh page
  build. Verified today by doing the same thing three times with random values against the real
  live gym page: all three returned `x-vercel-cache: HIT` — meaning Vercel served a stored copy
  and did **no** work. The gym's exercise library page behaves the same way. This is the strongest
  evidence on this board: the fix works where it matters, on the live site, under the exact
  traffic pattern that caused the bill.
- **The `/g/[slug]` crash that followed that fix is gone.** On 25–26 July the caching change broke
  the gym pages with a `DYNAMIC_SERVER_USAGE` error and had to be rolled back, then re-landed with
  a database-layer fix (`39360ca`). Verified live: `/g/ironforge` returns **200** and renders the
  real gym — the name "Iron Forge" appears in the page — as do that gym's exercise library, its
  workout builder and its printable QR poster.
- **The app's database is backed up, and the backup is confirmed real.** Not this repo's job — the
  nightly Neon backup is owned by the `pka-tools`/`life-os` side — but it is this repo's data, so
  it matters here. Verified in the job's own log: last successful run **2026-08-28**, producing a
  73,404-byte dump of the `vitality_tracker` database containing 129 objects, and then
  independently confirmed as synced to Google Drive. The scheduled job's last exit status is
  **0** (`launchctl list`), and its error log is empty.
- **The automated tests all pass, and none are switched off.** `npm test` exits **0**:
  **37 test files, 441 tests, 441 passed, 0 failed, 0 skipped** — re-run at the end of this
  reconcile, up from 36 files / 437 tests, the four new tests being the llms.txt manifest guards
  described below. Verified separately that there are no disabled or "to-do" tests hiding in the
  suite — searching every test file for the usual markers (`.skip`, `.todo`, `.only`) returns
  nothing. Worth noting what this does *not* prove: a green suite says the code is correct, never
  that a human can reach the feature on a screen. That distinction is exactly why Blocked #2 is
  where it is.
- **The site builds and the code-quality checker is clean.** `npm run build` exits **0**,
  generating 43 pages. `npm run lint` exits **0** with "No ESLint warnings or errors."
- **The two design-review items flagged as "should fix" on the Save-workout window were both
  fixed.** Verified in the current source, not taken on trust: the keyboard-focus bug (a focus
  instruction that pointed at nothing, so pressing the button never moved focus into the panel) is
  now correctly wired up in `StartSheet.tsx`; and the "Send exercise images" switch — which used
  to look like a fourth equal option rather than a setting belonging to the option above it — now
  uses the indented, shaded nested style the design system already defines for exactly that. The
  related one-line correction to `DESIGN.md` about photo cropping was also applied. *These are
  confirmed in the code; they have not been re-photographed on a screen since.*
- **The AI-crawler index is live and computes itself, so its numbers cannot go stale.**
  `/llms.txt` returns 200 and reports 291 exercises across 19 equipment types — both read
  directly from the same library file that drives the app.
- **The index now advertises only the gym that is actually live — shipped and confirmed on the
  live site.** This closes the item this board carried under Blocked until today: `/llms.txt` was
  pointing AI crawlers at
  `/g/vitality` and three pages under it, all four of which return HTTP 410 "Gone" because that
  demo gym was switched off at the network edge during the July bot-traffic incident. Shipped as
  commit **`81935d3`** on `main`. Verified after the deploy by fetching
  `https://www.liveelevated.fit/llms.txt` (HTTP **200**) and reading the gym links out of the
  response: it now lists `/g/ironforge` and its exercises, build and poster pages — the gym that
  really is live — and **none of the four retired `/g/vitality` links appear anywhere in it.**
  The structural half matters as much as the fix: the manifest and the edge middleware now read
  **one shared switch**, `lib/tenant-directory.ts` — verified in the source that
  `app/llms.txt/route.ts` imports `liveShowcaseTenants` from it and `middleware.ts` imports
  `isRetiredTenant` from the same module — so the list of live gyms and the list of retired ones
  can no longer drift apart the way they did. Four new tests in `app/llms.txt/route.test.ts`
  assert the manifest against that module.
- **The type-check gate is green — `npx tsc --noEmit` now exits 0.** This closes the first item
  this board carried under Queued findings until today:
  the checker reported one error, `TS2802` in `lib/profile.test.ts`. The cause was not the test.
  `tsconfig.json` carried **no `target`**, so TypeScript fell back to a default below ES2015 and
  refused to iterate the value. The fix was to set `target: ES2017` in `tsconfig.json` — the
  config was wrong and was corrected, rather than the error being suppressed or the test rewritten
  around it. Shipped in the same commit, `81935d3`. Verified by re-running `npx tsc --noEmit` in
  this repo: **exit 0**, no output. The other gates are unchanged and still clean — `npm run lint`
  and `npm run build` both as recorded above.
- **The shared agreement with the SyncroFit app is in sync.** `npm run check:syncrofit` reports
  "In sync with the hosted contract (v2)."
- **The cross-repo safety wall is installed here.** `.claude/settings.local.json` blocks edits
  into the other 17 project folders under `~/dev`, so a session opened in this repo cannot
  accidentally change another project. This is the protection added after concurrent sessions
  damaged each other's work in August.
- **This repo owns no scheduled jobs of its own.** Verified: there is no `vercel.json`, so no
  Vercel scheduled tasks are defined; no scheduled job on this Mac names this project; and there
  is no personal crontab. So — unlike some other projects — there is no scheduled job here that
  could be silently failing.
