import type { AvailabilityWindow, Slot } from "./types";

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** True when the slot sits inside one availability window on its start day. */
export function fitsWindows(windows: AvailabilityWindow[], slot: Slot): boolean {
  const s = new Date(slot.starts_at);
  const e = new Date(slot.ends_at);
  if (s.toDateString() !== e.toDateString()) return false;
  return windows.some((w) => w.weekday === s.getDay() && w.start_time <= hhmm(s) && hhmm(e) <= w.end_time);
}

export const overlaps = (a: Slot, b: Slot) =>
  new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at);

export function makeSlot(day: Date, startHour: number, hours: number): Slot {
  const s = new Date(day);
  s.setHours(startHour, 0, 0, 0);
  const e = new Date(s);
  e.setHours(startHour + hours);
  return { starts_at: s.toISOString(), ends_at: e.toISOString() };
}

const IST = "en-IN";

export function formatSlot(slot: Slot): string {
  const s = new Date(slot.starts_at);
  const e = new Date(slot.ends_at);
  const day = relativeDay(s);
  const t = (d: Date) => d.toLocaleTimeString(IST, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day}, ${t(s)}–${t(e)}`;
}

export function relativeDay(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diff = Math.round((that.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(IST, { weekday: "short", day: "numeric", month: "short" });
}

export function hourLabel(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}
