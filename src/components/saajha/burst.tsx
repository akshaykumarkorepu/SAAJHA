"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";

const N = 12;

/** One short marigold particle burst (transform + opacity only). Renders nothing under reduced motion. */
export function Burst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
        const dist = 46 + (i % 3) * 14;
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: i % 4 === 0 ? "var(--indigo)" : "var(--marigold)" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.6, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          />
        );
      })}
    </span>
  );
}
