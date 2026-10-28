"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarClock, Coins, Eye, MapPin, Wrench } from "lucide-react";
import { nextFreeSlots } from "@/lib/availability";
import { getBusySlots } from "@/lib/data";
import { formatSlot } from "@/lib/slots";
import type { Slot } from "@/lib/types";
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
  const [preview, setPreview] = useState<Slot[] | null>(null);
  const loading = useRef(false);

  // Busy slots load on first hover/focus only, so the grid stays cheap.
  function loadPreview() {
    if (unavailable || loading.current) return;
    loading.current = true;
    getBusySlots(r.id).then(
      (busy) => setPreview(nextFreeSlots(r.availability, busy, 3)),
      () => (loading.current = false),
    );
  }

  const tiltRef = useRef<HTMLDivElement>(null);

  // Spotlight + ≤4° tilt follow the pointer via direct style writes (no re-render per move).
  // Tilt is mouse-only and off under reduced motion.
  function onPointerMove(e: React.PointerEvent<HTMLAnchorElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - b.left;
    const y = e.clientY - b.top;
    e.currentTarget.style.setProperty("--mx", `${x}px`);
    e.currentTarget.style.setProperty("--my", `${y}px`);
    if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches || !tiltRef.current) return;
    const rx = (0.5 - y / b.height) * 8; // ±4°
    const ry = (x / b.width - 0.5) * 8;
    tiltRef.current.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }
  function resetTilt() {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  }
  return (
    <motion.li className="list-none" variants={fadeUp} initial="hidden" animate="show" custom={index}>
      <div ref={tiltRef} className="h-full transition-transform duration-300 ease-(--ease-out) will-change-transform">
        <Link
          href={`/resources/${r.id}`}
          onPointerEnter={loadPreview}
          onFocus={loadPreview}
          onPointerMove={onPointerMove}
          onPointerLeave={resetTilt}
          className="card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card"
        >
          {/* spotlight: a soft glow plus a lit 1px border that track the cursor (pointer devices only) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(220px circle at var(--mx, 50%) var(--my, 0%), color-mix(in oklab, var(--indigo) 9%, transparent), transparent 70%)",
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(180px circle at var(--mx, 50%) var(--my, 0%), color-mix(in oklab, var(--marigold) 85%, transparent), transparent 75%)",
              mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
            }}
          />
          <div className={cn("relative grid h-36 place-items-center overflow-hidden", TINT[r.category])}>
            {!unavailable && (
              <div
                aria-hidden="true"
                className="absolute inset-x-2 bottom-2 z-[5] translate-y-3 rounded-xl border border-line bg-card/95 px-3 py-2 opacity-0 shadow-pop backdrop-blur transition-[opacity,transform] duration-300 ease-(--ease-out) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:translate-y-0"
              >
                <p className="text-[11px] font-medium text-muted-foreground">Next free</p>
                {preview ? (
                  preview.length ? (
                    <ul className="mt-0.5 space-y-0.5">
                      {preview.map((s) => (
                        <li
                          key={s.starts_at}
                          className="flex items-center gap-1.5 font-mono text-[11px] text-foreground"
                        >
                          <span className="size-1.5 rounded-full bg-success" />
                          {formatSlot(s)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-foreground">Fully booked this fortnight</p>
                  )
                ) : (
                  <div className="mt-1 space-y-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="block h-2.5 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
            <CategoryIcon
              category={r.category}
              className="relative size-12 transition-transform duration-500 ease-(--ease-out) group-hover:-translate-y-1 group-hover:scale-105 motion-reduce:transform-none"
            />
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
              <h3 className="font-display text-lg leading-snug font-semibold transition-colors duration-200 group-hover:text-indigo">
                <span className="bg-linear-to-r from-current to-current bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-px transition-[background-size] duration-400 ease-(--ease-out) group-hover:bg-[length:100%_1px] group-focus-visible:bg-[length:100%_1px]">
                  {r.name}
                </span>
              </h3>
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
              <span className="tabular flex shrink-0 items-center gap-1 font-mono text-xs font-medium">
                <Coins className="size-3.5 text-warning-ink" strokeWidth={1.75} aria-hidden="true" />
                {r.credit_cost} cr
              </span>
            </div>
          </div>
        </Link>
      </div>
    </motion.li>
  );
}
