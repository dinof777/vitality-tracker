'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { SAMPLE_EXERCISES, EQUIPMENT_ORDER } from '@/lib/exercises';

// Counts come from the library module itself — the same source /llms.txt reads,
// so marketing copy can never drift from what's actually shipped.
const MOVES = SAMPLE_EXERCISES.length;
const EQUIP = EQUIPMENT_ORDER.length;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// A branded phone mock — a gym's app in THEIR colors (orange here), to show the
// white-label visually. The screen uses its own accent via CSS vars.
function PhoneMock() {
  const brand = { '--accent': '#f97316', '--on-accent': '#0b0b0c' } as React.CSSProperties;
  const moves = ['Goblet Squat', 'Push-Up', 'KB Swing', 'Plank'];
  return (
    <div className="relative mx-auto w-[256px] shrink-0 rounded-[2.6rem] border-[11px] border-[#26272c] bg-[#0a0a0b] shadow-lift">
      <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#26272c]" />
      <div style={brand} className="overflow-hidden rounded-[1.9rem] bg-background px-5 pb-6 pt-9">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-body font-extrabold text-on-accent">IF</span>
          <span className="text-body font-bold text-text-primary">Iron Forge</span>
        </div>
        <p className="text-caption font-semibold tracking-wide text-accent">YOUR TRAINING APP</p>
        <h3 className="mb-4 text-h3 font-extrabold leading-tight text-text-primary">Train at Iron Forge.</h3>
        <div className="mb-4 flex h-10 w-full items-center justify-center rounded-md bg-accent text-caption font-semibold text-on-accent">
          START TODAY&apos;S WORKOUT
        </div>
        <p className="mb-2 text-[0.65rem] font-semibold tracking-wide text-text-muted">TODAY · FULL BODY</p>
        <div className="space-y-1.5">
          {moves.map((m, i) => (
            <div key={m} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-accent/40 text-[0.6rem] font-semibold text-accent">{i + 1}</span>
              <span className="text-caption text-text-primary">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: '🎨', title: 'Brand autopilot', body: 'Paste your website — we pull your logo, colors, and name automatically. Your app, looking like you, in seconds.' },
  { icon: '🏋️', title: 'Your own library', body: `${MOVES} illustrated movements, plus your own custom moves and the names your gym actually uses.` },
  { icon: '📲', title: 'Build & share', body: 'Generate a workout, print it with a QR code, and your client scans to load and run it.' },
  { icon: '⏱️', title: 'SyncroFit built in', body: 'Push workouts straight to the SyncroFit interval timer — no copying, no fuss.' },
  { icon: '📊', title: 'Real engagement', body: 'See which routines your clients import and finish — with durations — not just guesses.' },
  { icon: '🌐', title: 'Your own address', body: 'vitalitypro.app/g/yourgym — or bring your own custom domain.' },
];

const STEPS = [
  { n: '1', title: 'Create your gym', body: 'Sign up and claim your URL. Free to start.' },
  { n: '2', title: 'Brand it', body: 'Paste your site — logo, colors, and name applied instantly. Tweak anything.' },
  { n: '3', title: 'Share workouts', body: 'Build from your library, send to clients by link or QR, push to SyncroFit.' },
];

const SEGMENTS = [
  { icon: '🧑‍🏫', title: 'Personal trainers', body: 'Give every client a branded plan they can run anywhere.' },
  { icon: '🏢', title: 'Boutique gyms', body: 'Your members train your way, on your brand.' },
  { icon: '💻', title: 'Online coaches', body: 'Send workouts by link or QR — no in-person needed.' },
  { icon: '🤸', title: 'Studios', body: 'One library, your names, your look.' },
];

const FAQ = [
  { q: 'Do my clients need to download anything or sign up?', a: 'No. Clients open a workout from a link or QR code — no account, no login. To run the timer, they use the free SyncroFit app.' },
  { q: 'Do I need to be technical?', a: "Not at all. Paste your website, we grab your branding, and you're sharing workouts within minutes." },
  { q: 'Can I add my own moves and equipment?', a: "Yes — add custom moves, rename library moves to your gym's language, and register your own equipment (we dedupe so the list stays clean)." },
  { q: 'What is the SyncroFit part?', a: 'SyncroFit is the interval timer your workouts run on. Send a workout in one tap; it reports back when a client imports or finishes it, so you see real engagement.' },
  { q: 'Can I use my own domain?', a: 'You start at vitalitypro.app/g/yourgym for free. Custom domains come with Pro.' },
  { q: 'Is it really free?', a: 'Yes — the core platform is free to start. Pro adds custom domains, client analytics, and more coaches.' },
];

export default function ProLanding() {
  return (
    <div className="min-h-dvh bg-background text-text-primary">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2 text-h3 font-extrabold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-on-accent">V</span>
            Vitality<span className="text-accent">Pro</span>
          </span>
          <nav className="flex items-center gap-4 text-caption">
            <Link href="/sign-in" className="text-text-muted hover:text-text-primary">Sign in</Link>
            <Link href="/sign-up" className="rounded-md bg-accent px-4 py-2 font-semibold text-on-accent">Start free</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-20 pt-12 sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <motion.div variants={stagger} initial="hidden" animate="show" className="text-center lg:text-left">
            <motion.p variants={fadeUp} className="mb-4 text-label text-accent">WHITE-LABEL TRAINING PLATFORM</motion.p>
            <motion.h1 variants={fadeUp} className="text-balance text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.5rem]">
              Your gym&rsquo;s training app. <span className="text-accent">Branded as yours.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-xl text-body text-text-muted sm:text-lg lg:mx-0">
              Give your members a fully-branded workout app — your logo, your colors, your URL. Build from a{' '}
              {MOVES}-move illustrated library, share by QR, push to SyncroFit, and see who actually trained.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/sign-up" className="flex h-13 w-full items-center justify-center rounded-md bg-accent px-7 py-3 text-label text-on-accent transition active:scale-[0.98] sm:w-auto">
                Create your gym — free
              </Link>
              <Link href="/g/vitality" className="flex h-13 w-full items-center justify-center rounded-md border border-border px-7 py-3 text-label text-text-primary transition hover:bg-surface sm:w-auto">
                See a live demo →
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-6 text-caption text-text-faint">
              {MOVES} illustrated moves · {EQUIP} equipment types · SyncroFit-connected
            </motion.p>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex justify-center">
            <PhoneMock />
          </motion.div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-5 py-14">
        <Reveal className="mx-auto mb-3 max-w-2xl text-center">
          <p className="text-label text-accent">BUILT FOR</p>
        </Reveal>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s) => (
            <motion.div key={s.title} variants={fadeUp} className="rounded-xl border border-border bg-surface p-5 text-center">
              <div className="mb-2 text-h2">{s.icon}</div>
              <h3 className="mb-1 text-h3 font-semibold">{s.title}</h3>
              <p className="text-caption text-text-muted">{s.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-5 py-16">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-h1 font-bold">Everything a trainer needs — none of the build.</h2>
        </Reveal>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 text-h2">{f.icon}</div>
              <h3 className="mb-1 text-h3 font-semibold text-text-primary">{f.title}</h3>
              <p className="text-body text-text-muted">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-2 text-label text-accent">LIVE IN MINUTES</p>
          <h2 className="text-h1 font-bold">Three steps to your branded app.</h2>
        </Reveal>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <Reveal key={s.n} className="rounded-xl border border-border bg-surface p-6 text-center">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-h3 font-extrabold text-on-accent">{s.n}</span>
              <h3 className="mb-1 text-h3 font-semibold">{s.title}</h3>
              <p className="text-body text-text-muted">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SyncroFit callout */}
      <section className="px-5 py-12">
        <Reveal className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="mb-2 text-label text-accent">⏱️ SYNCROFIT, CONNECTED</p>
          <h2 className="mx-auto max-w-2xl text-h2 font-bold">Hand a workout to the timer in one tap — and get told when your client finished it.</h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-text-muted">
            Every workout you share carries your gym’s ID, so imports and completions flow back into your dashboard as real engagement — durations included.
          </p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-body font-semibold text-text-primary">Equipment-aware</p>
              <p className="text-caption text-text-muted">Each move’s equipment tags through, so your workouts filter correctly in SyncroFit’s browser.</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-body font-semibold text-text-primary">Your cues travel</p>
              <p className="text-caption text-text-muted">Per-move images &amp; coaching notes ride along into the timer.</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-body font-semibold text-text-primary">Real results back</p>
              <p className="text-caption text-text-muted">Imports &amp; completions — with time &amp; rounds — land on the client.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-h1 font-bold">Questions, answered.</h2>
        </Reveal>
        <div className="mx-auto max-w-2xl space-y-3">
          {FAQ.map((item) => (
            <Reveal key={item.q}>
              <details className="group rounded-xl border border-border bg-surface p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-semibold text-text-primary">
                  {item.q}
                  <span className="shrink-0 text-h3 text-accent transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-body text-text-muted">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-5 py-16">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-h1 font-bold">Start free. Upgrade when you grow.</h2>
        </Reveal>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          <Reveal className="rounded-xl border border-border bg-surface p-6">
            <p className="text-label text-text-muted">FREE</p>
            <p className="my-2 text-display text-text-primary">$0</p>
            <ul className="space-y-1.5 text-body text-text-muted">
              <li>✓ Your branded /g/ space</li>
              <li>✓ Full {MOVES}-move library</li>
              <li>✓ Custom moves &amp; equipment</li>
              <li>✓ QR + SyncroFit sharing</li>
            </ul>
          </Reveal>
          <Reveal className="rounded-xl border border-accent/40 bg-surface p-6">
            <p className="text-label text-accent">PRO</p>
            <p className="my-2 text-display text-text-primary">Soon</p>
            <ul className="space-y-1.5 text-body text-text-muted">
              <li>✓ Everything in Free</li>
              <li>✓ Your own custom domain</li>
              <li>✓ Client engagement analytics</li>
              <li>✓ Multiple coaches</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-h1 font-extrabold sm:text-[2.75rem]">Make it yours.</h2>
          <p className="mx-auto mt-3 max-w-md text-body text-text-muted">
            Spin up your gym&rsquo;s branded training app in a couple of minutes — free.
          </p>
          <Link href="/sign-up" className="mt-7 inline-flex h-14 items-center justify-center rounded-md bg-accent px-8 text-label text-on-accent transition active:scale-[0.98]">
            Create your gym — free
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-caption text-text-faint sm:flex-row">
          <span>Vitality Pro</span>
          <nav className="flex gap-4">
            <Link href="/g/vitality" className="hover:text-text-muted">Demo</Link>
            <Link href="/sign-in" className="hover:text-text-muted">Sign in</Link>
            <Link href="/sign-up" className="hover:text-text-muted">Start free</Link>
          </nav>
          <span>Powered by Vitality</span>
        </div>
      </footer>
    </div>
  );
}
