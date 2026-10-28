// UI-side availability maths over data that data.ts already returns
// (ResourceView.availability + getBusySlots). No new data contract.

import { fitsWindows, overlaps } from "./slots";
import type { AvailabilityWindow, Slot } from "./types";

const HOUR = 3_600_000;

/** The next `count` free whole-hour slots of `hours` length, at least 2 h apart, within 14 days. */
export function nextFreeSlots(windows: AvailabilityWindow[], busy: Slot[], count = 3, hours = 2, from = new Date()): Slot[] {
  const out: Slot[] = [];
  const cursor = new Date(from);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(cursor.getHours() + 1);
  for (let i = 0; i < 24 * 14 && out.length < count; i++) {
    const slot = { starts_at: cursor.toISOString(), ends_at: new Date(cursor.getTime() + hours * HOUR).toISOString() };
    const last = out[out.length - 1];
    const spaced = !last || new Date(slot.starts_at).getTime() >= new Date(last.ends_at).getTime();
    if (spaced && fitsWindows(windows, slot) && !busy.some((b) => overlaps(b, slot))) out.push(slot);
    cursor.setHours(cursor.getHours() + 1);
  }
  return out;
}
