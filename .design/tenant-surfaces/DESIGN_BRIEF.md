# Design brief — Gym QR poster + strengthening /pro

Owner: Ivy (UX/UI). Build: Kevin. Grounded in the real files listed inline —
read the referenced line ranges before building; don't reinvent what's quoted.

---

## Workstream 1 — Print-ready gym QR poster

### What exists already (reuse, don't rebuild)
- QR generation: `QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b0b0c', light: '#ffffff' } })` — `app/g/[slug]/build/page.tsx:200-204`, also `app/dashboard/embed/page.tsx:36`.
- `PrintButton` — `components/PrintButton.tsx`. Client component, `window.print()`. **Note:** its two existing call sites both wire it at `h-10` (40px) — that's below this doc's own §5 48px minimum for a standalone control. Don't copy that height for the new page; use `h-12`.
- `print:hidden` + bare `print:block` convention — see `build/page.tsx:208,215,237,280,289,294,330,368,403`.
- Tenant branding: `Tenant.branding` (`lib/tenant.ts:6-14`) → `{ brandName?, logoUrl?, accent?, accentPress?, onAccent?, background?, surface? }`. `DEFAULT_BRANDING` (`lib/tenant.ts:26-32`) has the fallback accent `#a3e635`. `fetchTenantBySlug(slug)` (`lib/tenant.ts:49`) is the loader; `brandingToCssVars(branding)` (`lib/tenant.ts:37-46`) turns it into `--accent` etc.
- Host/URL construction from `headers()` — `build/page.tsx:196-199` and `embed/page.tsx:31-34` (`host.includes('localhost') ? 'http' : 'https'` fallback pattern).
- Auth/ownership check for the "who's viewing" branch: `currentTrainer()` (`lib/current-tenant.ts:47`) → `{ tenant, isOwner, userId } | null`; compare `me?.tenant.id === tenant.id` exactly as `build/page.tsx:76-77` does (`isMyGym`).
- **New DESIGN.md §9 "Print artifacts"** (just added) — the ink tokens, the print-color-adjust contract, and the "why this isn't the dark theme" reasoning. Read it before building; it's the spec, this brief just applies it.

### Route
`app/g/[slug]/poster/page.tsx` — new server component, `export const dynamic = 'force-dynamic'`, public (no auth gate — same posture as `/g/[slug]` itself; front-desk material has to be viewable/printable without logging in). 404 via `notFound()` if `fetchTenantBySlug` returns null, identical to every other `/g/[slug]/*` page.

