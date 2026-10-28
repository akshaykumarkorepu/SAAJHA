"use client";

import { motion } from "motion/react";
import { transition } from "@/lib/motion";

/** Fade + 8px rise on page enter (DESIGN.md §5). */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition.enter}>
      {children}
    </motion.div>
  );
}
