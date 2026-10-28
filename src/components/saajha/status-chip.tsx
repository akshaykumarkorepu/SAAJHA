"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/types";

const STYLES: Record<BookingStatus, { label: string; className: string }> = {
  requested: { label: "Requested", className: "border-indigo text-indigo bg-transparent" },
  waitlisted: { label: "Waitlisted", className: "border-transparent bg-warning-soft text-warning-ink" },
  approved: { label: "Approved", className: "border-transparent bg-success-soft text-success-ink" },
  checked_out: { label: "Checked out", className: "border-transparent bg-indigo text-primary-foreground" },
  returned: { label: "Returned", className: "border-success-ink text-success-ink bg-transparent" },
  overdue: { label: "Overdue", className: "border-transparent bg-warning text-ink dark:text-paper" },
  rejected: { label: "Rejected", className: "border-transparent bg-danger-soft text-danger-ink" },
  cancelled: { label: "Cancelled", className: "border-transparent bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "border-transparent bg-success text-white dark:text-paper" },
};

/** One chip for every booking state (DESIGN.md §4). `layoutId` lets it morph on change. */
export function StatusChip({ status, layoutId, className }: { status: BookingStatus; layoutId?: string; className?: string }) {
  const s = STYLES[status];
  return (
    <motion.span
      layout
      layoutId={layoutId}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />
      {s.label}
    </motion.span>
  );
}

/** Small neutral pill used for tags like "Supervised" or badge names. */
export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "marigold" | "indigo" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    marigold: "bg-marigold-soft text-ink",
    indigo: "bg-indigo-soft text-indigo",
    danger: "bg-danger-soft text-danger-ink",
  };
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
