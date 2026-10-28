"use client";

import { useMemo } from "react";
import { hourLabel, makeSlot, overlaps, relativeDay } from "@/lib/slots";
import type { AvailabilityWindow, Slot } from "@/lib/types";
import { motion } from "motion/react";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface SlotChoice {
  day: number; // days from today
  hour: number;
  hours: number;
}

export function windowFor(windows: AvailabilityWindow[], date: Date) {
  return windows.find((w) => w.weekday === date.getDay());
}

export function dayDate(today: Date, offset: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** First open, unbooked start hour from now on, for a sensible default. */
export function defaultChoice(today: Date, windows: AvailabilityWindow[], busy: Slot[], maxHours: number): SlotChoice | null {
  const hours = Math.min(2, maxHours);
  for (let day = 0; day < 7; day++) {
    const date = dayDate(today, day);
    const w = windowFor(windows, date);
    if (!w) continue;
    const [start, end] = [parseInt(w.start_time), parseInt(w.end_time)];
    for (let hour = start; hour + hours <= end; hour++) {
      const slot = makeSlot(date, hour, hours);
      if (new Date(slot.starts_at) > today && !busy.some((b) => overlaps(b, slot))) return { day, hour, hours };
    }
  }
  return null;
}

export function SlotPicker({
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
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => dayDate(today, i)), [today]);
  const date = days[value.day];
  const w = windowFor(windows, date);
  const hours = w ? Array.from({ length: parseInt(w.end_time) - parseInt(w.start_time) }, (_, i) => parseInt(w.start_time) + i) : [];

  return (
    <fieldset className="min-w-0 space-y-4">
      <legend className="sr-only">Pick a slot</legend>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground" id="day-label">Day</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-labelledby="day-label">
          {days.map((d, i) => {
            const open = !!windowFor(windows, d);
            const selected = value.day === i;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!open}
                onClick={() => onChange({ ...value, day: i })}
                className={cn(
                  "relative isolate flex min-w-12 flex-1 shrink-0 flex-col items-center rounded-xl border px-2 py-1.5 text-xs transition-colors active:scale-[0.97] disabled:opacity-40",
                  selected ? "border-indigo text-primary-foreground" : "bg-card hover:border-indigo/50",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="slot-day"
                    transition={transition.spring}
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-[11px] bg-indigo"
                  />
                )}
                <span className={cn(selected ? "opacity-85" : "text-muted-foreground")}>
                  {i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
                <span className="font-mono text-sm font-semibold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground" id="hour-label">
          <span>Start time · {relativeDay(date)}</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[repeating-linear-gradient(135deg,var(--warning)_0_2px,transparent_2px_4px)]" aria-hidden="true" />
            Booked
          </span>
        </p>
        {hours.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Closed on this day.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-labelledby="hour-label">
            {hours.map((h) => {
              const one = makeSlot(date, h, 1);
              const past = new Date(one.starts_at) <= today;
              const booked = busy.some((b) => overlaps(b, one));
              const selected = value.hour === h;
              const inRange = h > value.hour && h < value.hour + value.hours;
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${hourLabel(h)}${booked ? ", booked" : ""}`}
                  disabled={past}
                  onClick={() => onChange({ ...value, hour: h })}
                  className={cn(
                    "h-9 rounded-lg border font-mono text-xs transition-colors active:scale-[0.98] disabled:opacity-35",
                    booked && selected
                      ? "border-warning bg-warning text-ink dark:text-paper"
                      : booked
                      ? "border-warning/60 bg-[repeating-linear-gradient(135deg,var(--warning-soft)_0_4px,transparent_4px_8px)] text-warning-ink"
                      : "bg-card hover:border-indigo/50",
                    inRange && (booked ? "border-warning" : "border-indigo/60 bg-indigo-soft"),
                    selected && !booked && "border-indigo bg-indigo text-primary-foreground",
                  )}
                >
                  {hourLabel(h)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground" id="dur-label">Duration (max {maxHours} h)</p>
        <div className="flex gap-1.5" role="radiogroup" aria-labelledby="dur-label">
          {Array.from({ length: maxHours }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value.hours === n}
              onClick={() => onChange({ ...value, hours: n })}
              className={cn(
                "relative isolate h-9 flex-1 rounded-lg border font-mono text-xs transition-colors active:scale-[0.97]",
                value.hours === n ? "border-indigo text-primary-foreground" : "bg-card hover:border-indigo/50",
              )}
            >
              {value.hours === n && (
                <motion.span
                  layoutId="slot-duration"
                  transition={transition.spring}
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-[7px] bg-indigo"
                />
              )}
              {n} h
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
