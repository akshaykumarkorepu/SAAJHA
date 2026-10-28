"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}

/** Radio-group pill switcher; the active pill slides between options. Arrow keys move selection. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  function onKeyDown(e: React.KeyboardEvent) {
    const i = options.findIndex((o) => o.value === value);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length];
    onChange(next.value);
    (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
  }
  return (
    <div className={cn("min-w-0", className)}>
      <p id={`${id}-label`} className="mb-2 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        onKeyDown={onKeyDown}
        className="relative flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2/60 p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              data-value={o.value}
              title={o.hint}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`seg-${id}`}
                  transition={transition.spring}
                  className="absolute inset-0 rounded-lg border border-line bg-card shadow-card"
                  aria-hidden="true"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {o.icon}
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
