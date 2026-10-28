// One motion language for the whole app (DESIGN.md §5). CSS mirrors these as
// --ease-out / --dur-* in globals.css. MotionConfig reducedMotion="user" applies
// app-wide; looping or decorative motion also checks useReducedMotion().

import type { Transition, Variants } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  micro: 0.16,
  base: 0.24,
  enter: 0.42,
  hero: 0.7,
} as const;

export const STAGGER = {
  tight: 0.04, // lists and cards
  calm: 0.08, // sections, readiness rows
} as const;

/** Max items that get a staggered entrance; the rest appear with the last one. */
export const MAX_STAGGERED = 8;

export const transition = {
  micro: { duration: DURATION.micro, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  enter: { duration: DURATION.enter, ease: EASE_OUT },
  /** Restrained spring for things that physically move (chips, indicators). */
  spring: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 },
} satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...transition.enter, delay: Math.min(i, MAX_STAGGERED) * STAGGER.tight },
  }),
};

export const shake = { x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.4, ease: EASE_IN_OUT } };
