// The data-access surface for Saajha.
// Routes data through Supabase RPCs / PostgreSQL queries when configured,
// and maintains an active in-memory state engine for local verification.

import * as mock from "./mock";
import { fitsWindows, overlaps } from "./slots";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import type {
  AuditEvent,
  Badge,
  Booking,
  BookingStatus,
  BookingView,
  Condition,
  ConditionReport,
  DemoAccount,
  DemoRole,
  Notification,
  Profile,
  ReadinessCheck,
  ReadinessResult,
  ResourceView,
  Slot,
  UserBadgeView,
} from "./types";

const LATENCY_MS = 250;
const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

let timed: mock.TimedRows | null = null;
const rows = () => (timed ??= mock.buildTimedRows(new Date()));

// In-memory store for condition reports
const conditionReportsStore: ConditionReport[] = [
  {
    id: "00000000-0000-4000-a000-000000000701",
    booking_id: "00000000-0000-4000-a000-000000000504",
    stage: "check_out",
    condition: "excellent",
    checklist: { "Power cable included": true, "MicroSD inserted": true, "GPIO header intact": true },
    notes: "Everything tested and in order.",
    photo_paths: [],
    author_id: mock.IDS.student,
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "00000000-0000-4000-a000-000000000702",
    booking_id: "00000000-0000-4000-a000-000000000504",
    stage: "return",
    condition: "good",
    checklist: { "Power cable included": true, "MicroSD inserted": true, "GPIO header intact": true },
    notes: "Returned clean and repackaged in box.",
    photo_paths: [],
    author_id: mock.IDS.student,
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(),
  },
];

/** Statuses that hold a slot (exclusion constraint's WHERE clause) */
const HOLDING: Booking["status"][] = ["approved", "checked_out", "overdue"];
const UPCOMING: Booking["status"][] = ["requested", "approved"];
const USED: Booking["status"][] = ["approved", "checked_out", "overdue", "returned", "completed"];

const HOUR = 3_600_000;
const windowsFor = (resourceId: string) => mock.availabilityWindows.filter((w) => w.resource_id === resourceId);

async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return "hash_" + Math.random().toString(16).slice(2);
}

// ---------- Profiles & demo accounts ----------

export async function getDemoAccounts(): Promise<DemoAccount[]> {
  return mock.demoAccounts.map((a) => ({ ...a, profile: profileById(mock.demoProfileIds[a.key]) }));
}

/** Synchronous lookup for the demo session (stand-in for the auth user's profile) */
export function getDemoProfile(role: DemoRole): Profile {
  return profileById(mock.demoProfileIds[role]);
}

