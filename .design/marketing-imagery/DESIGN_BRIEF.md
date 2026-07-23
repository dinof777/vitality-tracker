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

**F. "Who it's for" → photo band — new section**
Insert directly after the `SEGMENTS` grid (`:128-141`), before Features
(`:144`). One dedicated new asset — a coach coaching a client, phone in the
trainer's hand — makes the visual case for "give every member this exact
workout experience," the human/service angle that's distinctly a Pro-page
job (Consumer's gallery band is solo-training; Pro's is coach + client).

```tsx
<section className="px-5 py-4">
  <div className="relative mx-auto aspect-[21/9] max-w-5xl overflow-hidden rounded-2xl border border-border">
    <Image src="/marketing/pro-coach-client.jpg" alt="A trainer coaching a client through a set, phone in hand showing the Live Elevated app" fill loading="lazy" sizes="(min-width: 1024px) 80vw, 100vw" className="object-cover object-top" />
  </div>
</section>
```

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
| 6 | `pro-coach-client.jpg` | Pro "who it's for" band (F) | A trainer coaching a client mid-movement in a boutique-gym-like space, phone in the trainer's hand showing the Live Elevated app | 21:9 | **Yes** |

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
  gallery band and both full-bleed bookend/backdrop images.
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

## Non-negotiable constraints this brief respects

- **Data-honesty invariant:** §4 above — no fabricated testimonial framing,
  names, or outcome claims attached to any image; the Social-proof section
  stays photo-free by design.
- **App-isolation:** `/g/[slug]` tenant surfaces are explicitly out of scope
  (§2, "Scoped out") — Live-Elevated-branded marketing photography never
  appears on a gym's own white-labeled pages.
- **Legal gating:** none triggered — these are product-in-use images, not
  outcome/results claims (§4's last bullet).
- **Technical limits:** `next/image` + explicit aspect-ratio containers avoid
  layout shift; `priority` scoped to exactly one image (the Consumer hero) so
  the marketing pages don't regress LCP by preloading six photos at once.

---

## Handoff

Kevin builds against placements A–F once Jeff has generated and dropped the
six files into `public/marketing/`. When his build is ready, Ivy runs
`design-review` against real-data screenshots (both pages, mobile + desktop)
before this is considered done — never self-certified by Kevin. Expect at
minimum a check that: the six images actually cohere as one grade (§1), the
Social-proof section is untouched, and phone-screen contents in #1/#5/#6
read as this app's UI, not a generic phone mockup.
