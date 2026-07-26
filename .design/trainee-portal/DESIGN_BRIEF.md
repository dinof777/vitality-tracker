# Design brief — Trainee profiles + trainee portal

Owner: Ivy (UX/UI). Build: Kevin. Design-only — no code below is meant to be copy-pasted
verbatim, it's the concrete spec to build against. Grounded in the files actually read:
`app/dashboard/clients/[clientId]/page.tsx`, `app/s/[token]/page.tsx`, `lib/tenant.ts`,
`components/charts/Sparkline.tsx`, `app/dashboard/clients/page.tsx`, `DESIGN.md` (§1–7),
Elena's `SCOPE_and_datasource.md`, Priya's `API_CONTRACT_client_profiles.md`, and the shipped
trainer-side routes (`lib/client-portal-db.ts`, `lib/client-profile.ts`,
`app/api/tenant/clients/[clientId]/{profile,metrics,portal-link}/route.ts`).

**Status note inherited from Priya:** the trainer-side routes are shipped; `/portal/[token]`
(the trainee-facing read) is not built yet — paused for Dino's review. This brief designs both
surfaces per the task brief; Surface 1 is buildable today, Surface 2 is buildable the moment
that pause lifts (nothing in this design depends on the pause resolving differently).

---

## 0. Non-negotiable constraints this design respects

- **Data-honesty invariant** (same discipline as the empty-safe Social-proof section in
  `ConsumerMarketing.tsx`): every empty state below says plainly "no data yet" — never a
  fabricated placeholder number, never a zeroed-out chart pretending to be real data.
- **App-isolation**: `/portal/[token]` shows exactly one client's own data, themed to exactly
  one gym's branding, with zero surface area for cross-client or cross-tenant leakage — no nav,
  no search, no "other clients" affordance of any kind.
- **Trainer-notes privacy (hard invariant, not a UI nicety)**: `profile.notes` must never enter
  `/portal/[token]`'s component tree — not hidden, not `display:none`, not conditionally
  rendered-then-suppressed. Priya's contract already documents the mapping-point rule
  (`toProfileJson` must not be reused for the trainee read); this brief's job is to make sure
  the *visual* design never implies notes belong there, so no one is tempted to "just pass the
  whole profile object down for convenience." Surface 1's design also gives notes an explicit,
  hard-to-miss "private" visual treatment so a trainer is never confused about what a client
  will and won't see (see §2.4).
