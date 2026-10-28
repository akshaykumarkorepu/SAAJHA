// The only data-access surface for UI code. Every function is async and shaped like
// the Supabase query / RPC that will replace it (see CLAUDE.md §6).

import * as mock from "./mock";
import { fitsWindows, overlaps } from "./slots";
import type {
  Badge,
  Booking,
  DemoAccount,
  DemoRole,
  Notification,
  Profile,
  ReadinessCheck,
  ReadinessResult,
  ResourceView,
  Slot,
} from "./types";

const LATENCY_MS = 350;
const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

let timed: mock.TimedRows | null = null;
const rows = () => (timed ??= mock.buildTimedRows(new Date()));

/** Statuses that hold a slot (the exclusion constraint's WHERE clause). */
const HOLDING: Booking["status"][] = ["approved", "checked_out", "overdue"];
const UPCOMING: Booking["status"][] = ["requested", "approved"];
const USED: Booking["status"][] = ["approved", "checked_out", "overdue", "returned", "completed"];


const HOUR = 3_600_000;
const windowsFor = (resourceId: string) => mock.availabilityWindows.filter((w) => w.resource_id === resourceId);

// ---------- Profiles & demo accounts ----------

export async function getDemoAccounts(): Promise<DemoAccount[]> {
  return mock.demoAccounts.map((a) => ({ ...a, profile: profileById(mock.demoProfileIds[a.key]) }));
}

/** Synchronous lookup for the demo session (stand-in for the auth user's profile). */
export function getDemoProfile(role: DemoRole): Profile {
  return profileById(mock.demoProfileIds[role]);
}

