"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, Info } from "lucide-react";
import type { ReadinessCheck, ReadinessResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EASE_OUT, shake, transition } from "@/lib/motion";

const STAGGER_MS = 120;

/**
 * The Access-Readiness Check (DESIGN.md §5.1). Rows resolve one by one: spinner →
 * drawn ✓ / ✗. Failures shake once and offer a fix. `onSettled` fires after the last row.
 */
export function ReadinessPanel({ result, onSettled }: { result: ReadinessResult | null; onSettled: (settled: boolean) => void }) {
  const [revealed, setRevealed] = useState(0);
  const total = result?.checks.length ?? 0;

  useEffect(() => {
    if (!result) return;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= result.checks.length) {
        clearInterval(t);
        onSettled(true);
      }
    }, STAGGER_MS);
    return () => {
      clearInterval(t);
      setRevealed(0);
      onSettled(false);
    };
  }, [result, onSettled]);

  const done = !!result && revealed >= total;
  const failing = result?.checks.filter((c) => !c.passed && !c.kind).length ?? 0;

  return (
    <div>
      <ul className="space-y-1" aria-label="Readiness checks">
        {result
          ? result.checks.map((c, i) => <CheckRow key={c.key} check={c} state={i < revealed ? "done" : "pending"} />)
          : Array.from({ length: 8 }, (_, i) => <PendingRow key={i} />)}
      </ul>

      <div aria-live="polite" className="min-h-0">
        <AnimatePresence mode="wait">
          {done && (
            <motion.div
              key={result.outcome}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className={cn(
                "mt-4 rounded-xl px-4 py-3 text-sm",
                result.outcome === "ready" && "bg-success-soft text-success-ink",
                result.outcome === "waitlist" && "bg-warning-soft text-warning-ink",
                result.outcome === "blocked" && "bg-danger-soft text-danger-ink",
              )}
            >
              {result.outcome === "ready" && <p className="font-medium">You&apos;re ready. Every check passed for this slot.</p>}
              {result.outcome === "blocked" && (
                <p className="font-medium">
                  {failing} {failing === 1 ? "check needs" : "checks need"} attention before you can request this. The fix is
                  listed on each one.
                </p>
              )}
              {result.outcome === "waitlist" && result.waitlist && (
                <div>
                  <p className="font-medium">
                    You meet every rule, but this slot is taken. Join the waitlist and you&apos;d be #{result.waitlist.position}.
                  </p>
                  <p className="mt-1 text-xs opacity-90">
                    If the slot frees up, the highest score is offered it first. Your priority score is{" "}
                    <span className="font-mono font-semibold">{result.waitlist.score}</span>:
                  </p>
                  <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 font-mono text-xs">
                    {result.waitlist.breakdown.map((b) => (
                      <div key={b.label} className="contents">
                        <dt className="font-sans">{b.label}</dt>
                        <dd className="text-right">{b.value > 0 && b.label !== "Base" ? `+${b.value}` : b.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PendingRow() {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2">
      <Spinner />
      <span className="h-3 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
    </li>
  );
}

function CheckRow({ check: c, state }: { check: ReadinessCheck; state: "pending" | "done" }) {
  const failed = state === "done" && !c.passed && !c.kind;
  return (
    <motion.li
      className={cn("rounded-lg px-2 py-2 transition-colors duration-300", failed && "bg-danger-soft/70")}
      animate={failed ? shake : { x: 0 }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
          {state === "pending" ? <Spinner /> : <ResultIcon check={c} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", state === "pending" && "text-muted-foreground")}>
            {c.label}
            {state === "done" && (
              <span className="sr-only">
                {c.kind === "info" ? ": note" : c.kind === "waitlist" ? ": taken, waitlist available" : c.passed ? ": passed" : ": failed"}
              </span>
            )}
          </p>
          <AnimatePresence initial={false}>
            {state === "done" && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={transition.base}
              >
                <p
                  className={cn(
                    "text-xs",
                    failed ? "text-danger-ink" : c.kind === "waitlist" ? "text-warning-ink" : "text-muted-foreground",
                  )}
                >
                  {c.message}
                </p>
                {c.fix && (
                  <Link
                    href={c.fix.href}
                    className="mt-1 inline-flex items-center gap-1 rounded text-xs font-semibold text-indigo underline-offset-4 hover:underline"
                  >
                    {c.fix.label} <ArrowRight className="size-3" strokeWidth={2} aria-hidden="true" />
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}

function Spinner() {
  return (
    <span
      className="block size-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-indigo motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

function ResultIcon({ check: c }: { check: ReadinessCheck }) {
  if (c.kind === "info") return <Info className="size-5 text-indigo" strokeWidth={1.75} aria-hidden="true" />;
  if (c.kind === "waitlist") return <Clock className="size-5 text-warning-ink" strokeWidth={1.75} aria-hidden="true" />;
  const pass = c.passed;
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill={pass ? "var(--success)" : "var(--danger)"}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        style={{ transformOrigin: "12px 12px" }}
      />
      {pass ? (
        <motion.path
          d="M7.5 12.5l3 3 6-6.5"
          fill="none"
          stroke="var(--surface)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.08 }}
        />
      ) : (
        <>
          {["M8.5 8.5l7 7", "M15.5 8.5l-7 7"].map((d, i) => (
            <motion.path
              key={d}
              d={d}
              fill="none"
              stroke="var(--surface)"
              strokeWidth="2.25"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.18, ease: EASE_OUT, delay: 0.08 + i * 0.12 }}
            />
          ))}
        </>
      )}
    </svg>
  );
}
