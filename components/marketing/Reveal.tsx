'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';

// Shared scroll-reveal recipe for the app's long-scroll sales pages — /pro
// (trainers/gyms) and ConsumerMarketing (the consumer pitch, hosted at `/`'s
// !profile branch and standalone at /welcome). Extracted verbatim from
// /pro's original inline definition (app/pro/page.tsx) — see DESIGN.md §6
// "Marketing sections (long-scroll sales pages)".
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// The one real fix this extraction adds: app/globals.css's
// `prefers-reduced-motion` rule zeroes out CSS transition/animation duration,
// but never reaches Framer Motion's JS-driven transform interpolation — so a
// reduced-motion user still saw the 24px slide-up on every /pro section. Here
// it's fixed once, for both consumers of this file, instead of separately (or
// not at all) per-caller.
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={reduceMotion ? undefined : fadeUp}
      initial={reduceMotion ? undefined : 'hidden'}
      whileInView={reduceMotion ? undefined : 'show'}
      viewport={{ once: true, margin: '-80px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
