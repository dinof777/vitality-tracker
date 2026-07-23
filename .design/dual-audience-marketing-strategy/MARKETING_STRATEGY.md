# Marketing strategy — dual-audience Home (consumer + gym/trainer)

Author: Rex (marketing/persuasion-psychology lane, on loan from CRE for this
pass — see note at bottom). Strategy only — no code. Handoff target: **Ivy**
(turn into IA/visual spec) and **Kevin** (build).

Grounded in the shipped product, read directly: `app/page.tsx`,
`components/home/ConsumerMarketing.tsx`, `components/home/UtilityStrip.tsx`,
`app/welcome/page.tsx`, `app/pro/page.tsx`, `app/dashboard/page.tsx`,
`DESIGN.md` §6 "Marketing sections" / §7 "Layout & navigation", `SITE.md`.

**Status check first, because it changes the brief:** Ivy already shipped two
briefs that solve most of what this assignment describes —
`.design/home-front-door/DESIGN_BRIEF.md` (the utility strip) and
`.design/consumer-sales-home/DESIGN_BRIEF.md` (the consumer sales content on
`/` and `/welcome`) — and both are live in the code, not just proposed. The
"/pro-first framing" problem this assignment describes is the **pre-Ivy**
state. This doc does three things: (1) names the psychology behind what's
already built, so it's a documented strategy and not just a design choice
nobody wrote down; (2) is decisive about the one architecture question that's
still open (fully answered in §2); (3) closes real gaps the existing briefs
left out of scope — a stated positioning line, an explicit feature-to-audience
map, and a bridge from Home's consumer content back to `/pro` mid-scroll,
not just at the very top.

---

## 1. Positioning / core message

**One-line value proposition (consumer-first, Pro reads themselves into it):**

> **Live Elevated — the workout, built around you.**

