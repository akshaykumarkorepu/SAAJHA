"use client";

import { motion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + 8px rise on page enter (DESIGN.md §5). */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