function profileById(id: string): Profile {
  const p = mock.profiles.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown profile ${id}`);
  return p;
}

export async function getInstitutionName(institutionId: string): Promise<string> {
  return mock.institutions.find((i) => i.id === institutionId)?.name ?? "Unknown institute";
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  await wait(150);
  return rows()
    .notifications.filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------- Resources ----------

function isVisibleTo(r: { visibility: string }, viewer: Profile) {
  if (viewer.institution_id !== mock.IDS.nitw) return r.visibility === "partner";
  return true;
}

function toView(r: (typeof mock.resources)[number]): ResourceView {
  const owner = profileById(r.owner_id);
  return {
    ...r,
    owner: { id: owner.id, full_name: owner.full_name, department: owner.department },
    required_badges: mock.resourceBadges
      .filter((rb) => rb.resource_id === r.id)
      .map((rb) => mock.badges.find((b) => b.id === rb.badge_id)!),
    availability: mock.availabilityWindows.filter((w) => w.resource_id === r.id),
    next_free: r.status === "active" ? findNextFree(r.id, 2) : null,
  };
}

export async function getResources(viewerId: string): Promise<ResourceView[]> {
  await wait();
  const viewer = profileById(viewerId);
  return mock.resources.filter((r) => isVisibleTo(r, viewer)).map(toView);
}

export async function getResource(id: string, viewerId: string): Promise<ResourceView | null> {
  await wait();
  const r = mock.resources.find((x) => x.id === id);
  if (!r || !isVisibleTo(r, profileById(viewerId))) return null;
  return toView(r);
}

/** Booked (slot-holding) intervals for a resource; borrower identity is not exposed. */
export async function getBusySlots(resourceId: string): Promise<Slot[]> {
  await wait(100);
  return rows()
    .bookings.filter((b) => b.resource_id === resourceId && HOLDING.includes(b.status))
    .map(({ starts_at, ends_at }) => ({ starts_at, ends_at }));
}

export async function getBadges(): Promise<Badge[]> {
  return mock.badges;
}

function findNextFree(resourceId: string, hours: number): Slot | null {
  const busy = rows().bookings.filter((b) => b.resource_id === resourceId && HOLDING.includes(b.status));
  const cursor = new Date();
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(cursor.getHours() + 1);
  for (let i = 0; i < 24 * 14; i++) {
    const slot = { starts_at: cursor.toISOString(), ends_at: new Date(cursor.getTime() + hours * HOUR).toISOString() };
    if (fitsWindows(windowsFor(resourceId), slot) && !busy.some((b) => overlaps(b, slot))) return slot;
    cursor.setHours(cursor.getHours() + 1);
  }
  return null;
}

// ---------- readiness_check() — mock of the security-definer RPC ----------

export async function runReadinessCheck(resourceId: string, userId: string, slot: Slot): Promise<ReadinessResult> {
  await wait(200);
  const user = profileById(userId);
  const r = mock.resources.find((x) => x.id === resourceId);
  if (!r) throw new Error("Resource not found");
  const { bookings, waitlist } = rows();
  const now = Date.now();
  const hours = (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / HOUR;
  const isPartner = user.institution_id !== mock.IDS.nitw;
  const checks: ReadinessCheck[] = [];

  // 1. Verified institute member
  checks.push({
    key: "verified",
    label: "Verified institute member",
    passed: user.verified,
    message: user.verified
      ? `${user.full_name} · ${user.roll_no ?? user.email} is verified.`
      : "Your account isn't verified yet. Ask your department office to verify your roll number.",
  });

  // 2. Required badges
  const required = mock.resourceBadges.filter((rb) => rb.resource_id === r.id);
  const missing = required
    .filter((rb) => !mock.userBadges.some((ub) => ub.user_id === userId && ub.badge_id === rb.badge_id && ub.status === "active"))
    .map((rb) => {
      const badge = mock.badges.find((b) => b.id === rb.badge_id)!;
      const pending = mock.userBadges.some((ub) => ub.user_id === userId && ub.badge_id === rb.badge_id && ub.status === "pending");
      return { badge, pending };
    });
  checks.push({
    key: "badges",
    label: "Required badges held",
    passed: missing.length === 0,
    message:
      required.length === 0
        ? "No training badge needed for this resource."
        : missing.length === 0
          ? "You hold every badge this resource needs."
          : `Missing: ${missing.map((m) => m.badge.name + (m.pending ? " (certificate under review)" : "")).join(", ")}.`,
    fix: missing.length ? { label: `Get the ${missing[0].badge.name} badge`, href: "/passport" } : undefined,
  });

  // 3. Weekly credits
  checks.push({
    key: "credits",
    label: "Within weekly credits",
    passed: user.weekly_credits >= r.credit_cost,
    message:
      user.weekly_credits >= r.credit_cost
        ? `Needs ${r.credit_cost} credits, you have ${user.weekly_credits} this week.`
        : `Needs ${r.credit_cost} credits but you have ${user.weekly_credits}. Credits reset every Monday.`,
  });

  // 4. Active booking cap
  const upcoming = bookings.filter(
    (b) => b.borrower_id === userId && UPCOMING.includes(b.status) && new Date(b.ends_at).getTime() > now,
  ).length;
  checks.push({
    key: "cap",
    label: "Active booking cap (max 2 upcoming)",
    passed: upcoming < 2,
    message:
      upcoming < 2
        ? `You have ${upcoming} upcoming booking${upcoming === 1 ? "" : "s"}, so there's room for this one.`
        : "You already have 2 upcoming bookings. Cancel or finish one first, so others get a turn.",
    fix: upcoming < 2 ? undefined : { label: "See my bookings", href: "/bookings" },
  });

  // 5. Cooldown
  const last = bookings
    .filter((b) => b.borrower_id === userId && b.resource_id === r.id && USED.includes(b.status))
    .map((b) => new Date(b.ends_at).getTime())
    .sort((a, b) => b - a)[0];
  const cooldownEnds = last ? last + r.cooldown_hours * HOUR : 0;
  const cooled = r.cooldown_hours === 0 || cooldownEnds <= new Date(slot.starts_at).getTime();
  checks.push({
    key: "cooldown",
    label: "Cooldown respected",
    passed: cooled,
    message:
      r.cooldown_hours === 0
        ? "No cooldown on this resource."
        : cooled
          ? `High-demand item: ${r.cooldown_hours} h gap between your bookings. You're clear.`
          : `You used this ${r.cooldown_hours} h ago or less. Next eligible from ${new Date(cooldownEnds).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
  });

  // 6. Duration + availability window (+ resource status)
  const inWindow = fitsWindows(windowsFor(r.id), slot);
  const durationOk = hours > 0 && hours <= r.max_hours;
  const activeOk = r.status === "active";
  checks.push({
    key: "window",
    label: "Within max duration and opening hours",
    passed: durationOk && inWindow && activeOk,
    message: !activeOk
      ? `This resource is under ${r.status}. The owner will reopen bookings soon.`
      : !durationOk
        ? `Max ${r.max_hours} h per booking; you picked ${hours} h.`
        : !inWindow
          ? "That time is outside the resource's opening hours. Check the Availability tab."
          : `${hours} h of ${r.max_hours} h max, inside opening hours.`,
  });

  // 7. Slot free
  const taken = bookings.some((b) => b.resource_id === r.id && HOLDING.includes(b.status) && overlaps(b, slot));
  let waitlistInfo: ReadinessResult["waitlist"];
  if (taken) {
    const ahead = waitlist.filter((w) => w.resource_id === r.id && w.status === "waiting" && overlaps(w, slot)).length;
    const recent = bookings.filter(
      (b) => b.borrower_id === userId && USED.includes(b.status) && now - new Date(b.starts_at).getTime() < 14 * 24 * HOUR,
    ).length;
    // score = 100 − 10×(bookings in last 14 days) + 0.2×reliability + minutes waiting/60
    const breakdown = [
      { label: "Base", value: 100 },
      { label: `${recent} booking${recent === 1 ? "" : "s"} in the last 14 days`, value: -10 * recent },
      { label: `Reliability ${user.reliability}`, value: +(0.2 * user.reliability).toFixed(1) },
      { label: "Time waiting", value: 0 },
    ];
    waitlistInfo = {
      position: ahead + 1,
      score: +breakdown.reduce((s, x) => s + x.value, 0).toFixed(1),
      breakdown,
    };
  }
  checks.push({
    key: "slot",
    label: "Slot free",
    passed: !taken,
    kind: taken ? "waitlist" : undefined,
    message: taken
      ? `Someone already holds this slot. Join the waitlist, you'd be #${waitlistInfo!.position}.`
      : "Nobody else holds this slot.",
  });

  // 8. Approval / supervision (info)
  const notes = [
    r.requires_approval ? "the lab in-charge approves each request" : "requests are auto-approved when every check passes",
    r.requires_supervision || isPartner ? "a supervisor must be present" : null,
  ].filter(Boolean);
  checks.push({
    key: "oversight",
    label: isPartner ? "Partner-college access" : "Approval and supervision",
    passed: true,
    kind: "info",
    message: isPartner
      ? "Partner-college access: needs owner approval + supervision."
      : `Heads-up: ${notes.join(", and ")}.`,
  });

  const blocking = checks.filter((c) => !c.passed && c.kind !== "waitlist");
  const outcome: ReadinessResult["outcome"] = blocking.length ? "blocked" : taken ? "waitlist" : "ready";
  return { checks, outcome, waitlist: outcome === "waitlist" ? waitlistInfo : undefined };
}

