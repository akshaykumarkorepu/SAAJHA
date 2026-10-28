"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

const FACTS = [
  "Double booking is blocked by the database itself, not just by the screen.",
  "Before you request anything, you see exactly which checks you pass, and how to fix the ones you don't.",
  "Every approval, return and penalty is hash-chained. Rewriting history breaks the chain.",
  "Condition reports are insert-only. Nobody can quietly edit what was recorded at handover.",
  "Waitlist order comes from a score you can read: recent bookings, reliability and time waiting.",
  "AI only suggests. A named person makes every final call.",
];

export function TrustFacts() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FACTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <figure className="relative rounded-2xl border border-white/15 bg-white/[0.06] p-5 dark:border-ink/15 dark:bg-ink/[0.06]">
      <figcaption className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase opacity-80">
        <ShieldCheck className="size-4 text-marigold" strokeWidth={1.75} aria-hidden="true" />
        Why you can trust it
      </figcaption>
      <div className="relative min-h-[3.25rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="text-[15px] leading-snug"
          >
            {FACTS[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {FACTS.map((_, n) => (
          <span key={n} className={`h-1 rounded-full transition-all ${n === i ? "w-5 bg-marigold" : "w-1.5 bg-current opacity-30"}`} />
        ))}
      </div>
    </figure>
  );
}
