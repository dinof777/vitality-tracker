# Lane 3 — `/llms.txt` drift and the failing type-check

**Date:** 2026-08-29 · **Repo:** `/Users/dinoflora/dev/vitality-tracker` · **Branch:** `fix/llmstxt-tenant-directory-and-tsc-target`

Two provable defects recorded on `STATUS.md` (Blocked #2, Queued-findings #1). Both fixed, both
proved by a test that was shown failing first.

---

## Gate results — before and after

Baseline was re-measured on this working tree before any edit, to confirm the board was still
accurate. It was.

| Gate | Command | Before | After |
|---|---|---|---|
| Type-check | `npx tsc --noEmit` | **exit 1** — 1 error, `lib/profile.test.ts(43,24)` TS2802 | **exit 0** — no output |
| Tests | `npm test` | **exit 0** — 36 files, 437 tests, 437 passed | **exit 0** — 37 files, 441 tests, 441 passed |
| Lint | `npm run lint` | **exit 0** — "No ESLint warnings or errors" | **exit 0** — same |
| Build | `npm run build` | **exit 0** — 43 pages generated | **exit 0** — 43 pages generated |

Net: the one red gate is now green, and the three green gates stayed green. Four new tests, no
tests removed, none skipped.

---

## Defect 1 — `/llms.txt` advertised four dead pages and omitted the live one

### Was it static or dynamic? **Dynamic — and still wrong.**

`app/llms.txt/route.ts` is a Next.js App Router **Route Handler** (`export async function GET()`,
`export const dynamic = 'force-dynamic'`), not a `public/llms.txt` file. It already complied with
the standing rule in shape. There is no `public/llms.txt` in the repo (checked).

So the interesting question was the one the brief asked second: **why did the source it reads
disagree with what the middleware serves?**

### Why it drifted

The route computed *some* of itself from source-of-truth modules and *hardcoded* the rest:

- The exercise and equipment counts came from `lib/exercises` — those have never drifted, and the
  board confirms `/llms.txt` reports the true 291 / 19 while `SITE.md` says 227.
- The four example-gym links were **plain string literals** — `${u('/g/vitality')}` and three
  siblings. They read from nothing.

Meanwhile `middleware.ts` held its own private `RETIRED_TENANTS = new Set(['vitality'])` and
answered all four of those paths with a cacheable **410 Gone** at the edge. Two files, two
independent copies of "which gyms exist", neither able to see the other. When `vitality` was
switched off during the July bot-traffic incident, the manifest was never told. Wrong in both
directions: four dead links advertised, and `ironforge` — the gym actually being served — named
nowhere.

Hand-editing four string literals to say `ironforge` would fix today and guarantee the identical
drift the next time a gym is switched on or off. So that is not what was done.

### The fix — one switch, two readers

New module **`lib/tenant-directory.ts`**, deliberately edge-safe (no DB, no Node built-ins, no
`next/*` imports) so `middleware.ts` can import it:

| Export | What it is |
|---|---|
| `RETIRED_TENANT_SLUGS` | The single on/off switch for a public tenant. Moved here verbatim from `middleware.ts`. |
| `isRetiredTenant(slug)` | Case-insensitive membership test. |
| `tenantSlugFromPath(pathname)` | The `/g/<slug>` match, also moved out of `middleware.ts`. |
| `SHOWCASE_TENANTS` | The gyms we are willing to cite publicly as a worked example. |
| `liveShowcaseTenants()` | `SHOWCASE_TENANTS` minus anything retired. |

`middleware.ts` now imports `isRetiredTenant` / `tenantSlugFromPath` instead of keeping its own
copies — its behaviour is byte-identical, it just no longer owns the fact. `app/llms.txt/route.ts`
generates its four bullets per gym from `liveShowcaseTenants()`.

**The manifest can no longer name a slug the edge 410s, because both read the same set.**

#### Why `SHOWCASE_TENANTS` is curated rather than a `select * from tenants`

Two reasons, stated as a judgement call rather than an oversight:

1. A white-label customer's gym is theirs, not our marketing collateral. Enumerating the table
   would publish every trainer who ever signed up to every AI crawler.
2. `/llms.txt` is a crawler-hit route. Putting a DB round-trip on it re-creates precisely the cost
   pattern the July incident was about, on the one route designed to be hit by bots.

The list survives a gym being switched off and back on without an edit, because
`liveShowcaseTenants()` does the filtering. Adding a gym to the showcase is a deliberate one-line act.

### Proof the test bites

`app/llms.txt/route.test.ts`, 4 tests. Run against the **unfixed** route (the shared module existed,
the route still hardcoded `vitality`):

```
$ npx vitest run app/llms.txt/route.test.ts
 Test Files  1 failed (1)
      Tests  3 failed | 1 passed (4)
```

The three failures, each naming the real defect:

- `advertises no /g/<slug> the edge middleware answers 410 for` — failed with the four live
  `/g/vitality*` paths in the array. *("these paths are advertised to crawlers but return 410 Gone")*
- `advertises every live showcase gym` — failed with `['ironforge']` missing.
  *("these gyms are live but absent from the manifest")*
- `links a live gym by name, not by the hardcoded slug of a retired one` — failed on `Iron Forge`
  not appearing in the body.

After the fix: `Test Files 1 passed (1) · Tests 4 passed (4)`.

### Second proof — that it computes, rather than swapping one hardcoded slug for another

A green test could in principle be satisfied by hardcoding `ironforge` instead. So the switch was
flipped and the **real handler** re-rendered (no server — `GET()` called directly):

- With `RETIRED_TENANT_SLUGS = {'vitality'}` → manifest lists 4 `/g/ironforge*` links, zero
  `/g/vitality*`.
- With `RETIRED_TENANT_SLUGS = {}` → manifest lists 4 `/g/ironforge*` **and** 4 `/g/vitality*`,
  with no edit to `route.ts`.

The set was returned to `{'vitality'}` afterwards; nothing about which gyms are live was changed.

### What this leaves for Dino

Board **Blocked #2** asked him to pick: switch `vitality` back on, or repoint the index at
`ironforge`. That question is now *cheap* rather than answered for him — the index already points at
`ironforge` (correct today, since `vitality` is off), and if he wants the demo gym back it is
deleting one word from `RETIRED_TENANT_SLUGS`, after which the manifest advertises it again on its
own. **His decision is unchanged; only the cost of either answer went to near zero.** It stays on the
board until he says which.

---

## Defect 2 — the type-check failure was in the **config**, not the test

```
lib/profile.test.ts(43,24): error TS2802: Type 'Set<string>' can only be iterated through when
using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

Line 43 is `const ghosts = [...grouped].filter(...)` — spreading a `Set`. Idiomatic modern
TypeScript. Nothing is wrong with the test.

**Root cause: `tsconfig.json` has no `target`, so `tsc` defaults to ES5.** Confirmed it was never
there — `git log -- tsconfig.json` returns exactly one commit, `0090258 "Initial commit from Create
Next App"`, and `git show 0090258:tsconfig.json` has no `target` key either. The app has been built
this whole time by Next's SWC compiler, which uses its own modern target and never consults this
setting, so only `tsc` ever saw ES5 — which is why the build is green and the type-check is red.

Fix: **`"target": "ES2017"`** added to `compilerOptions` — the value Next.js scaffolds with. No cast,
no `any`, no `ts-ignore`, and the test is untouched.

### Proof it is the config, not the test

Re-running the type-check with the pre-fix target restored, on the fixed tree:

```
$ npx tsc --noEmit --incremental false --target ES5
app/llms.txt/route.test.ts(81,25): error TS2802: Type 'RegExpStringIterator<RegExpExecArray>' ...
lib/profile.test.ts(43,24): error TS2802: Type 'Set<string>' ...
exit=2
```

Two errors, not one — the new test file trips the same rule on a `[...text.matchAll(...)]`. That is
the tell: the defect was never specific to `lib/profile.test.ts`. Any modern iteration spread
anywhere in the repo hits it; the test file was simply the first place one appeared. (Verified no
non-test source currently spreads a `Set`, which is why nobody noticed sooner.)

With `target` present: `npx tsc --noEmit` → **exit 0**.

---

## Rendered proof

The surface changed here is a `text/plain` HTTP response, not a UI. `fleet-design.png` (1440×900
viewport, page 1440×**813**) and `fleet-design-mobile.png` (390×844 viewport, page 500×1406) are the
**real handler output** — `GET()` called directly, its bytes written to a `.txt` and rendered by
Chrome's plain-text renderer, which is exactly what a browser or crawler shows for this endpoint.
No dev server was started, per the "do not start a server" rule added to `WORKING-THE-BOARDS.md`
today. Iron Forge appears four times in the render; `vitality` appears zero times.

The mobile capture reports 500px of content at a 390px viewport. That is Chrome's own wrapping of
long absolute URLs in a `text/plain` document — a `text/plain` response carries no CSS, so it is not
a layout decision that exists to be fixed here.

---

## Files changed

| File | Change |
|---|---|
| `lib/tenant-directory.ts` | **new** — the shared switch both the edge and the manifest read |
| `middleware.ts` | reads that module instead of its own private copies; behaviour identical |
| `app/llms.txt/route.ts` | example-gym links computed from `liveShowcaseTenants()` |
| `app/llms.txt/route.test.ts` | **new** — 4 guards; 3 of them failed against the old route |
| `tsconfig.json` | `"target": "ES2017"` added |
| `docs/FIX_LLMSTXT_AND_TYPECHECK.md` | this file |

Untracked and deliberately not committed: `capture.mjs`, `probe-overflow.mjs`, `fleet-design.png`,
`fleet-design-mobile.png` — throwaway capture tooling, as the previous reconcile also left them.

**Not touched, on instruction:** the Clerk development-keys finding (`STATUS.md` Blocked #1). It is
Dino's decision and was left entirely alone. No `.env.local` was read, no database was written.