// ---------- Mutations (mocked; become request_booking / join waitlist RPCs) ----------

export async function requestBooking(resourceId: string, userId: string, slot: Slot, purpose: string) {
  await wait();
  const check = await runReadinessCheck(resourceId, userId, slot);
  if (check.outcome === "blocked") throw new Error("Readiness check failed on the server.");
  return { status: check.outcome === "waitlist" ? ("waitlisted" as const) : ("requested" as const), purpose, ...check.waitlist };
}

/** Keyword stand-in for AI need → resource matching (CLAUDE.md §9.1). */
export async function matchNeed(text: string, viewerId: string): Promise<{ resource: ResourceView; reason: string }[]> {
  const all = await getResources(viewerId);
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const synonyms: Record<string, string[]> = {
    media: ["photo", "video", "camera", "shoot", "film", "record", "event", "present"],
    space: ["room", "meet", "talk", "seminar", "team", "hall", "workshop", "demo"],
    fabrication: ["print", "prototype", "enclosure", "solder", "pcb", "make", "part"],
    test_measurement: ["signal", "measure", "circuit", "debug", "pwm", "embedded", "sensor", "iot"],
  };
  return all
    .map((r) => {
      const hay = `${r.name} ${r.description}`.toLowerCase();
      const direct = words.filter((w) => hay.includes(w));
      const cat = words.filter((w) => synonyms[r.category].some((s) => w.startsWith(s)));
      return { r, score: direct.length * 2 + cat.length, hit: direct[0] ?? cat[0] };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ r, hit }) => ({ resource: r, reason: `Matches "${hit}"; ${r.description.split(".")[0].toLowerCase()}.` }));
}
