"use client";

import { useRef, useState } from "react";
import { hourLabel, makeSlot, overlaps } from "@/lib/slots";
import type { AvailabilityWindow, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dayDate, windowFor, type SlotChoice } from "./slot-picker";

type CellState = "closed" | "past" | "booked" | "free";

/**
 * The week at a glance: one row per day, one cell per hour, coloured idle vs booked.
 * Click a free hour to start there; drag across a row to set the duration too.
 * Arrow keys move between cells, Enter/Space picks.
 */
export function WeekStrip({
  today,
  windows,
  busy,
  maxHours,
  value,
  onChange,
}: {
  today: Date;
  windows: AvailabilityWindow[];
  busy: Slot[];
  maxHours: number;
  value: SlotChoice;
  onChange: (c: SlotChoice) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => dayDate(today, i));
  const starts = windows.map((w) => parseInt(w.start_time));
  const ends = windows.map((w) => parseInt(w.end_time));
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  const hours = Array.from({ length: Math.max(0, last - first) }, (_, i) => first + i);

  const [drag, setDrag] = useState<{ day: number; from: number; to: number } | null>(null);
  const [focus, setFocus] = useState<{ day: number; hour: number }>({ day: value.day, hour: value.hour });
  const gridRef = useRef<HTMLDivElement>(null);

  function stateOf(day: number, hour: number): CellState {
    const date = days[day];
    const w = windowFor(windows, date);
    if (!w || hour < parseInt(w.start_time) || hour >= parseInt(w.end_time)) return "closed";
    const slot = makeSlot(date, hour, 1);
    if (new Date(slot.starts_at) <= today) return "past";
    return busy.some((b) => overlaps(b, slot)) ? "booked" : "free";
  }

  const selected = (day: number, hour: number) => {
    if (drag) return day === drag.day && hour >= Math.min(drag.from, drag.to) && hour <= Math.max(drag.from, drag.to);
    return day === value.day && hour >= value.hour && hour < value.hour + value.hours;
  };

  function commit(day: number, from: number, to: number) {
    const start = Math.min(from, to);
    const span = Math.min(Math.abs(to - from) + 1, maxHours);
    // A single click keeps the current duration; a drag sets it.
    const hoursSel = from === to ? Math.min(value.hours, maxHours) : span;
    onChange({ day, hour: start, hours: hoursSel });
  }

  function onKeyDown(e: React.KeyboardEvent, day: number, hour: number) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dd, dh] = moves[e.key];
      const nd = Math.min(6, Math.max(0, day + dd));
      const nh = Math.min(last - 1, Math.max(first, hour + dh));
      setFocus({ day: nd, hour: nh });
      (gridRef.current?.querySelector(`[data-cell="${nd}-${nh}"]`) as HTMLElement | null)?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const st = stateOf(day, hour);
      if (st !== "closed" && st !== "past") commit(day, hour, hour);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-6" aria-labelledby="week-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-title" className="text-lg">
          This week at a glance
        </h2>
        <p className="text-xs text-muted-foreground">Click an hour, or drag across a row to pick a slot.</p>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div
          ref={gridRef}
          role="grid"
          aria-label="Hourly availability for the next 7 days"
          className="grid min-w-[300px] gap-[3px] select-none"
          style={{ gridTemplateColumns: `2.75rem repeat(${hours.length}, minmax(14px, 1fr))` }}
          onPointerLeave={() => drag && setDrag(null)}
        >
          <div role="row" className="contents">
            <span role="columnheader" />
            {hours.map((h) => (
              <span key={h} role="columnheader" className="text-center font-mono text-[10px] text-muted-foreground">
                {h % 3 === 0 ? hourLabel(h).replace(" ", "").toLowerCase() : ""}
                <span className="sr-only">{hourLabel(h)}</span>
              </span>
            ))}
          </div>
          {days.map((d, day) => (
            <div role="row" key={day} className="contents">
              <span role="rowheader" className="flex items-center text-xs text-muted-foreground">
                {day === 0 ? "Today" : day === 1 ? "Tmrw" : d.toLocaleDateString("en-IN", { weekday: "short" })}
              </span>
              {hours.map((h) => {
                const st = stateOf(day, h);
                const sel = selected(day, h);
                const pickable = st === "free" || st === "booked";
                return (
                  <button
                    key={h}
                    type="button"
                    role="gridcell"
                    data-cell={`${day}-${h}`}
                    tabIndex={focus.day === day && focus.hour === h ? 0 : -1}
                    aria-selected={sel}
                    aria-disabled={!pickable}
                    aria-label={`${d.toLocaleDateString("en-IN", { weekday: "long" })} ${hourLabel(h)}, ${st === "free" ? "free" : st}`}
                    onKeyDown={(e) => onKeyDown(e, day, h)}
                    onFocus={() => setFocus({ day, hour: h })}
                    onPointerDown={(e) => {
                      if (!pickable) return;
                      e.currentTarget.releasePointerCapture?.(e.pointerId);
                      setDrag({ day, from: h, to: h });
                    }}
                    onPointerEnter={() => drag && drag.day === day && pickable && setDrag({ ...drag, to: h })}
                    onPointerUp={() => {
                      if (drag) commit(drag.day, drag.from, drag.to);
                      setDrag(null);
                    }}
                    className={cn(
                      "h-7 rounded-[5px] transition-[background-color,transform,box-shadow] duration-150 ease-(--ease-out)",
                      st === "closed" && "cursor-default bg-transparent [background-image:radial-gradient(var(--dot)_1px,transparent_1px)] [background-size:6px_6px]",
                      st === "past" && "cursor-default bg-muted/60",
                      st === "free" && "cursor-pointer bg-success/20 hover:bg-success/35 dark:bg-success/15 dark:hover:bg-success/30",
                      st === "booked" && "cursor-pointer bg-[repeating-linear-gradient(135deg,var(--warning)_0_2px,var(--warning-soft)_2px_5px)] opacity-80 hover:opacity-100",
                      sel && st === "free" && "bg-indigo hover:bg-indigo dark:bg-indigo dark:hover:bg-indigo",
                      sel && st === "booked" && "opacity-100 ring-2 ring-warning ring-offset-1 ring-offset-card",
                      sel && "scale-y-[1.08]",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-success/25" aria-hidden="true" /> Idle, free to request
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-[repeating-linear-gradient(135deg,var(--warning)_0_2px,var(--warning-soft)_2px_5px)]" aria-hidden="true" />
          Booked (waitlist)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-indigo" aria-hidden="true" /> Your pick
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-line [background-image:radial-gradient(var(--dot)_1px,transparent_1px)] [background-size:4px_4px]" aria-hidden="true" />
          Closed
        </li>
      </ul>
    </section>
  );
}