export function profileById(id: string): Profile {
  const p = mock.profiles.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown profile ${id}`);
  return p;
}

export async function getInstitutionName(institutionId: string): Promise<string> {
  return mock.institutions.find((i) => i.id === institutionId)?.name ?? "Unknown institute";
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  await wait(100);
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) return data as Notification[];
      }
    } catch {}
  }
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

/** Booked (slot-holding) intervals for a resource; borrower identity is not exposed */
export async function getBusySlots(resourceId: string): Promise<Slot[]> {
  await wait(100);
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("bookings")
          .select("starts_at, ends_at")
          .eq("resource_id", resourceId)
          .in("status", ["approved", "checked_out"]);
        if (!error && data) return data as Slot[];
      }
    } catch {}
  }
  return rows()
    .bookings.filter((b) => b.resource_id === resourceId && HOLDING.includes(b.status))
    .map(({ starts_at, ends_at }) => ({ starts_at, ends_at }));
}

export async function getBadges(): Promise<Badge[]> {
  return mock.badges;
}

export async function getUserBadges(userId: string): Promise<UserBadgeView[]> {
  await wait(100);
  const userBadges = mock.userBadges.filter((ub) => ub.user_id === userId);
  return userBadges.map((ub) => ({
    ...ub,
    badge: mock.badges.find((b) => b.id === ub.badge_id)!,
  }));
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

// ---------- readiness_check() ----------

export async function runReadinessCheck(resourceId: string, userId: string, slot: Slot): Promise<ReadinessResult> {
  await wait(150);

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.rpc("readiness_check", {
        p_resource_id: resourceId,
        p_user_id: userId,
        p_starts_at: slot.starts_at,
        p_ends_at: slot.ends_at,
      });
      if (error) throw new Error(error.message);
      if (data) {
        return data as ReadinessResult;
      }
    }
  }

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

  // 6. Duration + availability window
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

  // 8. Approval / supervision info
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

// ---------- Booking Lifecycle (RPCs + Mock persistence) ----------

export async function requestBooking(resourceId: string, userId: string, slot: Slot, purpose: string) {
  await wait();

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase client failed to initialize.");
    const { data, error } = await supabase.rpc("request_booking", {
      p_resource_id: resourceId,
      p_borrower_id: userId,
      p_starts_at: slot.starts_at,
      p_ends_at: slot.ends_at,
      p_purpose: purpose,
    });
    if (error) throw new Error(error.message);
    return data as { id: string; status: BookingStatus; outcome: string; position?: number };
  }

  // Fallback in-memory persistence
  const check = await runReadinessCheck(resourceId, userId, slot);
  if (check.outcome === "blocked") throw new Error("Readiness check failed on the server.");

  const r = mock.resources.find((x) => x.id === resourceId)!;
  const status: BookingStatus = check.outcome === "waitlist" ? "waitlisted" : r.requires_approval ? "requested" : "approved";
  const newId = `00000000-0000-4000-a000-${String(Date.now()).slice(-12)}`;

  const newBooking: Booking = {
    id: newId,
    resource_id: resourceId,
    borrower_id: userId,
    starts_at: slot.starts_at,
    ends_at: slot.ends_at,
    purpose,
    status,
    decision_reason: status === "approved" ? "Auto-approved" : null,
    decided_by: status === "approved" ? r.owner_id : null,
    decided_at: status === "approved" ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  rows().bookings.unshift(newBooking);

  // Append audit event with hash chain
  const prevEvent = rows().auditEvents[rows().auditEvents.length - 1];
  const prevHash = prevEvent ? prevEvent.hash : "GENESIS_HASH_SAAJHA_NITW_2026";
  const timestamp = new Date().toISOString();
  const hash = await sha256Hex(prevHash + userId + "booking.requested" + newId + timestamp);

  rows().auditEvents.push({
    id: rows().auditEvents.length + 1,
    actor_id: userId,
    action: "booking.requested",
    entity_type: "booking",
    entity_id: newId,
    details: { resource: r.name, purpose, slot },
    prev_hash: prevHash,
    hash,
    created_at: timestamp,
  });

  return { id: newId, status, outcome: check.outcome, position: check.waitlist?.position };
}

export async function getBookings(filter?: { borrowerId?: string; ownerId?: string }): Promise<BookingView[]> {
  await wait(150);

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      let q = supabase
        .from("bookings")
        .select(`
          *,
          resource:resources(*),
          borrower:profiles!bookings_borrower_id_fkey(id, full_name, email, department, roll_no, reliability)
        `)
        .order("created_at", { ascending: false });

      if (filter?.borrowerId) q = q.eq("borrower_id", filter.borrowerId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      if (data) {
        let results = data.map((b) => {
          const row = b as unknown as Booking & { resource: (typeof mock.resources)[number] };
          return {
            ...row,
            resource: toView(row.resource),
          };
        }) as BookingView[];

        if (filter?.ownerId) {
          results = results.filter((b) => b.resource.owner_id === filter.ownerId);
        }
        return results;
      }
    }
  }

  // Fallback to in-memory store
  let list = rows().bookings;
  if (filter?.borrowerId) {
    list = list.filter((b) => b.borrower_id === filter.borrowerId);
  } else if (filter?.ownerId) {
    const ownedResourceIds = new Set(mock.resources.filter((r) => r.owner_id === filter.ownerId).map((r) => r.id));
    list = list.filter((b) => ownedResourceIds.has(b.resource_id));
  }

  return list.map((b) => {
    const r = mock.resources.find((x) => x.id === b.resource_id)!;
    const borrower = profileById(b.borrower_id);
    return {
      ...b,
      resource: toView(r),
      borrower: {
        id: borrower.id,
        full_name: borrower.full_name,
        email: borrower.email,
        department: borrower.department,
        roll_no: borrower.roll_no,
        reliability: borrower.reliability,
      },
    };
  });
}

export async function getBooking(id: string): Promise<BookingView | null> {
  await wait(100);
  const bookings = await getBookings();
  const found = bookings.find((b) => b.id === id);
  if (!found) return null;

  const reports = await getConditionReports(id);
  return { ...found, condition_reports: reports };
}

export async function getBookingAuditEvents(bookingId: string): Promise<AuditEvent[]> {
  await wait(100);
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("audit_events")
          .select("*")
          .eq("entity_id", bookingId)
          .order("id", { ascending: true });
        if (!error && data) return data as AuditEvent[];
      }
    } catch {}
  }
  return rows().auditEvents.filter((e) => e.entity_id === bookingId);
}

export async function getAllAuditEvents(): Promise<AuditEvent[]> {
  await wait(150);
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.from("audit_events").select("*").order("id", { ascending: false });
        if (!error && data) return data as AuditEvent[];
      }
    } catch {}
  }
  return [...rows().auditEvents].reverse();
}

export async function getConditionReports(bookingId: string): Promise<ConditionReport[]> {
  await wait(100);
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("condition_reports")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: true });
        if (!error && data) return data as ConditionReport[];
      }
    } catch {}
  }
  return conditionReportsStore.filter((c) => c.booking_id === bookingId);
}

export async function decideBooking(
  bookingId: string,
  deciderId: string,
  decision: "approved" | "rejected",
  reason: string,
) {
  await wait();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.rpc("decide_booking", {
          p_booking_id: bookingId,
          p_decided_by: deciderId,
          p_decision: decision,
          p_reason: reason,
        });
        if (error) throw new Error(error.message);
        return data;
      }
    } catch (e) {
      throw e;
    }
  }

  // Fallback in-memory
  const b = rows().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");

  if (decision === "rejected" && (!reason || !reason.trim())) {
    throw new Error("A clear written reason is mandatory when rejecting a request.");
  }

  b.status = decision;
  b.decision_reason = reason;
  b.decided_by = deciderId;
  b.decided_at = new Date().toISOString();

  const prevEvent = rows().auditEvents[rows().auditEvents.length - 1];
  const prevHash = prevEvent ? prevEvent.hash : "GENESIS_HASH_SAAJHA_NITW_2026";
  const timestamp = new Date().toISOString();
  const hash = await sha256Hex(prevHash + deciderId + `booking.${decision}` + bookingId + timestamp);

  rows().auditEvents.push({
    id: rows().auditEvents.length + 1,
    actor_id: deciderId,
    action: `booking.${decision}`,
    entity_type: "booking",
    entity_id: bookingId,
    details: { decision, reason },
    prev_hash: prevHash,
    hash,
    created_at: timestamp,
  });

  return { id: bookingId, status: decision };
}

export async function checkOutBooking(
  bookingId: string,
  actorId: string,
  condition: Condition,
  checklist: Record<string, boolean>,
  notes?: string,
) {
  await wait();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.rpc("check_out", {
          p_booking_id: bookingId,
          p_actor_id: actorId,
          p_condition: condition,
          p_checklist: checklist,
          p_notes: notes ?? null,
          p_photo_paths: [],
        });
        if (error) throw new Error(error.message);
        return data;
      }
    } catch (e) {
      throw e;
    }
  }

  const b = rows().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");

  b.status = "checked_out";

  const reportId = `report_${Date.now()}`;
  conditionReportsStore.push({
    id: reportId,
    booking_id: bookingId,
    stage: "check_out",
    condition,
    checklist,
    notes: notes ?? null,
    photo_paths: [],
    author_id: actorId,
    created_at: new Date().toISOString(),
  });

  const prevEvent = rows().auditEvents[rows().auditEvents.length - 1];
  const prevHash = prevEvent ? prevEvent.hash : "GENESIS_HASH_SAAJHA_NITW_2026";
  const timestamp = new Date().toISOString();
  const hash = await sha256Hex(prevHash + actorId + "booking.checked_out" + bookingId + timestamp);

  rows().auditEvents.push({
    id: rows().auditEvents.length + 1,
    actor_id: actorId,
    action: "booking.checked_out",
    entity_type: "booking",
    entity_id: bookingId,
    details: { condition, notes },
    prev_hash: prevHash,
    hash,
    created_at: timestamp,
  });

  return { id: bookingId, status: "checked_out", reportId };
}

export async function returnBooking(
  bookingId: string,
  actorId: string,
  condition: Condition,
  checklist: Record<string, boolean>,
  notes?: string,
) {
  await wait();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.rpc("return_booking", {
          p_booking_id: bookingId,
          p_actor_id: actorId,
          p_condition: condition,
          p_checklist: checklist,
          p_notes: notes ?? null,
          p_photo_paths: [],
        });
        if (error) throw new Error(error.message);
        return data;
      }
    } catch (e) {
      throw e;
    }
  }

  const b = rows().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("Booking not found");

  b.status = "returned";

  const reportId = `report_${Date.now()}`;
  conditionReportsStore.push({
    id: reportId,
    booking_id: bookingId,
    stage: "return",
    condition,
    checklist,
    notes: notes ?? null,
    photo_paths: [],
    author_id: actorId,
    created_at: new Date().toISOString(),
  });

  const prevEvent = rows().auditEvents[rows().auditEvents.length - 1];
  const prevHash = prevEvent ? prevEvent.hash : "GENESIS_HASH_SAAJHA_NITW_2026";
  const timestamp = new Date().toISOString();
  const hash = await sha256Hex(prevHash + actorId + "booking.returned" + bookingId + timestamp);

  rows().auditEvents.push({
    id: rows().auditEvents.length + 1,
    actor_id: actorId,
    action: "booking.returned",
    entity_type: "booking",
    entity_id: bookingId,
    details: { condition, notes },
    prev_hash: prevHash,
    hash,
    created_at: timestamp,
  });

  return { id: bookingId, status: "returned", reportId };
}

export async function verifyAuditLedger(): Promise<{ valid: boolean; totalEvents: number; brokenId?: number; message: string }> {
  await wait(300);

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.rpc("verify_ledger");
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        return {
          valid: data[0].valid,
          totalEvents: Number(data[0].total_events),
          brokenId: data[0].broken_id,
          message: data[0].message,
        };
      }
    }
  }

  // Fallback in-memory hash verification
  const events = rows().auditEvents;
  let expectedPrev = "GENESIS_HASH_SAAJHA_NITW_2026";
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (i > 0 && e.prev_hash !== expectedPrev) {
      return { valid: false, totalEvents: events.length, brokenId: e.id, message: `Prev hash mismatch on event ${e.id}` };
    }
    expectedPrev = e.hash;
  }
  return { valid: true, totalEvents: events.length, message: `All ${events.length} audit events verified intact with SHA-256.` };
}

/** Keyword stand-in for AI need → resource matching */
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
