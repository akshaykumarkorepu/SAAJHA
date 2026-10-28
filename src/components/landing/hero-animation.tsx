"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Activity, Camera, Cpu, DoorOpen, Presentation, Printer, Projector, Wrench } from "lucide-react";
import { EASE_OUT, transition } from "@/lib/motion";

// Idle equipment lights up and wires to the people using it. Pure SVG.
// The loop pauses while a tile is hovered so the label can be read.
const RESOURCES = [
  { Icon: Printer, name: "3D printer" },
  { Icon: Activity, name: "Oscilloscope" },
  { Icon: Camera, name: "DSLR kit" },
  { Icon: DoorOpen, name: "Project room" },
  { Icon: Cpu, name: "Raspberry Pi kit" },
  { Icon: Projector, name: "Projector" },
  { Icon: Presentation, name: "Seminar hall" },
  { Icon: Wrench, name: "Soldering station" },
];
const PEOPLE = ["an ECE student", "a club member", "a partner-college student"];
const TILE = 56;
const TILES = RESOURCES.map((r, i) => ({
  ...r,
  x: 22 + (i % 4) * 84,
  y: 18 + Math.floor(i / 4) * 78,
  person: [0, 1, 2, 1, 0, 2, 1, 0][i],
  tone: i % 3 === 1 ? ("marigold" as const) : ("indigo" as const),
}));
const AVATARS = [74, 180, 286].map((x) => ({ x, y: 244 }));
const ORDER = [2, 5, 0, 7, 3, 1, 6, 4];
const STEPS = ORDER.length + 3; // light all, hold, reset
const STEP_MS = 1400;

const pathFor = (i: number) => {
  const t = TILES[i];
  const a = AVATARS[t.person];
  const sx = t.x + TILE / 2;
  const sy = t.y + TILE;
  return `M ${sx} ${sy} C ${sx} ${sy + 50}, ${a.x} ${a.y - 70}, ${a.x} ${a.y - 20}`;
};
const toneVar = (tone: "indigo" | "marigold") => (tone === "marigold" ? "var(--marigold)" : "var(--indigo)");

const noop = () => () => {};

