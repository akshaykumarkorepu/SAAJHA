"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * A soft indigo/marigold light that trails the cursor across the hero.
 * Desktop mouse only; nothing moves under reduced motion. Writes motion values, never React state.
 */
export function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(70);
  const y = useMotionValue(35);
  const sx = useSpring(x, { stiffness: 40, damping: 18 });
  const sy = useSpring(y, { stiffness: 40, damping: 18 });
  const bg = useMotionTemplate`radial-gradient(520px circle at ${sx}% ${sy}%, var(--glow-indigo), transparent 65%), radial-gradient(360px circle at calc(${sx}% + 8%) calc(${sy}% + 10%), var(--glow-marigold), transparent 70%)`;

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host || reduce || !matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      x.set(((e.clientX - r.left) / r.width) * 100);
      y.set(((e.clientY - r.top) / r.height) * 100);
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    return () => host.removeEventListener("pointermove", onMove);
  }, [reduce, x, y]);

  return <motion.div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden md:block" style={{ background: bg }} />;
}