- **Consent gating**: the server already hard-refuses `POST /portal-link` without
  `consent: true` (Priya's route, `portal-link/route.ts:33-38`). This design's job is to make
  the affirmation a real, deliberate step in the UI — never pre-checked, never skippable by a
  fast double-tap — so the client-side experience matches the seriousness the server already
  enforces (see §2.5).
- **Legal gating**: none identified for this feature (no age-gating, no payment). The one real
  risk class is the honest trade-off Elena named — a bearer-token link to *biometric* data, a
  materially more sensitive class than the existing workout-share tokens. This design leans on
  the same mitigations Elena scoped (entropy, one-tap revoke, no listing surface, read-only) and
  makes revoke and consent-state genuinely visible on Surface 1, not buried.

**Design-tokens delta: none.** Every component below reuses existing DESIGN.md tokens/recipes —
no new colors, spacing, or type steps needed.

---

## 1. Hierarchy overview — both surfaces, stated up front

**Surface 1 order** (top to bottom, added to the existing page):
`Header (existing) → Biometrics → Profile → Portal Link → Shared Workouts (existing, moves to last)`

- **Biometrics leads** the new content — reason: it's the highest-frequency read *and* write on
  this page (a trainer logs a weigh-in most sessions); putting it straight under the header
  means the most common reason to open this page for an enriched client needs zero scrolling.
- **Profile sits second** — reason: goals/equipment/notes/height are set-once-and-referenced,
  not touched every visit; it belongs below the frequent-action block, not competing with it.
- **Portal Link sits third, directly after Profile** — reason: it's the control that *exposes*
  Biometrics (and only Biometrics/Activity, never Profile's notes) to the client, so it reads
  naturally as "here's their data, here's the switch that shares it," immediately following the
  two sections whose content it gates.
- **Shared Workouts moves to last** — reason: it's a stable, already-shipped section unaffected
  by this build; day-to-day biometric logging is now the more frequent task and earns the top
  slot that motivated this feature in the first place. Nothing about its own content or shape
  changes.

**Surface 2 order** (top to bottom, on the trainee's phone):
`Gym header → Activity → Weight → HRV → BMI (folded into the Weight card, not its own block)`

- **Activity leads** — reason: "3 sessions this week" is effort-based and unconditionally
  positive to see first; opening on a body-weight number risks an unwelcoming first impression
  for a screen explicitly meant to feel encouraging, not clinical.
- **Weight before HRV** — reason: weight is the metric the client set a goal against (when one
  exists), so it's the more legible "progress" story; HRV is a secondary/more expert metric that
  benefits from weight's trend-reading context being established first.
- **BMI is demoted to a quiet caption inside the Weight card, not a fourth full card** — reason:
  BMI is a single derived number with no independent trend of its own (it's arithmetic on data
  already shown), and it's a metric lay users routinely over-read as a verdict rather than an
  estimate. Giving it equal visual weight to Activity/Weight/HRV overclaims its usefulness;
  folding it in as one small line with a plain caveat keeps it present but proportionate.

---

## 2. Surface 1 — `/dashboard/clients/[clientId]` additions

### 2.0 Wireframe (mobile column; desktop widens per §2.6)

```
← Clients
{Client name}                                   [h1]
{contact}                                       [muted]

BIOMETRICS                                      [label, accent]
┌─────────────────────┐ ┌─────────────────────┐
│ Weight               │ │ HRV                  │
│ 82.4 kg          [h1]│ │ 58 ms            [h1]│
│ Start 88.0 → Goal 78 │ │ Start 52              │
│ [sparkline]           │ │ [sparkline]           │
│ BMI 24.1 (if height) │ │                       │
└─────────────────────┘ └─────────────────────┘
  Log a reading
  (Weight●|HRV)  [ __ ] kg   Today ▾   [Note...]
  [        LOG READING        ]

PROFILE                                         [label, accent]
Goals            [chip chip chip] [+ Add]
Home equipment   [chip chip]      [+ Add]
Height (cm)      [ 178 ]     Goal weight (kg) [ 78 ]
🔒 PRIVATE — only you see this
┌ - - - - - - - - - - - - - - - - -┐
│ Notes (textarea)                  │
└ - - - - - - - - - - - - - - - - -┘
[ Save profile ]

PORTAL LINK                                     [label, accent]
https://…/portal/abc123          [Copy link]
[Show QR ▾]
Created Jul 20 · Consent confirmed Jul 20         [faint]
[Regenerate link]              [Revoke]

SHARED WORKOUTS                                 [label, accent]  (existing, unchanged)
…
```

### 2.1 Biometrics section

Two cards, `grid grid-cols-1 gap-3 sm:grid-cols-2` (opens up to two columns at `sm:`, matching
DESIGN.md §7's "content and grid open up together" rule — desktop gets real use of the width
here even though the page's outer container stays `.shell`, see §2.6).

**Weight card** (`rounded-lg border border-border bg-surface p-4 space-y-2`):
```
"Weight"                         text-h3 text-text-primary
82.4 kg                          text-h1 tabular-nums text-text-primary (value) + text-caption
                                  text-text-muted (unit, inline)
Start 88.0 → Goal 78.0           text-caption text-text-muted (goal clause omitted if unset —
                                  see §2.1a)
[Sparkline data={weightHistory}] h-12 w-full rounded-md bg-surface-raised/50 px-2 py-1
                                  (exact container recipe from DESIGN.md §6)
BMI 24.1                         text-caption text-text-faint — shown only when heightCm is set
                                  AND a current weight exists; omitted entirely otherwise (never
                                  "BMI: —"). Deliberately shown here too, not just on the
                                  portal, so a trainer sees exactly what their client will see.
```
Current value uses `text-h1` (32px), not `text-display` (56px) — `text-display` is reserved
(DESIGN.md §2) for in-workout lifting/rest-timer readouts; reusing it here would visually imply
this is a live logging HUD, which this calm reference card isn't.

**HRV card**: identical shape, no goal clause (schema has no HRV goal — `Start 52` only, no
`→ Goal`), no BMI line.

**Empty variant** (either card, when `metrics.weight.current === null` / `.hrv.current === null`):
swap the solid card border for the codebase's existing empty-state dashed treatment (same one
`app/dashboard/clients/page.tsx:97-99` and the existing "Nothing shared…" state already use):
```
rounded-lg border border-dashed border-border p-4 text-center
"Weight"                         text-h3 text-text-muted
"No readings yet"                text-body text-text-muted
"Log one below to start tracking." text-caption text-text-faint
```

#### 2.1a Log-a-reading form (one shared form under both cards, not two)

One form, not per-card duplicates — a trainer typically has one or two numbers to enter per
check-in, and a single metric-type toggle keeps the UI from doubling.

```
"Log a reading"                                       text-h3
[Weight | HRV]  segmented toggle — reuses the L/R side toggle recipe verbatim (DESIGN.md §6):
  inline-flex rounded-full bg-surface-raised p-1
    > each: h-11 rounded-full text-caption font-semibold, selected bg-accent text-on-accent
Value input:    w-24 h-12 bg-surface-raised rounded-md text-h3 text-center tabular-nums
                + inline unit label ("kg" / "ms", swaps with the toggle)
Date:           "Today ▾" ghost text link → reveals a native <input type="date"> when tapped
                (backfill case only; collapsed by default since same-day entry is the common path)
Note:           h-11 flex-1 rounded-md border border-border bg-background px-3 text-body,
                placeholder "Note (optional)"
[ LOG READING ]  Primary button (h-14 w-full, DESIGN.md §6) — disabled until value is a real
                 number > 0, exact same "Log-set validation" rule DESIGN.md already documents
                 for workout logging (§6): removes the mis-tap-logs-a-blank-reading failure at
                 the source rather than cleaning it up after.
```
On submit: `POST /api/tenant/clients/[clientId]/metrics { metricType, value, recordedAt?, note? }`
per the shipped contract; on 201, prepend to the relevant card's sparkline data + refresh
current/starting without a full page reload (optimistic append is fine — the value just posted
is definitionally the new "current").

### 2.2 Profile section

Always-visible editable form (not a disclosure/accordion — this is a single entity's settings,
not a list, so DESIGN.md's "controls behind one disclosure" rule for *lists* doesn't apply here).

```
Goals             chip row: existing goals as pills (`rounded-full bg-accent/15 text-accent
                  text-caption font-semibold px-3 h-8`, small × per chip) + a trailing
                  "+ Add" input (Enter or tap to add, clamps at 20 items/80 chars — mirrors
                  lib/client-profile.ts's own limits exactly so the UI never lets a trainer type
                  something the API will then reject)
Home equipment    identical chip-row pattern, 30-item cap
Height (cm)       h-11 w-28 rounded-md border border-border bg-background px-3 text-body
                  tabular-nums, range 50–260 (mirrors server validation)
Goal weight (kg)  same input shape, range 20–400
```
Height and Goal weight sit on one row (`flex gap-3`) since they're both small numeric fields and
conceptually paired (both feed the Biometrics card above).

**Notes — explicit private treatment** (§0's invariant, made visible, not just enforced
server-side):
```
🔒 PRIVATE — only you see this        text-caption font-semibold text-text-muted, inside a
                                       small bordered chip (border border-border rounded-full
                                       px-2 py-0.5), sitting directly above the field
Notes textarea:  rounded-md border border-dashed border-border bg-background/50 p-3
                 text-body text-text-primary, min-h-24
```
The **dashed border** (vs. every other field's solid border) is the non-color signal that this
field behaves differently — consistent with DESIGN.md §6's "never color alone" rule, extended
here from selection states to a privacy state. Notes sits **last** in the form, after
Goals/Equipment/Height/Goal-weight — deliberately not the first thing seen, so the section reads
"coaching info, then a private aside," not "here's a notes app with some fields bolted on."

`[ Save profile ]` — `h-11 rounded-md bg-accent px-5 text-label text-on-accent`, right-aligned
under the form (same weight-class button as the existing "ADD" client button,
`app/dashboard/clients/page.tsx:82-89` — same product, same weight of action, not the page's one
dominant CTA since this page has several independent actions). Sends only the fields that
changed as a `PUT` body (the API already supports PATCH-under-PUT semantics — no need to send
untouched fields).

**Empty state**: no blocking overlay — the form is simply empty and ready to fill. One line of
context above it the first time (`profile === null`): *"Nothing saved for {name} yet — add their
goals, equipment, and details below."* — same voice as the clients-list page's own copy.

### 2.3 Portal Link section

**Empty (`profile.portalToken === null`)**:
```
rounded-lg border border-dashed border-border p-4 text-center
"No portal link yet." text-body text-text-muted
"Generate one so {name} can check their own progress from their phone." text-caption text-text-faint
[ Create portal link ]  Primary-weight button (h-12, bg-accent) → opens the consent panel (§2.5)
```

**Existing (`profile.portalToken` set)**:
```
rounded-lg border border-border bg-surface p-4 space-y-2
{origin}/portal/{token}         text-body text-text-primary truncate, monospace-ish nums
[Copy link]                     text-caption text-accent — identical copy/"Copied" pattern
                                 already implemented in this exact file
                                 (app/dashboard/clients/[clientId]/page.tsx:61-69) — reuse it
                                 verbatim, just retarget the URL to /portal/{token}
[Show QR ▾]                     ghost text link, reveals the same QR block /s/[token] uses
                                 (h-36 w-36 rounded-lg bg-white p-2, qrcode svg, dark #0b0b0c/
                                 light #ffffff — app/s/[token]/page.tsx:69-72) when tapped
Created {date} · Consent confirmed {date}   text-caption text-text-faint
[ Regenerate link ]  ghost button, h-11    [ Revoke ]  narrow destructive button, px-4
```
- **Regenerate** re-opens the exact same consent panel as first-time creation (§2.5) —
  non-negotiable, because the server re-validates `consent: true` on every `POST`, including
  regenerate (`portal-link/route.ts` — one endpoint, no first-time/repeat distinction). The
  checkbox must NOT be pre-checked on a regenerate — a trainer reaffirms every time, matching
  the audit-trail intent of re-stamping `portal_consent_at` on every issue.
- **Revoke** is a `DELETE`, needs no consent (consent is for *granting* access, not removing
  it) — gated only by `window.confirm`, matching this codebase's existing convention for
  irreversible actions (`app/routines/page.tsx`'s delete-a-routine confirm): *"Revoke this link?
  {name} won't be able to open it anymore — you can generate a new one any time."*
- Revoke is the **narrow** control next to Regenerate's wider one, not the reverse (DESIGN.md
  §6's "destructive actions are not the widest control in a panel" rule).

### 2.4 Notes-privacy — reiterated as a build note, not just a visual spec

Kevin: the Profile form's `notes` field is the *only* place `profile.notes` should ever be read
from the `GET .../[clientId]` response on this page. Don't thread it through any shared
component that Surface 2 might also import — Surface 2's data fetch for `/portal/[token]` should
call its own narrower query (per Priya's contract) that never selects `notes` in the first
place, so there's no `notes` value to accidentally forget to hide.

### 2.5 Consent-affirmation panel (shared by Create + Regenerate)

Inline expand-in-place under the button that triggered it (no new modal/sheet component needed):
```
rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-3     (accent-tinted — visually
                                                                    distinct from the page's
                                                                    neutral cards, signaling
                                                                    "this step matters")
<label className="flex items-start gap-3">
  checkbox: h-6 w-6 rounded-md border-2 border-border, checked → bg-accent border-accent
            with on-accent check (exact "Checkbox-style row" recipe, DESIGN.md §6)
  "I have {client.name}'s consent to store and share this info."   text-body text-text-primary
</label>
"This confirms sharing their weight, HRV, and activity through a private link — never the
notes above, which stay private to you."                           text-caption text-text-muted
[ Cancel ] ghost, h-11   [ Create link / Regenerate link ] Primary, h-11, disabled until checked
```
Button disabled state reuses the same "no real value → no submit" logic as Log-set validation
and the metrics form (§2.1a) — one consistent pattern across this whole build, not a new rule.
The helper line doing double duty as a **reassurance** that notes are excluded is deliberate: it
answers the trainer's most likely hesitation at exactly the point they'd have it.

### 2.6 Container width

The page's outer container stays `.shell` (unchanged from the existing file) — the Shared
Workouts section already grids at `md:`/`lg:` and depends on it. The **new form sections**
(Log-a-reading, Profile fields, the consent panel) each internally cap at `max-w-xl` so they
don't stretch into an uncomfortably wide single-column form on a desktop monitor, while the
Biometrics summary cards use `.shell`'s full available width via their own `sm:grid-cols-2` —
resolves the tension between "forms want a narrow column" and "this page is a `.shell`-tier
page" without forking the page's container tier.

---

## 3. Surface 2 — `/portal/[token]`

Mobile-first (this is opened on a phone, per the brief) — but responsive, since a trainer or
curious client could open it on a desktop too.

### 3.0 Wireframe

```
YOUR GYM NAME                                    [label, accent, uppercase — brandingToCssVars]
Hey, {FirstName}                                 [h1]
Only you and {gym} can see this page.            [caption, faint]

THIS WEEK                                        [label, accent]
┌───────────────────────────────────┐
│ 3 workouts this week 🔥            │  [h1 stat]
│ Last workout: 2 days ago            │  [caption, muted]
└───────────────────────────────────┘

WEIGHT                                           [label, accent]
┌───────────────────────────────────┐
│ 82.4 kg                              │  [h1]
│ Start 88.0  →  Now 82.4  →  Goal 78  │  [body, muted]
│ [sparkline]                          │
│ BMI 24.1 — a general estimate, not a │  [caption, faint]
│ full picture of your health.         │
└───────────────────────────────────┘

HRV                                              [label, accent]
┌───────────────────────────────────┐
│ 58 ms                                │  [h1]
│ Start 52                             │  [body, muted]
│ [sparkline]                          │
│ Heart rate variability — a signal of │  [caption, faint]
│ recovery your trainer uses to gauge  │
│ how rested you are.                  │
└───────────────────────────────────┘

Powered by Live Elevated                         [caption, faint, centered]
```

### 3.1 Header

```
{gym.toUpperCase()}          text-label text-accent   (identical to /s/[token]'s eyebrow line)
Hey, {client.name.split(' ')[0]}    text-h1 text-text-primary
Only you and {gym} can see this page.   text-caption text-text-faint
```
"Hey, {FirstName}" over a clinical "Progress Report" — warmer, matches the brief's "personal
health data ... encouraging, not a clinical dump" instruction. The privacy line is a deliberate
trust signal at the very top, not buried in a footer — reassurance before data, given this page
shows sensitive biometrics to someone with no login and no way to verify who sent them the link.

### 3.2 Activity card ("THIS WEEK")

```
rounded-lg border border-border bg-surface p-4 space-y-1
{n} workout{s} this week 🔥        text-h1 tabular-nums text-text-primary
                                    (🔥 only appended when n > 0 — omit for n === 0, an emoji
                                    next to "0" reads as mocking, not encouraging)
Last workout: {relative date}     text-caption text-text-muted
```
**Empty (n === 0, no workouts this week)**: *"No workouts logged this week yet."* — plain,
no emoji, no guilt language ("you missed...", streak-breaking framing) — just a fact.
**Empty (never worked out)**: *"Your first workout will show up here once you complete one."*

### 3.3 Weight card

```
rounded-lg border border-border bg-surface p-4 space-y-2
{current} kg                              text-h1 tabular-nums text-text-primary
Start {starting} → Now {current} → Goal {goal}   text-body text-text-muted
                                           (Goal clause omitted entirely when no goalWeightKg is
                                           set — see Open Question 1 below)
[Sparkline data={weightHistory}]          same h-12 container recipe as Surface 1
BMI {value} — a general estimate, not a full picture of your health.   text-caption text-text-faint
                                           (shown only when bmi !== null; the caveat sentence is
                                           NOT optional wording — BMI without a caveat reads as a
                                           clinical verdict to a lay reader, which this brief's
                                           "encouraging, not judgmental" instruction rules out)
```
**Empty (no weight readings at all)**: dashed-border empty variant, *"Your trainer hasn't logged
a weight reading yet."* — passive framing (it's not the trainee's job to have entered it; MVP is
trainer-entry-only, so implying the trainee should act here would be misleading).

No computed delta ("−5.6 kg", "3.6 kg to go") ships in this pass — see Open Question 2. The
three plain numbers + the trend line tell the story without the design taking a stance on
whether a shrinking or growing number is the "good" direction, since goal direction varies
per client and DESIGN.md itself flags (Elena's scope doc §4) that `Sparkline`'s max-marker is
tuned for "bigger is better" lifting PRs, not weight-loss goals — safest default for MVP is to
not editorialize the numbers at all.

### 3.4 HRV card

```
rounded-lg border border-border bg-surface p-4 space-y-2
{current} ms                              text-h1 tabular-nums text-text-primary
Start {starting}                          text-body text-text-muted (no goal clause — none exists)
[Sparkline data={hrvHistory}]
Heart rate variability — a signal of recovery your trainer uses to gauge how rested you are.
                                           text-caption text-text-faint
```
The explainer line is deliberate — HRV is a far less familiar number to a lay reader than body
weight; one plain sentence prevents the card from reading as an unexplained clinical readout.
**Empty**: *"Your trainer hasn't logged an HRV reading yet."*

### 3.5 Footer

```
Powered by Live Elevated     text-caption text-text-faint, centered — identical treatment to
                              /s/[token]'s existing footer (app/s/[token]/page.tsx:74)
```

### 3.6 Container width — deliberate divergence from `/s/[token]`

`/portal/[token]` uses **`.shell-tight`** (`max-w-md sm:max-w-lg lg:max-w-xl`), not `.shell`
like `/s/[token]`. This is a deliberate difference, not an inconsistency: `/s/[token]` lists
many exercises and genuinely benefits from `.shell`'s multi-column grid at `md:`/`lg:`; the
portal shows three or four stat cards total and would look sparse and disconnected spread across
three desktop columns. A single comfortable reading column at every width is the right shape for
this content, matching DESIGN.md §7's own guidance to "pick the tier that matches what the
surface *is*."

---

## 4. Shared build notes

### 4.1 `Sparkline` needs a `label` prop before Surface 2 ships

`components/charts/Sparkline.tsx:49` hardcodes `aria-label="Weight history sparkline"`
regardless of what data it's given. Once this component is reused for HRV (both surfaces) that
label is wrong for the HRV chart — a screen-reader user hears "Weight history" while looking at
an HRV trend. Add an optional `label?: string` prop, default `"Weight history sparkline"` for
backward compatibility with existing call sites, and pass `label="HRV history sparkline"`
explicitly at every HRV usage. Small, cheap, flag it now rather than after ship.

### 4.2 Chip-input component (new, shared by Goals + Home equipment)

One small reusable component — not two hand-rolled instances — since Goals and Home equipment
use the identical interaction: existing items as removable pills, a trailing add-input, a max-
item clamp mirroring `lib/client-profile.ts`'s own limits (20 for goals, 30 for equipment, 80
chars/item) so the UI can never let a trainer type something the server will then reject.

---

## 5. Accessibility

- Notes field: dashed border + `🔒 PRIVATE` label chip is a non-color signal (DESIGN.md §6's
  rule extended beyond selection states) — never rely on a subtly different border color alone.
- Consent checkbox: real `<label>` wrapping both the box and the sentence (tap target = the
  whole row, not just the 24px box), `aria-required="true"`.
- "Copy link" / "Copied" feedback: `aria-live="polite"` on the status text, matching the
  existing pattern's intent even though the current implementation
  (`app/dashboard/clients/[clientId]/page.tsx:61-69`) doesn't yet mark it — add it here.
- All new numeric inputs and stat readouts use `tabular-nums` (already the codebase convention)
  so digits don't jitter/reflow as values change.
- Every card on both surfaces uses real heading levels (`h2`/`h3` for section labels — not just
  styled `<p>` tags) so a screen-reader user can jump between Biometrics/Profile/Portal Link, or
  Activity/Weight/HRV, via heading navigation.
- Portal page has zero interactive controls beyond nothing (it's read-only) — no focus-trap or
  keyboard-nav concerns beyond the page's natural document order, which the wireframe order
  (§3.0) already gives a sensible top-to-bottom read order.

---

## 6. Microcopy — full list

**Surface 1**
- Biometrics empty (per card): "No readings yet" / "Log one below to start tracking."
- Log-reading form title: "Log a reading"
- Note field placeholder: "Note (optional)"
- Profile empty prompt: "Nothing saved for {name} yet — add their goals, equipment, and details below."
- Private-notes badge: "🔒 PRIVATE — only you see this"
- Portal Link empty: "No portal link yet." / "Generate one so {name} can check their own progress from their phone."
- Portal Link button (first time): "Create portal link"
- Portal Link button (repeat): "Regenerate link"
- Consent checkbox label: "I have {client.name}'s consent to store and share this info."
- Consent helper line: "This confirms sharing their weight, HRV, and activity through a private link — never the notes above, which stay private to you."
- Revoke confirm dialog: "Revoke this link? {name} won't be able to open it anymore — you can generate a new one any time."
- Portal Link meta line: "Created {date} · Consent confirmed {date}"

**Surface 2**
- Eyebrow: "{GYM NAME}" (uppercase, from branding)
- Greeting: "Hey, {FirstName}"
- Privacy line: "Only you and {gym} can see this page."
- Activity section label: "THIS WEEK"
- Activity stat (n > 0): "{n} workout{s} this week 🔥"
- Activity stat (n === 0): "No workouts logged this week yet."
- Activity last-workout: "Last workout: {relative date}"
- Activity never-worked-out: "Your first workout will show up here once you complete one."
- Weight section label: "WEIGHT"
- Weight readout: "Start {starting} → Now {current} → Goal {goal}" (goal clause omitted if unset)
- Weight empty: "Your trainer hasn't logged a weight reading yet."
- BMI caption: "BMI {value} — a general estimate, not a full picture of your health."
- HRV section label: "HRV"
- HRV readout: "Start {starting}"
- HRV explainer: "Heart rate variability — a signal of recovery your trainer uses to gauge how rested you are."
- HRV empty: "Your trainer hasn't logged an HRV reading yet."
- Footer: "Powered by Live Elevated"

---

## 7. Open questions for Dino

1. **Is goal weight always shown on the portal, or omitted entirely when unset?** Recommend:
   omit the "→ Goal" clause entirely when `goalWeightKg` is null (already the design above) —
   never show a fabricated or zeroed goal. Confirm this is fine, vs. always nudging the trainer
   to set one before a link goes out.
2. **Tone on weight — numbers only, or a computed "distance to goal" phrase?** This brief ships
   plain numbers + trend line with no computed delta (§3.3), the safer default given weight-loss
   vs. weight-gain goals need opposite framing and this codebase doesn't yet know which one a
   given client has. If you want a warmer "X kg to go" framing, that needs a `goal_direction`
   signal (lose vs. gain) added to the data model first — flagging as a real follow-up, not
   something to fudge with a guess.
3. **The 🔥 emoji on the Activity stat** — reads as encouraging to most people but is a stylistic
   call, not a settled system convention (nothing elsewhere in DESIGN.md uses an emoji in a
   stat readout this way, though Daily 5 chip and marketing sections do use emoji elsewhere).
   Fine to cut if it reads as too casual for the brand.

---

## 8. Handoff summary for Kevin

- Surface 1: extend `app/dashboard/clients/[clientId]/page.tsx` per §2 — Biometrics, Profile,
  Portal Link, in that order, above the existing Shared Workouts block. All three new sections'
  data already exists in the extended `GET .../[clientId]` response (`profile`, `metrics`) per
  Priya's contract — no new fetch needed beyond what that route already returns for
  Profile/Biometrics; Portal Link's create/regenerate/revoke calls the three dedicated routes.
- Surface 2: new `app/portal/[token]/page.tsx`, server component, mirroring `app/s/[token]`'s
  shape (`brandingToCssVars`, `notFound()` on missing token, `dynamic = 'force-dynamic'`) but
  with its own narrow data-fetch that never selects `notes` (§2.4, §0). Needs its own read
  helper in `lib/client-portal-db.ts` (or a sibling file) — do not reuse `toProfileJson`.
- Both surfaces: `Sparkline` needs the `label` prop fix first (§4.1) — small, do it before
  wiring HRV charts on either surface.
- New shared component: chip-input (§4.2) for Goals/Home equipment.
- Design review (mine) happens against real-data screenshots of both surfaces once built, per
  the standing process — not a self-cert from Kevin.