This is not new copy — it's the existing hero H1 (`components/home/
ConsumerMarketing.tsx:92-94`) promoted to the level of a stated positioning
line, because right now it lives only as page copy, not as a documented
"this is what we stand for" the rest of the org can build against.

**Why this line, and not a feature list, and not a Pro-first line:**
"Built around you" does two jobs at once — it's the plain factual claim
(goal → focus → equipment → time → generated workout) *and* the emotional
promise (this isn't a generic plan, it's yours). Per the **Elaboration
Likelihood Model** (Petty & Cacioppo), messages framed around personal
relevance get processed via the effortful "central route" rather than
skimmed via peripheral cues — a visitor reads "built around you" as being
about *them*, which earns closer attention than "291 exercises" would on its
own (that's supporting evidence, not the hook — see §4).

**What "Live Elevated" stands for, one level up (the brand promise both
audiences share):** *elevate the training experience* — for a person
training themselves, that means a workout that fits their goal, equipment,
and time instead of a generic plan; for a gym or trainer, it means handing
that exact experience to their members, wearing the gym's own name instead
of Live Elevated's. One brand promise, two deliveries. The Pro variant line,
already close to right in `app/pro/page.tsx:102-104` ("Your gym's training
app. Branded as yours.") should be read as the Pro-specific expression of
the same promise, not a second brand — recommend no change there, just
naming the throughline: **consumer gets the elevated workout; Pro gets to
hand that same elevation to their members under their own name.**

---

## 2. Dual-audience architecture — the decision

**Recommended and already-built structure: consumer-led home with a
persistent, low-key secondary Pro path — NOT a hard fork, NOT a segmented
above-the-fold split.** This is `UtilityStrip` (`components/home/
UtilityStrip.tsx`) sitting above a fully consumer-first `ConsumerMarketing`
body. Confirmed correct; here's why, named:

- **Base rates make this a majority/minority audience, not a 50/50 split.**
  A CRE-scale analogy: you don't design a listing site's home page as a coin
  flip between buyers and brokers when 95%+ of traffic is one side. The
  existing brief already reasoned this from the numbers side
  (`.design/home-front-door/DESIGN_BRIEF.md:14`, "95%+ of visits"); the
  psychology backs the same call. A **segmented above-the-fold split**
  (logo-left "I train myself" / logo-right "I run a gym") forces every
  visitor — including the 95% majority — to make a categorization decision
  before they see any content. That's an unforced tax on the group you most
  need to convert fast.
- **Hick's Law + the paradox of choice (Schwartz):** decision time rises
  with the number and weight of options presented. A hard fork *is* a
  decision, deliberately — the wrong kind, here. It creates a moment of
  friction for the majority visitor who has no ambiguity about who they are.
  The utility strip avoids this: it's discoverable, not decisional — a
  Pro-intent visitor self-identifies against text that names them ("For
  gyms & trainers"), a consumer visitor's eyes pass over two small
  right-aligned links that aren't competing for attention with anything (no
  fill, no border — `UtilityStrip.tsx:9-22`).
- **Self-selection over interruption (message-match theory):** the
  *content* below the strip still has to work for whoever scrolls it. This
  is where the existing build is right to keep `ConsumerMarketing`
  100% consumer-voiced rather than diluting it with "...or if you're a
  gym..." asides throughout. A gym owner or trainer reading it recognizes
  the underlying capability (the builder, the 291-exercise library, the
  SyncroFit handoff) is the same infrastructure their own branded app would
  run on — they don't need it re-explained to them in gym language on this
  page; they need one clear, well-timed door to the page that *is* in gym
  language (`/pro`). That's §5's job, not Home's.
- **What a consumer-led-with-persistent-path structure risks, and how the
  build already guards it:** the risk is a Pro-intent visitor bounces
  before reaching the one exit at the top, having decided ~6 consumer
  feature cards in that this isn't for them. The existing build only offers
  one exit (top strip) and one soft link at the very bottom of the
  *profiled* return-visitor state (`app/page.tsx:257-262`, "See everything
  Live Elevated can do →" — itself consumer-framed, not a Pro exit). **This
  is the one real gap** — closed in §5 with a second, quiet exit ramp placed
  where a Pro-intent visitor's relevance actually drops off mid-scroll,
  not just at the top before they've scrolled at all.

**Verdict: keep the architecture. Add one section (§5/§6). Don't build a
fork.**

---

## 3. What to show, to whom, in what order

| Feature | Shared infrastructure | Consumer-facing | Pro-facing |
|---|---|---|---|
| 291-exercise illustrated library | ✓ (the actual library) | "291 illustrated exercises" | "Your own library" (+ custom exercises, per-gym renames) |
| Goals → focus → equipment → time builder | ✓ (same generator, same `BuilderControls`/`TenantBuilderControls`) | "Build in seconds" | "Build & share" |
| SyncroFit handoff | ✓ (same deep link, same event webhook) | "Send to SyncroFit" | "SyncroFit built in" + engagement analytics back |
| Progressive-overload logging | Consumer-only surface | "Progressive overload, tracked" | — (not a Pro-facing pitch item; trainers see client engagement, not per-set logs) |
| Daily 5 habit checklist | Consumer-only surface | "Daily 5" | — |
| Save routine / plan the week | Consumer-only surface | "Save it, plan your week" | — |
| Free, no account | Both, same mechanism | "Free, no account" (their own use) | "Free to start" (their gym's clients, same mechanism) |
| Brand autopilot (logo/colors/name from a pasted URL) | Pro-only | — | "Brand autopilot" |
| Embed (button/iframe/QR) on gym's own website | Pro-only | — | "Put it on your website" |
| Printable QR poster | Pro-only | — | "Front-desk poster" |
| Client engagement tracking | Pro-only | — | "Real engagement" |

**Sequencing rule for Home (consumer surface): differentiators first and
last, supporting features in the middle.** This follows the **serial
position effect** (Murdock) — items at the start and end of a list are
recalled and weighted more heavily than the middle. The current feature grid
order (`ConsumerMarketing.tsx:14-55`) is close but under-weights the
strongest differentiator:

**Current order:** Goals-first → 291 exercises → Build in seconds →
Progressive overload → Daily 5 → Save/plan week → SyncroFit → Free, no
account.

**Recommended reorder:** Goals-first → 291 exercises → Build in seconds →
**SyncroFit handoff** (move up from 7th to 4th) → Progressive overload →
Daily 5 → Save/plan week → Free, no account (stays last, adjacent to the CTA
that follows).

Why move SyncroFit up: "291 illustrated exercises" and "Build in seconds"
are strong but every fitness app claims some version of them. **A real,
working handoff to a third-party interval timer is the one claim a
competitor can't casually copy** — it belongs in the front third of the
list, at peak attention, not buried after the generic progressive-overload
claim. Free/no-account stays last on purpose — reciprocity (Cialdini) lands
best immediately before an ask, and the feature grid is immediately followed
by the builder walkthrough and then the CTA.

---

## 4. Psychology levers — named, mapped to what's shipped

| Lever | Principle (cite) | Where it's already used | Where it's still missing |
|---|---|---|---|
| Personal relevance framing | Elaboration Likelihood Model (Petty & Cacioppo) | Hero H1 "built around you" | — |
| Low-friction first ask | Reciprocity (Cialdini) | "Free, no account" stated 3× (hero micro-proof, feature card, final CTA subhead) | — |
| Specificity as credibility | Concreteness effect / detail-as-trust heuristic | 291 exercises, 19 equipment types — sourced live from `lib/exercises.ts` so copy can't drift (`ConsumerMarketing.tsx:9-12`) | — |
| Show, don't tell | Uncertainty-reduction via concreteness (real artifact beats a mockup) | `BuilderPreview` reuses the actual `BuilderControls` row recipe, captioned "This is the actual screen — not a mockup" (per `.design/consumer-sales-home/DESIGN_BRIEF.md:172-174`) | — |
| Single clear next action | Choice architecture / decision simplicity | One filled-accent CTA per screen state — never two competing filled buttons above the fold (`DESIGN.md` convention, "Trainer log in" and "For gyms & trainers" are both text-only, unfilled) | — |
| Progress / goal-gradient | Goal-gradient effect (Kivetz, Urminsky & Zheng) | `StreakBadge`, per-exercise sparkline on last session | Could extend: Daily-5 progress shown *before* signup on `/welcome` is unearned — correctly, it isn't (nothing to lose before you've started, per the existing brief's reasoning at `.design/consumer-sales-home/DESIGN_BRIEF.md:82-90`) |
| Anchoring | Price/tier anchoring | `/pro` pricing: FREE tier first with concrete inclusions, PRO second, labeled "Soon" (`app/pro/page.tsx:296-317`) | — |
| Commitment & consistency, open-loop | Zeigarnik effect (unfinished tasks stay salient) | Dashboard "START HERE" numbered 1-2-3 checklist for a new trainer (`app/dashboard/page.tsx:86-124`) | — |
| Social proof | Social proof (Cialdini) | **Not used anywhere in the product today** — neither `/`, `/welcome`, nor `/pro` carries a testimonial, logo wall, or usage stat | This is the single biggest unpulled lever. **Do not fabricate it.** No client testimonials, gym logos, or usage numbers exist to cite yet — flag `[VERIFY WITH DINO]` and hold the section empty/omitted until real data exists. Recommended placement once available: on `/pro`, directly after "Who it's for" (segments self-identify, then immediately see others like them — proof lands hardest right after self-recognition, not before it) |
| Loss aversion, used honestly | Loss aversion (Kahneman & Tversky) | Not overtly used, and that's the right call at this stage — no fake urgency ("only 3 spots left"), no countdown timers. The one honest form available — "don't break your streak" — only applies post-engagement (`StreakBadge`), never pushed on a cold visitor who has nothing to lose yet | Do not add urgency copy to Home. There's no honest scarcity in this product (unlimited signups, no capacity limit) — inventing any would violate the no-misleading-claims constraint |

---

## 5. The Pro view/pages — what lives where, and the bridge

**Home (`/`, `/welcome`) carries recognition only — one line, one link, one
new mid-scroll exit ramp. Everything else about Pro lives on `/pro`.**

- **Top of Home/Welcome (existing, keep as-is):** `UtilityStrip` — "For gyms
  & trainers" → `/pro`. This is the *first* exit, for a visitor who
  self-identifies before reading anything.
- **NEW — mid-scroll exit ramp (the one gap from §2):** insert one quiet
  card between the SyncroFit callout and the Final CTA in
  `ConsumerMarketing.tsx` (full spec in §6, section 5). This is for the
  visitor who *didn't* self-identify at the top strip, read three or four
  consumer feature cards, and is starting to recognize "this is consumer
  content, not what I came for" — the exact moment relevance drops. Message
  matching shouldn't stop being available just because the first exit was
  above the fold; giving a second, well-timed one reduces silent bounce
  instead of making that visitor scroll back up. It must not compete with
  the consumer CTA: outline/ghost button, not filled accent, no motion
  emphasis beyond the existing scroll-reveal.
- **Everything else — deep Pro education, segments, embed instructions,
  pricing, FAQ, sign-up — stays on `/pro` only.** Do not duplicate any of
  it onto Home. Home's job is to sell the workout; `/pro`'s job is to sell
  the platform. Cross-pollinating dilutes both (this is the same
  message-match logic from §2, applied to the Pro side now).
- **The bridge itself is already well-built on `/pro`'s side** — segments
  ("Built for": trainers / boutique gyms / online coaches / studios,
  `app/pro/page.tsx:63-68,127-141`) do their own self-selection one level
  down, same principle as §2 applied within the Pro audience. No change
  recommended there beyond the social-proof placement noted in §4.
- **Dashboard as the "Pro view" post-signup:** the `/dashboard` "START HERE"
  1-2-3 checklist (`app/dashboard/page.tsx:86-124`) is the right pattern —
  named in §4 as goal-gradient/Zeigarnik. Keep it as the model for any
  future Pro onboarding surface; don't replace it with a passive dashboard
  that just lists links.

---

## 6. Section-by-section outline — the recommended Home

This is the existing `ConsumerMarketing.tsx` structure, confirmed, with the
one addition (section 5, new) and one reorder (section 2, from §3) called
out explicitly. Ready for Ivy to spec exact copy/visual treatment for the
new section and for Kevin to build.

| # | Section | Headline | Subhead / purpose | Psychology principle | Status |
|---|---|---|---|---|---|
| 0 | Utility strip | *(no headline — plain text links)* | "For gyms & trainers" / "Trainer log in" — the top-of-page self-selection exit for Pro-intent visitors, before any consumer content loads | Self-selection over interruption; Hick's Law (near-zero decision cost) | Built, keep as-is |
| 1 | Hero | "A workout, built around you — in under a minute." | Subhead states the mechanism (goal, equipment, time → generated workout, log or send to SyncroFit). Primary CTA "BUILD YOUR FIRST WORKOUT" → `/setup`. Micro-proof line: exercise/equipment counts + "free, no account required" | Personal relevance (ELM); reciprocity (free-first); specificity-as-credibility | Built, keep as-is |
| 2 | Features grid | "Everything you need to actually train." | 8 cards — **reorder per §3**: Goals-first → 291 exercises → Build in seconds → SyncroFit handoff → Progressive overload → Daily 5 → Save/plan week → Free, no account | Serial position effect (differentiators at start, reinforcement at end) | Built; reorder recommended (§3) |
| 3 | Builder walkthrough | "From tap to trained, in four steps." | 4 numbered steps + a real, non-mock preview of `BuilderControls`' own UI, captioned "This is the actual screen — not a mockup" | Concreteness/show-don't-tell; uncertainty reduction | Built, keep as-is |
| 4 | SyncroFit callout | "We build the workout. SyncroFit runs the clock." | 3-fact tile row: every style, cues travel, no re-typing. Honest disclosure that Live Elevated has no timer of its own | Authority via named integration partner; honesty as trust-building (no overclaim) | Built, keep as-is |
| 5 | **Pro exit ramp — NEW** | "Run a gym or train clients?" | One-line body: "Give every member this exact workout experience — branded as yours." Outline/ghost button (not filled), "See Live Elevated Pro →" → `/pro`. No feature list, no stats — the point is the exit, not a second sales pitch | Message-match at the point of declining relevance; graceful self-selection rather than forced scroll-back | **New — not yet built.** Spec for Ivy: same `Reveal`/callout-box recipe family as section 4, but ghost-button treatment per `DESIGN.md` §6 "Ghost button" so it never reads as competing with the consumer CTA below it |
| 6 | Final CTA | "Build your first workout — see for yourself." | "No signup, no credit card. Answer a few quick questions and start today." Primary CTA repeats "BUILD YOUR FIRST WORKOUT" → `/setup` | Reciprocity + friction removal restated at the point of decision (recency) | Built, keep as-is |

**`/pro` (dedicated Pro page) — validated, one addition flagged:**

Hero (branded phone mock — concreteness for the white-label promise) → Who
it's for (segments — self-selection one level down) → **[future: social
proof, once real data exists — see §4]** → Features → Put it on your
website → Train clients anywhere → How it works → SyncroFit callout → FAQ
(objection handling — reduces perceived risk right before the pricing/ask)
→ Pricing (FREE anchored first) → Final CTA → Footer. No structural changes
recommended to what's already built; the only gap is the bracketed social
proof slot, intentionally left empty pending real testimonials/logos/usage
numbers Dino can supply — never fabricated.

---

## Note on scope

This assignment sits outside Rex's core CRE lane (Native Realty, Pipedrive,
CoStar/Crexi/LoopNet, Apollo.io) — it was routed here explicitly for
transferable marketing-psychology skills, per the task brief. No CRE
constraints (Pipedrive stages, CAN-SPAM, broker-approval gates) apply to
this deliverable; the equivalent constraint honored throughout is the same
"no fabricated data" discipline Rex applies to CRE prospect lists — applied
here to social proof and usage claims (§4, §6): every number cited (291
exercises, 19 equipment types) is sourced from the live code
(`lib/exercises.ts`), and every place a real number is missing (testimonials,
usage stats) is flagged rather than invented.

**Handoff:** Ivy owns turning §5's new section and §3's reorder into a
build-ready IA/visual spec (a new `.design/<feature>/DESIGN_BRIEF.md` in the
same pattern as the two existing ones this doc builds on). Kevin builds once
Ivy specs it. No code changes made as part of this deliverable.
