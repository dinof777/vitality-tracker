'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SAMPLE_EXERCISES, EQUIPMENT_ORDER } from '@/lib/exercises';
import { Reveal, fadeUp, stagger } from '@/components/marketing/Reveal';
import BuilderPreview from '@/components/home/BuilderPreview';

// Counts come from the library module itself — same source /llms.txt and
// /pro read — so this copy can never drift from what's actually shipped.
const EXERCISES = SAMPLE_EXERCISES.length;
const EQUIP = EQUIPMENT_ORDER.length;

const FEATURES = [
  {
    icon: '🎯',
    title: 'Goals-first setup',
    body: "Tell us your goal — build muscle, lose weight, general fitness, or recover an area — and every workout's shaped around it from your first session.",
  },
  {
    icon: '🏋️',
    title: `${EXERCISES} illustrated exercises`,
    body: `Every move shown, not just named. Filter to the ${EQUIP} equipment types you actually own — dumbbells, bands, bodyweight, or gym machines.`,
  },
  {
    icon: '⚡',
    title: 'Build in seconds',
    body: "Pick a focus, your equipment, and how long you've got. Live Elevated assembles the workout — you don't have to.",
  },
  {
    icon: '⏱️',
    title: 'Send to SyncroFit',
    body: "One tap hands your workout to SyncroFit's interval, AMRAP, or EMOM timer — cues and images ride along, no re-typing.",
  },
  {
    icon: '📈',
    title: 'Progressive overload, tracked',
    body: 'Log weight and reps per set. Every exercise remembers your last session and shows a sparkline, so you can see yourself getting stronger.',
  },
  {
    icon: '✅',
    title: 'Daily 5',
    body: "Five daily habits, one tap each, streak-tracked — the stuff that matters even on a day you don't lift.",
  },
  {
    icon: '📅',
    title: 'Save it, plan your week',
    body: 'Turn a workout into a routine, then schedule it across your week so "what do I do today" is already answered.',
  },
  {
    icon: '🔓',
    title: 'Free, no account',
    body: 'The whole app runs from your device. No login, no signup wall, to start training.',
  },
];

// Empty by design — see .design/marketing-home-refinements/DESIGN_BRIEF.md.
// Populate with real member quotes ({ quote, name, role }) once Dino
// supplies them; the section switches from the honest-empty statement to
// the 3-card quote grid automatically. Never fabricate an entry here.
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

const STEPS = [
  {
    n: '1',
    title: 'Pick your focus',
    body: 'Full Body, a pillar (Strength / Cardio / Balance / Flexibility), or drill into one muscle or joint.',
  },
  {
    n: '2',
    title: 'Set equipment & time',
    body: "Tell it what you've got and how many minutes you have; the length dial adjusts the exercise count on the fly.",
  },
  {
    n: '3',
    title: 'Tap Build',
    body: 'Live Elevated assembles a workout from the library that matches your focus, equipment, and intensity.',
  },
  {
    n: '4',
    title: 'Log it, or send it',
    body: "Log sets right here with progressive overload, or hand it to SyncroFit's timer in one tap.",
  },
];

