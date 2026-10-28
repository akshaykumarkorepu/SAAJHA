"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarClock, Coins, Eye, MapPin, Wrench } from "lucide-react";
import { formatSlot } from "@/lib/slots";
import type { ResourceView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORY_META, CategoryIcon } from "@/components/saajha/category-icon";
import { Pill } from "@/components/saajha/status-chip";
import { fadeUp } from "@/lib/motion";

const TINT: Record<ResourceView["category"], string> = {
  fabrication: "bg-marigold-soft text-warning-ink",
  test_measurement: "bg-indigo-soft text-indigo",
  media: "bg-success-soft text-success-ink",
  space: "bg-muted text-ink",
};

export function ResourceCard({ resource: r, index }: { resource: ResourceView; index: number }) {
  const unavailable = r.status !== "active";
  return (
    <motion.li
      className="list-none"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
    >
      <Link
        href={`/resources/${r.id}`}
        className="card-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card"
      >
        <div className={cn("relative grid h-36 place-items-center overflow-hidden", TINT[r.category])}>
          <div className="dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
          <CategoryIcon category={r.category} className="relative size-12 transition-transform duration-500 ease-(--ease-out) group-hover:-translate-y-1 group-hover:scale-105 motion-reduce:transform-none" />
          <span className="absolute top-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-foreground">
            {CATEGORY_META[r.category].label}
          </span>
          <div className="absolute top-3 right-3 flex gap-1.5">
            {r.requires_supervision && (
              <Pill tone="marigold">
                <Eye className="size-3" strokeWidth={2} aria-hidden="true" /> Supervised
              </Pill>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="font-display text-lg leading-snug font-semibold transition-colors duration-200 group-hover:text-indigo">{r.name}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>
                {r.owner.department} · {r.location.split(",").slice(-1)[0].trim()}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {r.required_badges.length === 0 ? (
              <Pill>No badge needed</Pill>
            ) : (
              r.required_badges.map((b) => (
                <Pill key={b.id} tone="indigo">
                  {b.name}
                </Pill>
              ))
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-sm">
            {unavailable ? (
              <span className="flex items-center gap-1.5 font-medium text-warning-ink">
                <Wrench className="size-4" strokeWidth={1.75} aria-hidden="true" /> Under {r.status}
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">
                  <span className="sr-only">Next free: </span>
                  {r.next_free ? formatSlot(r.next_free) : "No free slot this fortnight"}
                </span>
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-medium">
              <Coins className="size-3.5 text-warning-ink" strokeWidth={1.75} aria-hidden="true" />
              {r.credit_cost} cr
            </span>
          </div>
        </div>
      </Link>
    </motion.li>
  );
}
