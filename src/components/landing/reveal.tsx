"use client";

import { motion } from "motion/react";
import { EASE } from "@/components/saajha/page-transition";

/** Fade-up once when scrolled into view; `index` staggers siblings by 40ms·n (max 8). */
export function Reveal({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: EASE, delay: Math.min(index, 8) * 0.08 }}
    >
      {children}
    </motion.div>
  );
}