// The consumer sales pitch — hero, feature grid, builder walkthrough, and
// SyncroFit callout, hosted at `/`'s !profile branch and standalone at
// /welcome. See .design/consumer-sales-home/DESIGN_BRIEF.md for the full
// spec this implements, and DESIGN.md §6/§7 for the shared recipes reused
// here (Reveal, feature-card, numbered-step, callout-box, micro-proof line).
export default function ConsumerMarketing() {
  return (
    <div>
      {/* Hero */}
      <section className="px-5 pb-14 pt-6 text-center lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-20 lg:text-left">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="mb-3 text-label text-accent">LIVE ELEVATED</motion.p>
          <motion.h1 variants={fadeUp} className="text-balance text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-text-primary sm:text-[3.5rem]">
            A workout, built around you — in under a minute.
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-body text-text-muted lg:mx-0">
            Tell Live Elevated your goal, your equipment, and how much time you&apos;ve got. It builds the workout from a{' '}
            {EXERCISES}-exercise illustrated library — log it here, or send it straight to SyncroFit&apos;s timer.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6">
            <Link
              href="/setup"
              className="mx-auto flex h-14 w-full max-w-sm items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press lg:mx-0"
            >
              BUILD YOUR FIRST WORKOUT
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 text-caption text-text-faint">
            {EXERCISES} illustrated exercises · {EQUIP} equipment types · free, no account required
          </motion.p>
        </motion.div>
        <Reveal className="mt-10 lg:mt-0">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-border lg:aspect-square lg:max-w-none">
            <Image
              src="/marketing/hero-consumer.jpg"
              alt="A person mid-set with a kettlebell in a dark gym, phone in hand showing the Live Elevated workout builder"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="px-5 py-12">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-h2 font-bold text-text-primary">Everything you need to actually train.</h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 text-h2">{f.icon}</div>
              <h3 className="mb-1 text-h3 font-semibold text-text-primary">{f.title}</h3>
              <p className="text-body text-text-muted">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Gallery band */}
      <section className="px-5 py-10">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-2 text-label text-accent">TRAIN YOUR WAY</p>
          <h2 className="text-h2 font-bold text-text-primary">Strength, cardio, mobility — one library.</h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3"
        >
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

      {/* How the exercise builder works */}
      <section className="px-5 py-12">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-2 text-label text-accent">THE BUILDER</p>
          <h2 className="text-h2 font-bold text-text-primary">From tap to trained, in four steps.</h2>
        </Reveal>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {STEPS.map((s) => (
              <motion.div key={s.n} variants={fadeUp} className="rounded-xl border border-border bg-surface p-6 text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-h3 font-extrabold text-on-accent">
                  {s.n}
                </span>
                <h3 className="mb-1 text-h3 font-semibold text-text-primary">{s.title}</h3>
                <p className="text-body text-text-muted">{s.body}</p>
              </motion.div>
            ))}
          </motion.div>
          <Reveal>
            <BuilderPreview />
          </Reveal>
        </div>
      </section>

      {/* SyncroFit callout */}
      <section className="px-5 py-10">
        <Reveal className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="mb-2 text-label text-accent">⏱️ SYNCROFIT, CONNECTED</p>
          <h2 className="mx-auto max-w-2xl text-h2 font-bold text-text-primary">
            We build the workout. SyncroFit runs the clock.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-text-muted">
            Live Elevated doesn&apos;t have its own live workout timer — and it doesn&apos;t need one. Every workout you
            build sends straight to SyncroFit&apos;s interval, AMRAP, or EMOM timer in one tap, with your cues and
            images along for the ride.
          </p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-body font-semibold text-text-primary">Every style</p>
              <p className="text-caption text-text-muted">Intervals, For Time, AMRAP, or EMOM — SyncroFit calls it out.</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-body font-semibold text-text-primary">Cues travel</p>
              <p className="text-caption text-text-muted">Your exercise images and coaching cues ride along into the timer.</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-body font-semibold text-text-primary">No re-typing</p>
              <p className="text-caption text-text-muted">One tap sends the whole workout.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Social proof — empty-safe; see .design/marketing-home-refinements/DESIGN_BRIEF.md §2 */}
      <section className="px-5 py-12">
        {TESTIMONIALS.length === 0 ? (
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-label text-accent">REAL PEOPLE, REAL WORKOUTS</p>
            <h2 className="text-h2 font-bold text-text-primary">Built by training, not by marketing.</h2>
            <p className="mx-auto mt-3 max-w-xl text-body text-text-muted">
              Live Elevated is brand new — the reviews are still being written. As real members log real
              workouts, their stories will show up right here.
            </p>
          </Reveal>
        ) : (
          <>
            <Reveal className="mx-auto mb-8 max-w-2xl text-center">
              <p className="mb-2 text-label text-accent">REAL PEOPLE, REAL WORKOUTS</p>
              <h2 className="text-h2 font-bold text-text-primary">What members are saying.</h2>
            </Reveal>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3"
            >
              {TESTIMONIALS.map((t) => (
                <motion.div key={t.name} variants={fadeUp} className="rounded-xl border border-border bg-surface p-5 text-left">
                  <p className="mb-3 text-h2 text-accent">&ldquo;</p>
                  <p className="text-body italic text-text-primary">{t.quote}</p>
                  <p className="mt-3 text-caption text-text-muted">{t.name} · {t.role}</p>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </section>

      {/* Pro exit-ramp — quiet, secondary CTA; never competes with the consumer CTA below */}
      <section className="px-5 py-8">
        <Reveal className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface/60 p-6 text-center">
          <h2 className="text-h3 font-semibold text-text-primary">Run a gym or train clients?</h2>
          <p className="mx-auto mt-2 max-w-md text-body text-text-muted">
            Give every member this exact workout experience — branded as yours.
          </p>
          <Link
            href="/pro"
            className="mx-auto mt-5 flex h-12 w-full max-w-xs items-center justify-center rounded-md border border-border bg-transparent text-label text-text-primary transition-all duration-150 active:scale-[0.97] active:bg-surface"
          >
            SEE LIVE ELEVATED PRO →
          </Link>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-5 py-20">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/marketing/final-cta-bookend.jpg"
            alt=""
            fill
            aria-hidden
            loading="lazy"
            sizes="100vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-background/40" />
        </div>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-h2 font-extrabold text-text-primary">
            Build your first workout — see for yourself.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body text-text-muted">
            No signup, no credit card. Answer a few quick questions and start today.
          </p>
          <Link
            href="/setup"
            className="mx-auto mt-7 flex h-14 w-full max-w-sm items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
          >
            BUILD YOUR FIRST WORKOUT
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
