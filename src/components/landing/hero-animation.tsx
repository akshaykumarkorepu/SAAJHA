"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Activity, Camera, Cpu, DoorOpen, Microscope, Printer, Projector, Wrench } from "lucide-react";
import { EASE } from "@/components/saajha/page-transition";

// Equipment tiles (idle → shared) wired to student avatars. Pure SVG, ~8 s loop.
const TILES = [Printer, Activity, Camera, DoorOpen, Cpu, Projector, Microscope, Wrench].map((Icon, i) => ({
  Icon,
  x: 22 + (i % 4) * 84,
  y: 18 + Math.floor(i / 4) * 78,
  avatar: [0, 1, 2, 1, 0, 2, 1, 0][i],
  tone: i % 3 === 1 ? "marigold" : "indigo",
}));
const AVATARS = [{ x: 74 }, { x: 180 }, { x: 286 }].map((a) => ({ ...a, y: 244 }));
const ORDER = [2, 5, 0, 7, 3, 1, 6, 4];
const TILE = 56;
const STEPS = ORDER.length + 3; // light all, hold, then reset

export function HeroAnimation() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS), 850);
    return () => clearInterval(t);
  }, [reduce]);

  const litCount = reduce ? ORDER.length : Math.min(step, ORDER.length);
  const lit = new Set(ORDER.slice(0, litCount));

  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      <div className="absolute inset-6 -z-10 rounded-full bg-marigold/15 blur-3xl" aria-hidden="true" />
      <svg
        viewBox="0 0 360 280"
        className="w-full"
        role="img"
        aria-label="Idle lab equipment lighting up one by one as it gets shared with students"
      >
        {/* connection lines */}
        {TILES.map((t, i) => {
          const a = AVATARS[t.avatar];
          const sx = t.x + TILE / 2;
          const sy = t.y + TILE;
          const d = `M ${sx} ${sy} C ${sx} ${sy + 50}, ${a.x} ${a.y - 70}, ${a.x} ${a.y - 20}`;
          return (
            <motion.path
              key={`l${i}`}
              d={d}
              fill="none"
              stroke={t.tone === "marigold" ? "var(--marigold)" : "var(--indigo)"}
              strokeWidth={1.25}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: lit.has(i) ? 1 : 0, opacity: lit.has(i) ? 0.55 : 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          );
        })}

        {/* equipment tiles */}
        {TILES.map(({ Icon, x, y, tone }, i) => {
          const on = lit.has(i);
          const color = tone === "marigold" ? "var(--marigold)" : "var(--indigo)";
          return (
            <motion.g key={`t${i}`} initial={false} animate={{ opacity: on ? 1 : 0.45 }} transition={{ duration: 0.4, ease: EASE }}>
              <rect x={x} y={y} width={TILE} height={TILE} rx={14} fill="var(--surface)" stroke="var(--line)" />
              <motion.rect
                x={x}
                y={y}
                width={TILE}
                height={TILE}
                rx={14}
                fill={color}
                initial={false}
                animate={{ opacity: on ? 0.14 : 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
              <Icon
                x={x + 16}
                y={y + 16}
                width={24}
                height={24}
                strokeWidth={1.75}
                color={on ? (tone === "marigold" ? "var(--warning-ink)" : "var(--indigo)") : "var(--muted-ink)"}
                style={{ transition: "color 400ms cubic-bezier(0.22,1,0.36,1)" }}
              />
            </motion.g>
          );
        })}

        {/* student avatars */}
        {AVATARS.map((a, i) => {
          const active = TILES.some((t, ti) => t.avatar === i && lit.has(ti));
          return (
            <g key={`a${i}`}>
              <motion.circle
                cx={a.x}
                cy={a.y}
                r={19}
                fill="var(--surface)"
                stroke={active ? "var(--marigold)" : "var(--line)"}
                strokeWidth={active ? 2 : 1}
                initial={false}
                animate={{ scale: active ? 1 : 0.94 }}
                style={{ transformOrigin: `${a.x}px ${a.y}px` }}
              />
              <circle cx={a.x} cy={a.y - 5} r={5} fill={active ? "var(--indigo)" : "var(--muted-ink)"} opacity={0.85} />
              <path
                d={`M ${a.x - 9} ${a.y + 11} a 9 7 0 0 1 18 0`}
                fill={active ? "var(--indigo)" : "var(--muted-ink)"}
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