Query param: `?layout=poster|handout`, default `poster` on missing/invalid value. (Deliberately not reusing `build/page.tsx`'s `v=` param name — that means "reroll variant" there; a different name avoids anyone pattern-matching the wrong semantics later.)

### Two variants (my call, per the brief: keep it simple)
1. **Poster** (default) — one full page, portrait, for taping on a wall. Biggest, most central element is the QR.
2. **Handout** — landscape, **2-up per sheet** (top half / bottom half, dashed cut line between), for a "take one" stack at the front desk. Not literal business-card size — a code that small isn't reliably scannable at handheld distance for a first-time user; half-letter (8.5×5.5in effective) keeps the QR at a size that scans on the first try while still being cuttable into two handouts per printed sheet.

Both variants pull from the same data — computed once at the top of the page:
```ts
const tenant = await fetchTenantBySlug(params.slug);
if (!tenant) notFound();
const name = tenant.branding.brandName ?? tenant.name;
const accent = tenant.branding.accent ?? DEFAULT_BRANDING.accent;
const me = await currentTrainer();
const isMyGym = me?.tenant.id === tenant.id;
const h = headers();
const host = h.get('host') ?? 'vitality-tracker-mauve.vercel.app';
const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
const url = `${proto}://${host}/g/${tenant.slug}`;
const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b0b0c', light: '#ffffff' } });
const layout = searchParams.layout === 'handout' ? 'handout' : 'poster';
```

### Page structure (screen)
```
<div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">

  {/* Toolbar — print:hidden */}
  <div className="shell flex items-center justify-between px-5 pt-6 print:hidden">
    <Link href={isMyGym ? '/dashboard' : `/g/${tenant.slug}`} className="text-caption text-text-muted">
      ← {isMyGym ? 'Dashboard' : name}
    </Link>
    <PrintButton className="h-12 rounded-md border border-border px-4 text-caption font-semibold text-text-primary active:bg-surface-raised" />
  </div>

  {/* Layout toggle — print:hidden, reuses build/page.tsx's exact toggle recipe
      (rounded-lg border p-3, border-accent bg-accent/10 when active) so the
      pattern doesn't fork into a second toggle style */}
  <div className="shell mb-6 mt-4 grid grid-cols-2 gap-2 px-5 print:hidden">
    <Link href={`/g/${tenant.slug}/poster?layout=poster`}
          aria-label={layout === 'poster' ? 'Wall poster layout, currently selected' : 'Switch to wall poster layout'}
          className={`rounded-lg border p-3 text-center ${layout === 'poster' ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
      <span className="block text-body font-semibold text-text-primary">Wall poster</span>
      <span className="block text-caption text-text-muted">8.5×11 / A4</span>
    </Link>
    <Link href={`/g/${tenant.slug}/poster?layout=handout`}
          aria-label={layout === 'handout' ? 'Handout layout, currently selected' : 'Switch to handout layout'}
          className={`rounded-lg border p-3 text-center ${layout === 'handout' ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
      <span className="block text-body font-semibold text-text-primary">Handout</span>
      <span className="block text-caption text-text-muted">2-up, cut & hand out</span>
    </Link>
  </div>

  {/* Inline @page rule — scoped to this route only, no global CSS touched */}
  <style>{`@page { margin: 0.4in; }`}</style>

  {/* Paper preview — WYSIWYG with print output */}
  <div className="flex justify-center px-5 pb-16 print:p-0">
    {layout === 'poster' ? <PosterPaper .../> : <HandoutSheet .../>}
  </div>
</div>
```

### `PosterPaper` (portrait, one page)
```
relative flex flex-col items-center justify-between
w-full max-w-[680px] aspect-[8.5/11] rounded-2xl border border-border bg-white
p-10 text-center shadow-lift
print:aspect-auto print:h-auto print:w-auto print:max-w-none
print:rounded-none print:border-0 print:shadow-none
print:fixed print:inset-0 print:m-0 print:p-[0.5in]
print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]
```
Content, top to bottom (all text ink colors are the literal hexes from
DESIGN.md §9 — `#0B0B0C` / `#52525B` / `#8B8B93` — **not** `text-text-primary`
etc., which are dark-theme values that would be invisible on white):

1. **Brand mark** (logo or initial badge + gym name), centered, modest size:
   ```
   {logoUrl
     ? <img src={logoUrl} alt="" className="mb-3 h-16 w-16 object-contain" />
     : <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-h1 font-extrabold"
             style={{ background: accent, color: onAccent }}>{initial}</span>}
   <p className="text-h2 font-extrabold text-[#0b0b0c]">{name}</p>
   ```
   *Reason:* establishes whose poster this is before asking for the scan (trust signal) — small enough not to compete with the CTA below it.

2. **Headline** — the largest text on the page, gym name in brand accent:
   ```html
   <h1 className="mt-2 text-[2.5rem] font-extrabold leading-[1.05] text-[#0b0b0c] sm:text-[2.9rem]">
     Scan to train at <span style={{ color: accent }}>{name}</span>.
   </h1>
   ```
   *Reason:* the poster has one job — get scanned. The headline states the exact action; coloring the gym name signals "this is yours," not a generic app.

3. **Subhead** (one line, honest — no login claim, no false "no app" overclaim beyond what's true):
   ```
   <p className="mx-auto mt-3 max-w-md text-lg text-[#52525b]">
     Free workouts built around your equipment and your time. No login, no download — just scan.
   </p>
   ```
   *Reason:* "no login, no download" is true for viewing/reading a workout (SyncroFit is only needed to run the guided timer — confirmed by the FAQ on `/pro`, `app/pro/page.tsx:90`) — don't overclaim past what's shipped.

4. **QR block** — the visual anchor, accent-framed, most whitespace on the page around it:
   ```html
   <div className="my-8 flex flex-col items-center" role="img"
        aria-label={`QR code — scan to open ${name}'s training app`}>
     <div className="rounded-2xl border-[6px] p-4" style={{ borderColor: accent }}>
       <div className="h-[260px] w-[260px] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }} />
     </div>
   </div>
   ```
   *Reason:* the QR is the literal target of the whole artifact — framing it in the gym's accent color (never recoloring the QR's own modules — that risks scan failures) makes it the biggest *visual* weight on the page even though the headline technically has larger type.

5. **3-step "how it works"** (optional context, smallest of the primary content, placed *after* the QR — doesn't delay the CTA):
   ```html
   <div className="grid max-w-md grid-cols-3 gap-4 text-left">
     {STEPS.map(s => (
       <div key={s.n}>
         <span className="block text-caption font-bold" style={{ color: accent }}>0{s.n}</span>
         <span className="block text-sm text-[#52525b]">{s.label}</span>
       </div>
     ))}
   </div>
   ```
   Copy:
   - `01` — "Scan the code"
   - `02` — "Get today's workout — no login"
   - `03` — "Follow along, free"

6. **Fallback + footer**, pinned to the bottom by the paper's `justify-between`, faintest ink — pure insurance + attribution:
   ```html
   <div>
     <p className="text-sm font-semibold tracking-wide text-[#8b8b93]">{host}/g/{tenant.slug}</p>
     <p className="mt-1 text-xs text-[#8b8b93]">Powered by Vitality</p>
   </div>
   ```

### `HandoutSheet` (landscape, 2-up)
Renders the *same* `HandoutCard` content twice for print, once for screen —
don't duplicate the copy/data, just the render path:
```html
<div className="hidden print:grid print:h-full print:w-full print:grid-rows-2">
  <HandoutCard className="border-b border-dashed border-[#d4d4d8] pb-6" />
  <HandoutCard className="pt-6" />
</div>
<div className="print:hidden">
  <HandoutCard className="mx-auto max-w-[680px] rounded-2xl border border-border shadow-lift" />
</div>
```
`HandoutCard` — landscape, logo/headline/subhead/URL on the left, QR on the
right (side-by-side; there's no vertical room to stack in this orientation):
```html
<div className="flex items-center justify-between gap-6 bg-white p-8 print:p-6
                 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
  <div className="flex-1 text-left">
    <div className="mb-2 flex items-center gap-2">
      {logo-or-initial h-8 w-8}
      <span className="text-sm font-bold text-[#0b0b0c]">{name}</span>
    </div>
    <h2 className="text-3xl font-extrabold leading-tight text-[#0b0b0c]">
      Scan to train at <span style={{ color: accent }}>{name}</span>.
    </h2>
    <p className="mt-2 max-w-xs text-sm text-[#52525b]">Free workouts, no login. Scan and go.</p>
    <p className="mt-4 text-xs font-semibold text-[#8b8b93]">{host}/g/{tenant.slug}</p>
  </div>
  <div className="shrink-0 rounded-xl border-4 p-2" style={{ borderColor: accent }}
       role="img" aria-label={`QR code — scan to open ${name}'s training app`}>
    <div className="h-[140px] w-[140px] [&>svg]:h-full [&>svg]:w-full"
         dangerouslySetInnerHTML={{ __html: qrSvg }} />
  </div>
</div>
```
No 3-step explainer on the card — deliberately dropped. *Reason:* no room
without shrinking the QR below a reliably-scannable size, and someone taking
a card from a front desk already trusts the gym enough — the "why" step the
poster needs, the handout doesn't.

### Entry points (discoverability into `/poster`)
1. **`app/dashboard/page.tsx`'s "START HERE" list** (`app/dashboard/page.tsx:90-130`) — add a 5th item, after "4. Add it to your website":
   ```html
   <Link href={`/g/${gym.slug}/poster`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
     <span>
       <span className="block text-body font-semibold text-text-primary">5. Print a QR poster</span>
       <span className="block text-caption text-text-muted">For the front desk or a flyer — scan to open your app</span>
     </span>
     <span className="text-text-faint">›</span>
   </Link>
   ```
   *Reason:* placed right after the digital embed step — the physical poster is the natural next move once the digital paths (link/button/iframe) are covered, not before.

2. **`app/dashboard/embed/page.tsx`'s existing "4 · QR CODE" section** (`app/dashboard/embed/page.tsx:90-100`) — that QR is sized for a webpage/email (`h-44 w-44`), not print-poster-grade. Add one line under the existing `PrintButton` there:
   ```html
   <p className="mt-2 text-caption text-text-muted">
     Need something bigger for the wall? <Link href={`/g/${gym.slug}/poster`} className="text-accent">Get the poster</Link>
   </p>
   ```

Both are additive one-liners — no restructuring of either page.

---

## Workstream 2 — Strengthen + surface `/pro`

Current structure of `app/pro/page.tsx` (297 lines, all read): Nav → Hero (headline + CTAs + `PhoneMock`) → "Who it's for" (`SEGMENTS`, 4 cards) → "Features" (`FEATURES`, 6 cards) → "How it works" (`STEPS`, 3 cards) → SyncroFit callout → FAQ → Pricing teaser → Final CTA → Footer.

Gaps against the brief: no visual proof of the website-embed story pre-signup (only a text mention in Features/FAQ), the remote-coaching pitch is one thin card in "Who it's for," "How it works" has 3 steps where the real flow is 4, and the new poster isn't mentioned at all.

### New section order
```
Nav → Hero → Who it's for → Features (+2 cards)
  → NEW: Put it on your website
  → NEW: Train clients anywhere
  → How it works (3 → 4 steps)
  → SyncroFit callout (unchanged)
  → FAQ → Pricing → Final CTA → Footer
```
*Reason for placement:* prove the product (Features) → prove integration is trivial (website) → prove reach (anywhere) → show how easy activation is (How it works) → go deep on the SyncroFit technical integration right before objection-handling (FAQ). The SyncroFit callout stays where it is — it's a technical deep-dive, not the emotional "I can coach remotely" hook, so it belongs later than the new "Train clients anywhere" section, not merged with it.

### 1. Features — add two cards to `FEATURES` (`app/pro/page.tsx:67-74`)
Keep the existing 6, append:
```ts
{ icon: '🪧', title: 'Front-desk poster', body: 'A branded, print-ready QR poster — logo, colors, one tap to print. Tape it up and let the wall do the selling.' },
{ icon: '🧳', title: 'Train from anywhere', body: 'Coaching a client on the road? Text them a link or QR — they open it on their phone, no app, no login.' },
```
8 cards in a `sm:grid-cols-2 lg:grid-cols-3` grid tiles fine (3+3+2, last row left-aligned) — no grid change needed.

### 2. NEW — "Put it on your website" section
Placed right after Features. Mirrors `app/dashboard/embed/page.tsx`'s three
real options, but as static illustrative previews (no `CopyField`/clipboard —
there's no real snippet to copy pre-signup, and adding a server round-trip to
generate a demo QR in this `'use client'` page isn't worth it for a decorative
element).
```html
<section className="px-5 py-16">
  <Reveal className="mx-auto mb-10 max-w-2xl text-center">
    <p className="mb-2 text-label text-accent">ALREADY HAVE A WEBSITE?</p>
    <h2 className="text-h1 font-bold">Your training app goes on your site in one paste.</h2>
    <p className="mx-auto mt-3 max-w-xl text-body text-text-muted">
      Squarespace, Wix, WordPress — if you can paste HTML, you can add it. No developer needed.
    </p>
  </Reveal>
  <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
    {/* Card 1 — button */}
    <motion.div variants={fadeUp} className="rounded-xl border border-border bg-surface p-5 text-center">
      <div className="mb-4 flex h-10 items-center justify-center rounded-md bg-accent text-caption font-semibold text-on-accent">
        Start Today&apos;s Workout
      </div>
      <h3 className="mb-1 text-h3 font-semibold">A button</h3>
      <p className="text-caption text-text-muted">Drop it anywhere on your site.</p>
    </motion.div>
    {/* Card 2 — embed */}
    <motion.div variants={fadeUp} className="rounded-xl border border-border bg-surface p-5 text-center">
      <div className="mb-4 h-14 rounded-md border-2 border-dashed border-accent/40" />
      <h3 className="mb-1 text-h3 font-semibold">An embed</h3>
      <p className="text-caption text-text-muted">The whole app, inside a page on your site.</p>
    </motion.div>
    {/* Card 3 — QR / poster */}
    <motion.div variants={fadeUp} className="rounded-xl border border-border bg-surface p-5 text-center">
      <div className="mb-4 text-h1">▦</div>
      <h3 className="mb-1 text-h3 font-semibold">A QR code</h3>
      <p className="text-caption text-text-muted">Print it for your front desk, or a flyer.</p>
    </motion.div>
  </motion.div>
  <Reveal className="mx-auto mt-8 max-w-2xl text-center">
    <p className="mb-4 text-caption text-text-faint">Every option carries your branding automatically.</p>
    <Link href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-label text-on-accent">
      Create your gym — free
    </Link>
  </Reveal>
</section>
```

### 3. NEW — "Train clients anywhere" section
Styled like the existing SyncroFit callout box for visual rhythm consistency
(`rounded-2xl border bg-surface p-8 text-center` + a 3-col grid of small
point cards, same recipe as `app/pro/page.tsx:196-217`):
```html
<section className="px-5 py-12">
  <Reveal className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-8 text-center">
    <p className="mb-2 text-label text-accent">📍 NO GYM REQUIRED</p>
    <h2 className="mx-auto max-w-2xl text-h2 font-bold">
      Coach a client on the road exactly like one on the floor.
    </h2>
    <p className="mx-auto mt-3 max-w-xl text-body text-text-muted">
      Traveling, remote, or just not in the building — send a workout, they run it. That&rsquo;s the whole handoff.
    </p>
    <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-body font-semibold text-text-primary">Text a link</p>
        <p className="text-caption text-text-muted">One tap sends today&rsquo;s workout as a plain link — opens in any browser.</p>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-body font-semibold text-text-primary">Or a QR code</p>
        <p className="text-caption text-text-muted">Print it, screenshot it, drop it in a DM — scanning opens the same workout.</p>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-body font-semibold text-text-primary">They just train</p>
        <p className="text-caption text-text-muted">No login for them. Want the guided timer? One tap pushes it into SyncroFit.</p>
      </div>
    </div>
  </Reveal>
</section>
```

### 4. "How it works" — 3 steps → 4 steps
Update `STEPS` (`app/pro/page.tsx:76-80`):
```ts
const STEPS = [
  { n: '1', title: 'Create your gym', body: 'Sign up and claim your URL — vitalitypro.app/g/yourgym. Free to start.' },
  { n: '2', title: 'Brand it', body: 'Paste your website — logo, colors and name land on your app instantly. Tweak anything.' },
  { n: '3', title: 'Build & share', body: 'Generate a workout from your library, send it by link, QR, or straight to SyncroFit.' },
  { n: '4', title: 'Embed & print', body: 'Drop a button or QR on your website, and print a poster for the front desk.' },
];
```
Grid change (`app/pro/page.tsx:184`): `sm:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-4`, and widen the container `max-w-4xl` → `max-w-5xl` so 4 cards sit comfortably. Step 4 is the second place the poster is sold as a feature (the FEATURES card is the first) — directly satisfies "feature the poster as a selling point" without a new hero-level visual, which would overweight a supporting artifact against the branded-app hook `PhoneMock` already owns in the hero.

---

## Discoverability — `/pro` isn't reachable from the daily app

Confirmed by reading the actual surfaces:
- `app/page.tsx` (Home, the daily-use screen): no mention.
- `components/layout/BottomNav.tsx`: 5 tabs (Home/Exercises/Routines/Daily 5/Profile), no room and no reason to add a 6th for a B2B upsell most users will never need.
- `app/settings/page.tsx` (the "Profile" tab): **one** conditional link already exists — a text link "See what it does ›" (`app/settings/page.tsx:326-328`), shown only when `account.role !== 'trainer'`, buried after You/Role/Training/Routines/Plan (5 sections deep).

Spec:
1. **Leave the existing conditional box** (`app/settings/page.tsx:319-330`) as-is — it's correctly targeted (only shown to non-trainers, i.e. exactly the audience who hasn't discovered Pro yet) and its placement right where the role toggle lives is the right spot for it.
2. **Add one persistent, low-noise link at the very bottom of Settings**, regardless of role, near the closing "Your name, email & phone stay on this device" caption (`app/settings/page.tsx:361-363`):
   ```html
   <p className="mt-2 text-center text-caption text-text-faint">
     <Link href="/pro" className="text-accent">For gyms &amp; trainers · Vitality Pro ›</Link>
   </p>
   ```
   *Reason:* Settings/Profile is the one screen everyone eventually visits and the natural home for a secondary product line at the account level — putting it at the very bottom (not competing with the primary trainee-facing content above) respects that most visits to this screen aren't about Pro, while still making it permanently reachable instead of only surfacing when `role === 'trainee'`.

I deliberately did **not** add a footer/nav-wide link app-side (e.g. a persistent global footer) — this app has no persistent footer today, and inventing one solely to carry a B2B upsell link would be a bigger structural change than the gap calls for.

---

## Non-negotiable constraints checked against this spec

- **Data honesty:** all new/changed copy describes only shipped features (QR/embed/branding autopilot/SyncroFit — all read from real code, not aspirational). The poster's QR encodes the tenant's real `/g/<slug>` URL via the same live `fetchTenantBySlug` + `headers()` pattern as `build/page.tsx`/`embed/page.tsx` — never a mock. `/pro`'s exercise/equipment counts keep reading from `SAMPLE_EXERCISES.length`/`EQUIPMENT_ORDER.length` (`app/pro/page.tsx:9-10`) rather than a hardcoded number, so they can't drift.
- **App isolation:** `/poster` lives under `/g/[slug]/*`, tenant-scoped and public, exactly like the existing `/g/[slug]/build` and `/g/[slug]/branding` — no new global route, no cross-tenant data exposure.
- **Legal/auth gating:** no gating changes. `/poster` stays public (front-desk material must be viewable/printable without a login, by design — same posture as `/g/[slug]` itself). No PII involved anywhere in this brief.
- **Technical limit respected:** the dark theme is genuinely unprintable as-is (light text on white paper) — this is why the poster/handout get their own literal "paper" ink tokens (DESIGN.md §9) instead of reusing `text-text-primary` etc., and why the print CSS explicitly forces `print-color-adjust: exact` rather than relying on the browser's default background-graphics behavior.

---

## Design-review note

I'm staffed alone on this pass (brief only, no build yet) — Kevin builds against this spec; when the build is ready with real-data screenshots (both `/poster` layouts printed/previewed for a real branded tenant, and the updated `/pro`), route it back through me for `design-review` before calling it done, per the standing process. Nothing to self-certify here since nothing has been built yet.
