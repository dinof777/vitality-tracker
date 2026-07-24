# Design brief — Photoreal lifestyle marketing imagery

Owner: Ivy (UX/UI). Design/spec only — Jeff generates the images from the shot
list below (nano-banana image MCP), Kevin builds the placements. No build
staffed for this pass; Ivy signs off once Kevin has real-image screenshots
(see "Handoff" at the bottom).

**Decision already made (owner):** photoreal lifestyle photography — people
training, holding a phone with the Live Elevated app open — replaces the
lime-on-carbon illustrated style as the marketing-imagery direction. This
brief's job is making photoreal **cohere** with the app's existing stark
carbon-black (`#121316`) / lime (`#A3E635`) editorial brand, not clash with
it, and pinning down exactly where it goes and what gets generated.

Surfaces: `components/home/ConsumerMarketing.tsx` (primary — the consumer
sales page, hosted at `/`'s first-time branch and standalone at `/welcome`)
and `app/pro/page.tsx` (the gym/trainer white-label sales page). `/g/[slug]`
tenant pages are explicitly **out of scope** — see "Scoped out" below.

---

## 1. Treatment / grade — one cohesive shoot, not assorted stock

Every generated image in this set follows the same recipe so they read as one
photographer's work, not six unrelated stock photos:

- **Low-key, moody gym lighting.** Deep shadows crushing toward `#121316`
  (the app's own `background` token — literally, not approximately). Light
  comes from practical sources in-frame — gym LED strips, overhead spots, a
  phone screen's glow on a face or hand — never flat, bright, white
  commercial-gym lighting. This is the single biggest lever for "looks like
  it belongs on this app" vs. "looks like stock."
- **Desaturated except a deliberate lime pop.** Everything reads slightly
  muted/cool except one accent per image landing in `#A3E635` — the phone
  screen's glow, an apparel detail (shoe, strap, chalk-bag zip), gym
  signage/tape. This mirrors the job the `accent` token does everywhere else
  in the product: one color that means "Live Elevated," never diluted by
  competing with a rainbow of gym-photo color.
- **High contrast, warm-on-cool.** Slightly warm highlights on skin tones
  against cool/neutral shadow — not a full teal-orange grade, just enough
  separation to feel graded rather than flat. Subtle film grain, not a
  glossy/smoothed stock-photo finish.
- **Mid-movement, not posed-and-smiling-at-camera.** Caught mid-rep, mid-set,
  mid-breath — the same "real training" register the product's own copy uses
  ("Built by training, not by marketing"). No crossed-arms-smiling-at-camera
  fitness-brochure poses.
- **Deliberate negative space.** Every image that will sit behind or beside
  copy is composed off-center (rule of thirds) with a clean, dark, low-detail
  region on the side text will occupy — generated with that framing in mind,
  not cropped after the fact.

**Legibility scrim** — any image with copy directly on top gets a gradient
scrim (not a flat dark overlay, which would flatten the photo into wallpaper):
```
bg-gradient-to-r from-background/95 via-background/60 to-transparent   (text beside image)
bg-gradient-to-t from-background/90 via-background/40 to-transparent   (text below/centered)
```
Gallery-band tiles (no overlaid copy) get the grade only, no scrim.

This recipe is now documented at `DESIGN.md` §6, "Marketing photography
(photoreal lifestyle)" — Kevin builds against that recipe, and any future
marketing photo request reuses it rather than re-deriving a look.

---

## 2. Placements

### Consumer (`components/home/ConsumerMarketing.tsx`) — primary surface

**A. Hero — split layout, new**
`ConsumerMarketing.tsx:95-117`. Today the hero is a single centered text
column with no visual. Add a photo as a second element, ordered so it never
adds scroll depth to the mobile hero (which is already tuned and 320px-safe
per `DESIGN.md` §6/"Marketing hero headline"):

- **Mobile/tablet (`<lg`):** image renders full-width, `aspect-[4/5]`,
  **after** the existing CTA + micro-proof line — a capping visual before the
  scroll continues into Features, not a delay before the CTA.
- **Desktop (`lg:`):** wrap the section in `lg:grid lg:grid-cols-2
  lg:items-center lg:gap-12` (the same split `/pro`'s hero already uses,
  `app/pro/page.tsx:99`) — text column left (unchanged), image right,
  `object-cover` filling an `lg:aspect-square` slot. No extra vertical space
  used; it fills the horizontal room desktop already has.

```tsx
<section className="px-5 pb-14 pt-6 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-12 lg:mx-auto lg:text-left lg:pb-20">
  <motion.div variants={stagger} initial="hidden" animate="show" className="text-center lg:text-left">
    {/* existing hero content, unchanged */}
  </motion.div>
  <Reveal className="mt-10 lg:mt-0">
    <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-border lg:aspect-square lg:max-w-none">
      <Image src="/marketing/hero-consumer.jpg" alt="A person mid-set with a kettlebell in a dark gym, phone in hand showing the Live Elevated workout builder" fill priority sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
    </div>
  </Reveal>
</section>
```
This is a *reasonable* diff sketch, not a literal patch — Kevin should
confirm the exact grid math against the live hero markup, but the structure
(text-first DOM order → maps to left column at `lg:`, image trails on mobile)
is the load-bearing part.

**B. Gallery band — new section**
Insert **between Features (`:120-139`) and the Builder walkthrough
(`:142-169`)**. Reasoning: Features is 8 text-heavy cards; the Builder
walkthrough is another content-dense explainer. A photo break between them
gives the scroll a breather and reinforces "everything you need to actually
train" with training itself, right where the claim was just made — rather
than being a decorative add-on with no narrative job.

```tsx
<section className="px-5 py-10">
  <Reveal className="mx-auto mb-8 max-w-2xl text-center">
    <p className="mb-2 text-label text-accent">TRAIN YOUR WAY</p>
    <h2 className="text-h2 font-bold text-text-primary">Strength, cardio, mobility — one library.</h2>
  </Reveal>
  <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
    {[
      { src: '/marketing/gallery-strength.jpg', alt: 'A person mid-rep on a heavy dumbbell lift in a dark gym' },
      { src: '/marketing/gallery-cardio.jpg', alt: 'A person mid-swing on a jump-rope conditioning interval' },
      { src: '/marketing/gallery-mobility.jpg', alt: 'A person in a deep mobility stretch on a gym floor' },
    ].map((img) => (
      <motion.div key={img.src} variants={fadeUp} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border">
        <Image src={img.src} alt={img.alt} fill loading="lazy" sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
      </motion.div>
    ))}
  </motion.div>
</section>
```

**C. Social-proof section — no photo, by design**
`ConsumerMarketing.tsx:200-234`. Do **not** place any photo in or adjacent to
this section. See "Framing/ethics" below — this is the load-bearing
constraint on the whole brief.

**D. Final CTA — full-bleed bookend, new background**
`ConsumerMarketing.tsx:253-268`. Add a full-bleed background photo behind the
existing centered Final CTA content, scrimmed so the headline/button stay at
full contrast. Bookends the page: the hero opened with a phone-in-hand
mid-set moment; this closes with a phone-in-hand "workout logged" moment —
same visual language, different beat, tying back to "Progressive overload,
tracked" from the Features grid.

```tsx
<section className="relative overflow-hidden px-5 py-20">
  <div className="absolute inset-0 -z-10">
    <Image src="/marketing/final-cta-bookend.jpg" alt="" fill aria-hidden loading="lazy" sizes="100vw" className="object-cover object-top" />
    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-background/40" />
  </div>
  <Reveal className="mx-auto max-w-2xl text-center">
    {/* existing Final CTA content, unchanged */}
  </Reveal>
</section>
```
`aria-hidden` + empty `alt` on this one specifically — it's decorative
background texture behind text that already says everything, not
content-bearing imagery (unlike A/B, which are content and need real alt
text).

> **Note (2026-07-23):** the D/E scrim values in this section's code snippets
> were superseded by `DESIGN_REVIEW.md`'s Must-Fix #1/#2 — see that file for
> the corrected gradient/opacity values. Not re-decided by this amendment;
> carried forward as-is.

### Pro (`app/pro/page.tsx`)

**E. Hero — background texture layer, not a foreground subject**
`app/pro/page.tsx:97-125`. The hero already has its own product-proof visual
— `PhoneMock`, demonstrating the actual white-label value prop (a gym's logo
and colors on the app). That stays exactly as-is; it's doing real work a
lifestyle photo can't replace. Add a **subtle full-bleed background photo**
behind the whole hero `<section>`, heavily scrimmed, reusing
`gallery-strength.jpg` (no new asset needed — this is texture/mood, not a
subject competing with `PhoneMock` for attention):

```tsx
<section className="relative overflow-hidden px-5 pb-20 pt-12 sm:pt-16">
  <div className="absolute inset-0 -z-10">
    <Image src="/marketing/gallery-strength.jpg" alt="" fill aria-hidden loading="lazy" sizes="100vw" className="object-cover opacity-30" />
    <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
  </div>
  <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
  {/* existing hero content, unchanged */}
</section>
```

**F. "Who it's for" → photo band — SUPERSEDED, see §6**
~~Insert directly after the `SEGMENTS` grid (`:128-141`), before Features
(`:144`). One dedicated new asset — a coach coaching a client, phone in the
trainer's hand — makes the visual case for "give every member this exact
workout experience," the human/service angle that's distinctly a Pro-page
job (Consumer's gallery band is solo-training; Pro's is coach + client).~~

```tsx
<section className="px-5 py-4">
  <div className="relative mx-auto aspect-[21/9] max-w-5xl overflow-hidden rounded-2xl border border-border">
    <Image src="/marketing/pro-coach-client.jpg" alt="A trainer coaching a client through a set, phone in hand showing the Live Elevated app" fill loading="lazy" sizes="(min-width: 1024px) 80vw, 100vw" className="object-cover object-top" />
  </div>
</section>
```

> **Amended 2026-07-23 — this placement and asset are retired.** The owner
> corrected the use case: Live Elevated Pro is remote-delivery, self-serve —
> the coach is never in the room with the trainee. The single "coach
> coaching a client" photo above depicted in-person coaching, which is
> factually wrong about how the product works, so `pro-coach-client.jpg` has
> been deleted and is **not** to be regenerated. It's replaced by a 3-image
> "how it works" band (`pro-build-send.jpg`, `pro-qr-scan.jpg`,
> `pro-train-remote.jpg`) at the same slot (directly after `SEGMENTS`,
> before Features) — full build-ready spec at **§6 below**. Everything else
> in this brief (A–E, G, Scoped out, shot list #1–5, Framing/ethics,
> Implementation notes) is unaffected and still stands as written.

**G. SyncroFit callout, FAQ, Pricing — no photo**
Scoped out deliberately. The SyncroFit callout and FAQ are functional
explainers, not aspirational moments — a photo there would be decorative
without reinforcing understanding, unlike E/F which are literally
demonstrating product usage or the target relationship. Pricing is a
comparison table; a photo would compete with, not support, the two-column
scan.

### Scoped out — `/g/[slug]` tenant landing

**Not touched by this brief.** `app/g/[slug]/page.tsx` is a working app
screen (a gym's own front door — today's generated workout), not a sales
pitch, and it's rendered inside `brandingToCssVars(tenant.branding)` — the
gym's own colors, not necessarily lime. Two reasons this stays out:
1. **App-isolation.** A gym's white-label promise is "your members train on
   *your* brand." Live-Elevated-branded lifestyle photography (lime accents,
   Live-Elevated-app screens visible on phones) on a gym's own page
   contradicts that promise the same way a competitor's logo would.
2. **It's not a sales page.** Nothing here is persuading a visitor to sign
   up — it's the actual product a gym's member already has a link to. Adding
   marketing imagery to a working screen is scope creep on a functional
   surface, not a marketing placement.

If a tenant landing ever needs its own aspirational photography, that's a
new brief scoped to the gym-branding system, not an extension of this one —
flagging for the owner rather than guessing.

---

## 3. Shot list

Six unique images. Lean by design: every image is tied to a specific
placement above, one is deliberately reused (D → E) rather than commissioning
a near-duplicate, and the count stays small enough that six generations plus
a couple of reroll attempts is a bounded job for Jeff, not an open-ended
photo library.

| # | Filename | Placement(s) | Depicts | Aspect | App on screen? |
|---|---|---|---|---|---|
| 1 | `hero-consumer.jpg` | Consumer hero (A) | Person mid-set with a kettlebell or dumbbell, dark gym, phone visible in one hand showing the Live Elevated home/build screen (dark background, lime primary button, rounded exercise-row cards) | 4:5 | **Yes** |
| 2 | `gallery-strength.jpg` | Consumer gallery band (B); reused as Pro hero backdrop (E) | Person mid-rep on a heavy compound lift (goblet squat, deadlift, or dumbbell row), dark gym floor, no phone in frame | 4:5 (crops to 21:9 for E) | No |
| 3 | `gallery-cardio.jpg` | Consumer gallery band (B) | Person mid-swing on a jump rope or battle-rope interval, same lighting/grade as #2 | 4:5 | No |
| 4 | `gallery-mobility.jpg` | Consumer gallery band (B) | Person in a deep floor stretch / mobility hold (ties to the recently-shipped Physical Therapy + Knee focus), same grade | 4:5 | No |
| 5 | `final-cta-bookend.jpg` | Consumer Final CTA (D) | Person finishing a set, phone visible showing a completed-workout / progress screen with a sparkline (ties to "Progressive overload, tracked") | 21:9 (crops taller on mobile) | **Yes** |
| ~~6~~ | ~~`pro-coach-client.jpg`~~ | ~~Pro "who it's for" band (F)~~ | **Retired 2026-07-23 — depicted in-person coaching, which is factually wrong. Deleted, not regenerated. See §6 for its 3-image replacement.** | — | — |

**Must-haves across the set (Jeff, generating):**
- **Diversity across the six images** — spread age, gender, body type, and
  skin tone across the set rather than repeating one demographic; no single
  image needs to be "diverse" on its own, the set does.
- **Authentic mid-movement**, not posed-smiling-at-camera stock — see §1.
- **No recognizable real people, no real gym/apparel/equipment brand logos**
  — unbranded apparel and equipment, generic gym environments.
- **Where the phone/app is on screen (#1, #5, #6):** the screen must read as
  recognizably *this* app — dark carbon background, lime accent on the
  primary button/UI chrome, rounded card rows — not pixel-perfect to a real
  screenshot (that's not achievable via generation), but reject any output
  showing a light/white UI or a different accent color, since that
  misrepresents the product rather than merely being imprecise about it.
- **Consistent grade across all six** — same lighting key, same desaturation
  level, same lime-pop treatment (§1) — so the set reads as one shoot when
  placed across two pages.

*The count is now eight active images (five original + three from §6), not*
*six — the table above is left as the historical record of the original*
*commission; §6 carries its own shot-list row for the three replacements.*

---

## 4. Framing / ethics — non-negotiable

These are **aspirational brand imagery**, full stop — never presented as real
member testimonials, never captioned with a name, a role, a gym, or a result
("Sarah, lost 12 lbs"). This is the constraint that protects the honest
empty-state social-proof slot already shipped
(`ConsumerMarketing.tsx:200-232`, `.design/marketing-home-refinements/
DESIGN_BRIEF.md` §2) — that section states plainly "the reviews are still
being written," and a photo of a smiling person next to or inside that
section would silently contradict its own copy. Concretely:

- No photo renders inside, above, or immediately adjacent to the Social-proof
  section (§2.C above) — full stop.
- No caption, name, or quote is ever attached to any of the six images.
- Alt text (§2's snippets) describes the action and, where applicable, that
  the Live Elevated app is visible — never phrased as a testimonial ("Sarah
  training with Live Elevated").
- Nothing in the imagery or its placement implies a specific fitness outcome
  (weight lost, strength gained, before/after) — this is imagery of the
  *product being used*, not an outcome claim, which keeps this clear of any
  health/results legal-gating territory the product doesn't currently
  trigger elsewhere.

This constraint applies identically to the three §6 replacement images —
see §6's own copy/alt-text table, which was written against this exact
checklist.

---

## 5. Implementation notes for Kevin

- **Use `next/image`, not the plain `<img>` the app uses elsewhere.** This is
  a deliberate departure from `components/workout/ExerciseThumb.tsx`'s
  pattern (plain `<img>`, `eslint-disable @next/next/no-img-element`) — that
  choice fits a 48px in-list thumbnail where responsive `srcset`/priority
  hardly matter. These are hero-scale, above-the-fold images on marketing
  pages where LCP and layout-shift genuinely matter, so `next/image`'s
  automatic responsive sizing and `priority` hint earn their keep here.
  Exercise thumbnails are unaffected — out of scope.
- **`priority` only on the Consumer hero image (#1)** — it's the only one of
  the six that's likely above-the-fold on first paint. Everything else
  (`loading="lazy"`, the `next/image` default) stays lazy, including the
  gallery band and both full-bleed bookend/backdrop images. The three §6
  images inherit this rule too — none of them are above-the-fold.
- **`sizes`** tuned per placement, as shown in the snippets above — the
  split-hero image is ~40vw at `lg:` and ~90vw below it; gallery tiles are
  ~33vw at `sm:` and full-width below; full-bleed bands are always `100vw`.
- **No layout shift:** every image container has an explicit `aspect-[…]`
  class (§2's aspect ratios) with `fill` + `object-cover`, so the box exists
  before the image loads — no CLS regardless of load order.
- **Dark-canvas fit:** the app is dark-mode-only (`DESIGN.md` §8) — there's
  no light-mode variant to design for. What matters instead is that every
  image reads correctly against `#121316` at every viewport: `object-cover`
  fills its box completely (no letterboxing to a lighter fallback color),
  and the two full-bleed placements (D, E) always carry the gradient scrim
  from §1 so text contrast never depends on how dark a given generation
  happens to land.
- **File location:** `public/marketing/<filename>.jpg`, matching the
  existing `public/exercises/*.jpg` convention already in this repo.
- **Alt text:** exactly what's in each snippet's `alt` prop above — descriptive
  and action-based, `alt=""` + `aria-hidden` only for the two pure-background
  placements (D, E) where the image is decorative texture behind
  self-sufficient text.

---

## 6. Pro imagery — corrected use case (F band replacement)

**Added 2026-07-23.** The owner's correction: Live Elevated's value is
*remote delivery + self-serve* — the coach and the trainee are never in the
same room. The retired `pro-coach-client.jpg` (§2.F, §3 row 6) depicted
in-person coaching, which contradicts the product. It's deleted and replaced
by three new assets, already generated, graded to the §1 recipe, and QC'd:
`pro-build-send.jpg`, `pro-qr-scan.jpg`, `pro-train-remote.jpg` — all in
`public/marketing/`. This section is the complete, build-ready replacement
for the old F snippet. **Placement is unchanged**: directly after the
`SEGMENTS` grid (`app/pro/page.tsx:141-154`), before Features (`:171`).

### 6.1 The story, and why three images beat one

The two real scenarios behind Pro are (1) a trainer/gym builds a workout and
*sends* it to a client elsewhere, and (2) a member *scans a QR poster* at the
gym/box and pulls the workout up on their own phone. In both, the person
always trains alone with a phone, not a coach. That's naturally a **3-beat
sequence** — build → deliver → train — not a single frozen moment, which is
exactly why one 21:9 band (built for a single "the relationship" image) no
longer fits: it can't show a *process* the way three images in reading order
can. Reusing the Consumer gallery band's proven shape (§2.B) rather than
inventing a new grid is deliberate — it's already documented, already
responsive-correct, and now gives both sales pages the same "3 photos, one
story" rhythm instead of two different layout systems for photo bands.

### 6.2 Layout

**Desktop (`sm:` and up) — 3 columns. Mobile (`<sm`) — stacked, 1 column.**
Identical grid mechanics to the Consumer Gallery band (§2.B) — no
breakpoint override below `sm:`, so it's a genuine single column on phones,
not a cramped 3-up:

```tsx
const HOW_IT_WORKS = [
  {
    n: '1',
    src: '/marketing/pro-build-send.jpg',
    alt: 'A trainer at a laptop building a leg-day workout in the Live Elevated app, phone in hand sending it to a client.',
    title: 'Build & send',
    body: 'Assemble sets, reps, and exercises from your library — then send it as a link, a QR, or straight to SyncroFit.',
  },
  {
    n: '2',
    src: '/marketing/pro-qr-scan.jpg',
    alt: 'A gym member scanning a QR poster at the entrance, the workout opening in the Live Elevated app on his phone.',
    title: 'Scan & go',
    body: "A QR poster at the door, a text link, or a SyncroFit push — however it arrives, it opens on their own phone.",
  },
  {
    n: '3',
    src: '/marketing/pro-train-remote.jpg',
    alt: 'A woman training alone in a home gym, her phone propped up showing a live rep-and-set counter in the Live Elevated app.',
    title: 'Train anywhere',
    body: "No app to install for them, no coach in the room — they follow the plan on their own time, wherever they train.",
  },
];

<section className="px-5 py-14">
  <Reveal className="mx-auto mb-8 max-w-2xl text-center">
    <p className="mb-2 text-label text-accent">THE HANDOFF</p>
    <h2 className="text-h2 font-bold text-text-primary">You build it. They train wherever they are.</h2>
  </Reveal>
  <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
    {HOW_IT_WORKS.map((step) => (
      <motion.div key={step.n} variants={fadeUp} className="flex flex-col gap-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border">
          <Image src={step.src} alt={step.alt} fill loading="lazy" sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
          <span aria-hidden className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-h3 font-extrabold text-on-accent shadow-lift ring-2 ring-background">
            {step.n}
          </span>
        </div>
        <h3 className="text-h3 font-semibold text-text-primary">{step.title}</h3>
        <p className="text-body text-text-muted">{step.body}</p>
      </motion.div>
    ))}
  </motion.div>
</section>
```

**Aspect ratio: keep 4:5, don't crop to 21:9.** Jeff generated all three at
4:5 already — that's not a compromise, it's the *better* fit: 4:5 is the
same slot `DESIGN.md` §6 already documents for the Consumer gallery-band
tile, so this reuses an existing aspect contract instead of adding a new
one, and a portrait crop reads naturally for a single-person, phone-in-hand
shot the way a 21:9 band was built for a two-person wide scene the old
coach-client photo needed.

**Step numbers: yes, reused from the documented pattern — no connector
arrows.** The `h-11 w-11 rounded-full bg-accent ... text-on-accent` badge is
already `DESIGN.md` §6's "Numbered step card" recipe (used inline, e.g.
`/pro`'s own "Four steps to your branded app" section further down this same
page) — here it's the same circle promoted to a small overlay chip in each
photo's top-left corner (`shadow-lift` + `ring-2 ring-background` so it pops
against any of the three varied backgrounds, not just darker ones), rather
than reinventing a new badge shape. No arrow/connector glyphs between the
three images: the numbered badges plus left-to-right (desktop) / top-to-
bottom (mobile, natural DOM stacking order) reading order already carry the
sequence, and the page's own existing 4-step section proves the
numbers-only pattern reads fine with zero connectors — adding arrows here
would be a second, redundant sequencing affordance for no legibility gain.

**No scrim on the photos themselves.** Title + caption sit in the text
column *below* each image, not overlaid on top of it — this is the
Gallery-band-tile case from `DESIGN.md` §6 ("Gallery-band tile: … carries
the grade only — no scrim"), not the full-bleed-band case. The small step
badge is a self-contained opaque chip, not text needing a gradient for
contrast, so it doesn't trigger the scrim rule either.

**Spacing:** `gap-6` between the three cards (slightly more generous than
the Gallery band's `gap-4` — these cards carry a title + one-line caption
below the image, not just a bare tile, so the extra breathing room keeps
stacked mobile cards from feeling cramped against each other).

### 6.3 Copy

| Step | Image | Title | Caption |
|---|---|---|---|
| 1 | `pro-build-send.jpg` | **Build & send** | "Assemble sets, reps, and exercises from your library — then send it as a link, a QR, or straight to SyncroFit." |
| 2 | `pro-qr-scan.jpg` | **Scan & go** | "A QR poster at the door, a text link, or a SyncroFit push — however it arrives, it opens on their own phone." |
| 3 | `pro-train-remote.jpg` | **Train anywhere** | "No app to install for them, no coach in the room — they follow the plan on their own time, wherever they train." |

**Section eyebrow:** `THE HANDOFF` — deliberately reuses the page's own
existing word for this exact idea ("send a workout, they run it. That's the
whole handoff," `app/pro/page.tsx:237`) instead of a generic "HOW IT WORKS,"
which would collide conceptually with the *other* numbered-step section
further down this same page (`LIVE IN MINUTES` / "Four steps to your
branded app" — a different flow, the gym owner's account setup, not the
member's workout delivery). Two "How it works"-flavored headings on one
page would blur which flow each one is about; distinct eyebrows keep them
legible as two different stories.

**Section heading:** "You build it. They train wherever they are." — states
the corrected value prop directly (remote, self-serve, no coach in the
room) rather than leaving it implicit in three photos alone.

**Data-honesty check (§4):** no name, gym, role, or quote attached to any of
the three images or captions; captions describe the *action in the photo*
(building, scanning, training), never a claimed outcome (no rep count, time,
or result implied as real); all three are labeled implicitly as illustrative
via the same treatment as #1–#5 (a photo, a short caption, never a
testimonial byline) — consistent with the rest of the set.

### 6.4 Alt text

Exactly the three strings in the `HOW_IT_WORKS` array's `alt` fields above —
action-based, each states the Live Elevated app is visible on screen (all
three show it), no names. Reproduced for a quick scan:

1. "A trainer at a laptop building a leg-day workout in the Live Elevated
   app, phone in hand sending it to a client."
2. "A gym member scanning a QR poster at the entrance, the workout opening
   in the Live Elevated app on his phone."
3. "A woman training alone in a home gym, her phone propped up showing a
   live rep-and-set counter in the Live Elevated app."

### 6.5 `next/image` specifics

- **All three lazy** (`loading="lazy"`) — this section sits after the
  hero and the `SEGMENTS` grid on both mobile and desktop, never
  above-the-fold. No `priority` on any of the three, consistent with §5's
  rule that `priority` is scoped to exactly the Consumer hero image
  elsewhere in this brief.
- **`sizes="(min-width: 640px) 33vw, 100vw"`** — identical to the Consumer
  gallery band (§2.B), because the container math is identical: `max-w-5xl`
  centered, `sm:grid-cols-3`.
- **CLS-safe:** `relative aspect-[4/5] overflow-hidden` container + `fill` +
  `object-cover`, same pattern as every other tile placement in this brief
  — the box exists at layout time regardless of image load order.
- **File location:** already correct — `public/marketing/pro-build-send.jpg`,
  `pro-qr-scan.jpg`, `pro-train-remote.jpg`.

### 6.6 QC note carried forward (not a blocker)

`pro-build-send.jpg`'s phone screen shows legible-ish text that reads close
to a name ("Sent to …") next to a send confirmation — an AI-generation
artifact, not a real name, and it's never referenced in the alt text or
caption above. At the card's actual rendered scale (~33vw inside a
max-w-5xl container, i.e. a few hundred px wide) it should be effectively
illegible, the same "garbled micro-text, fine at deployed scale" situation
`DESIGN_REVIEW.md`'s Could-Improve #2 flagged for `final-cta-bookend.jpg`.
Worth a glance at the shipped screenshot to confirm it doesn't read as a
name up close; not worth a re-generation on suspicion alone.

### 6.7 Does this change the Pro narrative elsewhere?

Checked hero copy, the `SEGMENTS` grid, and the later "Train clients
anywhere" text section against the corrected framing — verdict: **no other
copy changes required.**

- **Hero (`app/pro/page.tsx:112-133`):** already remote-safe as written —
  "share by QR, push to SyncroFit," "See a live demo" — nothing claims or
  implies in-person coaching. No edit needed.
- **`SEGMENTS` grid (`:64-69`, rendered `:141-154`):** all four cards
  already read as remote-compatible ("run anywhere," "Send workouts by link
  or QR — no in-person needed"). The single thing that *was* contradicting
  the remote framing was the deleted photo, not any of this copy. No edit
  needed.
- **"Train clients anywhere" / `NO GYM REQUIRED` section (`:229-254`):**
  this text section already tells the same three-beat story (text a link →
  QR code → they just train) in more operational detail than the new photo
  band does. That's **intentional layering, not redundancy** — the new F
  band shows the story early and visually right after `SEGMENTS`; this
  section elaborates it in writing much further down, after Features and
  the embed options. Considered a copy tweak here (to avoid feeling
  repetitive) and decided against forcing one: the two sections are far
  enough apart in the scroll, and different enough in register (photo story
  vs. an operational three-column breakdown), that they reinforce rather
  than duplicate. Flagging as considered, not a defect — revisit only if a
  future screenshot review shows them reading as repetitive back-to-back.
- **"Four steps to your branded app" (`:256-271`):** a different flow
  entirely (the *gym owner's* account setup: create → brand → build & share
  → embed & print), not the *member's* delivery flow this section covers.
  No overlap in content, and §6.3's eyebrow choice (`THE HANDOFF` over a
  generic "HOW IT WORKS") keeps the two from reading as duplicate headings.

---

## Non-negotiable constraints this brief respects

- **Data-honesty invariant:** §4 above — no fabricated testimonial framing,
  names, or outcome claims attached to any image; the Social-proof section
  stays photo-free by design. §6's three replacement images and captions
  were written against the same checklist.
- **App-isolation:** `/g/[slug]` tenant surfaces are explicitly out of scope
  (§2, "Scoped out") — Live-Elevated-branded marketing photography never
  appears on a gym's own white-labeled pages.
- **Legal gating:** none triggered — these are product-in-use images, not
  outcome/results claims (§4's last bullet). §6's images show building,
  scanning, and training in progress — never a before/after or a claimed
  result.
- **Technical limits:** `next/image` + explicit aspect-ratio containers avoid
  layout shift; `priority` scoped to exactly one image (the Consumer hero) so
  the marketing pages don't regress LCP by preloading images at once — now
  eight total across both pages, still exactly one `priority`.

---

## Handoff

Kevin builds against placements A–E, G, and **§6 in place of the original F**
once Jeff has generated and dropped the relevant files into
`public/marketing/` (already true for all eight as of 2026-07-23). When his
build is ready, Ivy runs `design-review` against real-data screenshots (both
pages, mobile + desktop) before this is considered done — never
self-certified by Kevin. Expect at minimum a check that: all eight images
cohere as one grade (§1), the Social-proof section is untouched, phone-screen
contents in #1/#5 and the three §6 images read as this app's UI (not a
generic phone mockup), and the §6 band reads as a clear 1→2→3 sequence on
both mobile (stacked) and desktop (3-up) without needing the retired
connector-arrow idea that was explicitly rejected in §6.2. D/E's scrim
fix from `DESIGN_REVIEW.md` ships in the same pass as this amendment, per
the owner's instruction — not re-decided here.