export function HeroAnimation() {
  // The OS motion preference is unknown on the server; read it only after hydration
  // so the first client render matches the server HTML.
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const prefersReduced = useReducedMotion();
  const reduce = hydrated && !!prefersReduced;
  const [step, setStep] = useState(4);
  const [hovered, setHovered] = useState<number | null>(null);
  const paused = useRef(false);
  const hover = (i: number | null) => {
    paused.current = i !== null;
    setHovered(i);
  };

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      if (!paused.current) setStep((s) => (s + 1) % STEPS);
    }, STEP_MS);
    return () => clearInterval(t);
  }, [reduce]);

  const litCount = reduce ? ORDER.length : Math.min(step, ORDER.length);
  const lit = new Set(ORDER.slice(0, litCount));
  if (hovered !== null) lit.add(hovered);
  const focus = hovered ?? (litCount > 0 ? ORDER[litCount - 1] : null);

  // Pointer-following light (fine pointers only; no React re-render per move).
  const px = useMotionValue(60);
  const py = useMotionValue(45);
  const sx = useSpring(px, { stiffness: 80, damping: 20 });
  const sy = useSpring(py, { stiffness: 80, damping: 20 });
  const light = useMotionTemplate`radial-gradient(260px circle at ${sx}% ${sy}%, var(--glow-indigo), transparent 70%)`;
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 100);
    py.set(((e.clientY - r.top) / r.height) * 100);
  }

  const caption =
    focus !== null ? `${TILES[focus].name}, shared with ${PEOPLE[TILES[focus].person]}` : "Waiting on the shelf";

  return (
    <div className="relative mx-auto w-full max-w-[460px]" onPointerMove={onPointerMove}>
      <motion.div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[40%]"
        style={{ background: light }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-8 -z-10 rounded-full bg-marigold/10 blur-3xl"
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 360 280"
        className="w-full overflow-visible"
        role="img"
        aria-label="Idle lab equipment lights up one by one and connects to the students who borrow it"
      >
        <defs>
          <radialGradient id="node-glow">
            <stop offset="0%" stopColor="var(--marigold)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--marigold)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* connections, packet and glow fade in just after the tiles land */}
        <g data-anim="" className="[animation:fade_600ms_var(--ease-out)_650ms_both]">
          {TILES.map((t, i) => (
            <motion.path
              key={`l${i}`}
              d={pathFor(i)}
              fill="none"
              stroke={toneVar(t.tone)}
              strokeWidth={i === focus ? 1.75 : 1.25}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: lit.has(i) ? 1 : 0, opacity: lit.has(i) ? (i === focus ? 0.9 : 0.4) : 0 }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
            />
          ))}

          {/* a small packet travelling along the newest connection */}
          {!reduce && focus !== null && (
            <circle key={`dot-${focus}`} r={2.6} fill={toneVar(TILES[focus].tone)}>
              <animateMotion
                dur="2.6s"
                begin="0s"
                repeatCount="indefinite"
                path={pathFor(focus)}
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="spline"
                keySplines="0.65 0 0.35 1"
              />
            </circle>
          )}

          {/* glow behind the focused node */}
          {focus !== null && (
            <motion.circle
              cx={TILES[focus].x + TILE / 2}
              cy={TILES[focus].y + TILE / 2}
              r={52}
              fill="url(#node-glow)"
              initial={false}
              animate={{ cx: TILES[focus].x + TILE / 2, cy: TILES[focus].y + TILE / 2, opacity: 1 }}
              transition={transition.spring}
            />
          )}
        </g>

        {/* equipment tiles: CSS entrance on the outer group, state on the inner */}
        {TILES.map(({ Icon, x, y, tone, name }, i) => {
          const on = lit.has(i);
          return (
            <g
              key={`t${i}`}
              data-anim=""
              className="[transform-box:fill-box] origin-center [animation:tile-in_520ms_var(--ease-out)_both]"
              style={{ animationDelay: `${300 + i * 55}ms` }}
            >
              <motion.g
                initial={false}
                animate={{ opacity: on ? 1 : 0.5, y: hovered === i ? -3 : 0 }}
                transition={transition.base}
                onPointerEnter={() => hover(i)}
                onPointerLeave={() => hover(null)}
                className="cursor-default"
              >
                <title>{name}</title>
                <rect
                  x={x}
                  y={y}
                  width={TILE}
                  height={TILE}
                  rx={14}
                  fill="var(--surface)"
                  stroke={i === focus ? toneVar(tone) : "var(--line-strong)"}
                  strokeOpacity={i === focus ? 0.7 : 1}
                />
                <motion.rect
                  x={x}
                  y={y}
                  width={TILE}
                  height={TILE}
                  rx={14}
                  fill={toneVar(tone)}
                  initial={false}
                  animate={{ opacity: on ? 0.14 : 0 }}
                  transition={transition.enter}
                />
                <Icon
                  x={x + 16}
                  y={y + 16}
                  width={24}
                  height={24}
                  strokeWidth={1.75}
                  color={on ? (tone === "marigold" ? "var(--warning-ink)" : "var(--indigo)") : "var(--faint-ink)"}
                  style={{ transition: "color 400ms var(--ease-out)" }}
                />
              </motion.g>
            </g>
          );
        })}

        {/* people */}
        {AVATARS.map((a, i) => {
          const active = TILES.some((t, ti) => t.person === i && lit.has(ti));
          const isFocus = focus !== null && TILES[focus].person === i;
          return (
            <g
              key={`a${i}`}
              data-anim=""
              className="[transform-box:fill-box] origin-center [animation:tile-in_520ms_var(--ease-out)_both]"
              style={{ animationDelay: `${760 + i * 70}ms` }}
            >
              <motion.circle
                cx={a.x}
                cy={a.y}
                r={19}
                fill="var(--surface)"
                stroke={active ? "var(--marigold)" : "var(--line-strong)"}
                strokeWidth={isFocus ? 2.25 : active ? 1.5 : 1}
                initial={false}
                animate={{ scale: isFocus ? 1.06 : active ? 1 : 0.94 }}
                transition={transition.spring}
                style={{ transformOrigin: `${a.x}px ${a.y}px` }}
              />
              <circle cx={a.x} cy={a.y - 5} r={5} fill={active ? "var(--indigo)" : "var(--faint-ink)"} />
              <path
                d={`M ${a.x - 9} ${a.y + 11} a 9 7 0 0 1 18 0`}
                fill={active ? "var(--indigo)" : "var(--faint-ink)"}
              />
            </g>
          );
        })}
      </svg>

      <p
        aria-hidden="true"
        className="enter-fade mt-3 flex h-6 items-center justify-center gap-2 text-center text-xs text-muted-foreground"
        style={{ "--i": 9 } as React.CSSProperties}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-marigold" />
        <motion.span
          key={caption}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition.base}
          className="truncate"
        >
          {caption}
        </motion.span>
      </p>
    </div>
  );
}
