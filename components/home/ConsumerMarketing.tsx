'use client';

import Link from 'next/link';
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
    body: "Pick a focus, your equipment, and how long you've got. Vitality assembles the workout — you don't have to.",
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
    icon: '⏱️',
    title: 'Send to SyncroFit',
    body: "One tap hands your workout to SyncroFit's interval, AMRAP, or EMOM timer — cues and images ride along, no re-typing.",
  },
  {
    icon: '🔓',
    title: 'Free, no account',
    body: 'The whole app runs from your device. No login, no signup wall, to start training.',
  },
];

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
    body: 'Vitality assembles a workout from the library that matches your focus, equipment, and intensity.',
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
      <section className="px-5 pb-14 pt-6 text-center">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="mb-3 text-label text-accent">LIVE ELEVATED</motion.p>
          <motion.h1 variants={fadeUp} className="text-balance text-h1 font-extrabold leading-tight text-text-primary sm:text-[2.5rem]">
            A workout, built around you — in under a minute.
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-body text-text-muted">
            Tell Vitality your goal, your equipment, and how much time you&apos;ve got. It builds the workout from a{' '}
            {EXERCISES}-exercise illustrated library — log it here, or send it straight to SyncroFit&apos;s timer.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6">
            <Link
              href="/setup"
              className="mx-auto flex h-14 w-full max-w-sm items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
            >
              BUILD YOUR FIRST WORKOUT
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 text-caption text-text-faint">
            {EXERCISES} illustrated exercises · {EQUIP} equipment types · free, no account required
          </motion.p>
        </motion.div>
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
            Vitality doesn&apos;t have its own live workout timer — and it doesn&apos;t need one. Every workout you
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

      {/* Final CTA */}
      <section className="px-5 py-16">
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
