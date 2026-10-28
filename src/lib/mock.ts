// Fictional demo data (CLAUDE.md §10). Only src/lib/data.ts may import this file;
// UI code goes through the async helpers so Supabase can replace them later.
// IDs are fixed UUIDs so the SQL seed can reuse them.

import type {
  AuditEvent,
  AvailabilityWindow,
  Badge,
  Booking,
  DemoAccount,
  Institution,
  Notification,
  Profile,
  Resource,
  ResourceBadge,
  UserBadge,
  WaitlistEntry,
} from "./types";

const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`;

export const IDS = {
  nitw: id(1),
  kitsw: id(2),
  student: id(101),
  student2: id(102),
  partner: id(103),
  owner: id(104),
  manager: id(105),
  admin: id(106),
  ownerMaker: id(107),
  ownerEstates: id(108),
  meera: id(109),
  badgeSafety: id(201),
  badgePrinter: id(202),
  badgeScope: id(203),
  printer: id(301),
  scope: id(302),
  dslr: id(303),
  pi: id(304),
  hall: id(305),
  room: id(306),
  solder: id(307),
  projector: id(308),
} as const;

const CREATED = "2026-10-01T09:00:00+05:30";

export const institutions: Institution[] = [
  { id: IDS.nitw, name: "NIT Warangal", short_code: "NITW" },
  { id: IDS.kitsw, name: "Kakatiya Institute (demo)", short_code: "KITSW" },
];

const profile = (p: Partial<Profile> & Pick<Profile, "id" | "full_name" | "email" | "role">): Profile => ({
  institution_id: IDS.nitw,
  department: null,
  roll_no: null,
  verified: true,
  weekly_credits: 10,
  reliability: 100,
  created_at: CREATED,
  ...p,
});

export const profiles: Profile[] = [
  profile({ id: IDS.student, full_name: "Aarav Reddy", email: "student@saajha.demo", role: "student", department: "ECE", roll_no: "22ECB0F14", weekly_credits: 8, reliability: 96 }),
  profile({ id: IDS.student2, full_name: "Diya Sharma", email: "student2@saajha.demo", role: "student", department: "Mechanical", roll_no: "23MEB0A27", weekly_credits: 6, reliability: 92 }),
  profile({ id: IDS.partner, full_name: "Karthik Rao", email: "partner@saajha.demo", role: "student", institution_id: IDS.kitsw, department: "EEE", roll_no: "K22EE031", weekly_credits: 6, reliability: 100 }),
  profile({ id: IDS.owner, full_name: "Dr. Lakshmi Narayana", email: "owner@saajha.demo", role: "owner", department: "ECE · Instrumentation & Media Lab" }),
  profile({ id: IDS.manager, full_name: "Prof. Suresh Babu", email: "manager@saajha.demo", role: "manager", department: "Dean (Academic) Office" }),
  profile({ id: IDS.admin, full_name: "Neha Kulkarni", email: "admin@saajha.demo", role: "admin", department: "Saajha Admin" }),
  profile({ id: IDS.ownerMaker, full_name: "Ravi Teja", email: "makerspace@saajha.demo", role: "owner", department: "Makerspace (Mechanical)" }),
  profile({ id: IDS.ownerEstates, full_name: "Anitha G.", email: "spaces@saajha.demo", role: "owner", department: "Academic Section · Rooms" }),
  profile({ id: IDS.meera, full_name: "Meera Iyer", email: "meera@saajha.demo", role: "student", department: "Civil", roll_no: "22CEB0B09", reliability: 100 }),
];

export const demoAccounts: Omit<DemoAccount, "profile">[] = [
  { key: "student", label: "Student", blurb: "Has every badge. Finds kit, passes the readiness check and books it." },
  { key: "student2", label: "Student 2", blurb: "Missing the 3D-printer badge. Sees why they're blocked and joins a waitlist." },
  { key: "partner", label: "Partner college", blurb: "From Kakatiya Institute. Sees only shared resources, always supervised." },
  { key: "owner", label: "Owner", blurb: "Lab in-charge. Lists equipment, approves requests and confirms handovers." },
  { key: "manager", label: "Manager", blurb: "Issues badges, reviews damage reports and decides fair penalties." },
  { key: "admin", label: "Admin", blurb: "Sees everything, manages roles and verifies the tamper-evident ledger." },
];

export const demoProfileIds: Record<DemoAccount["key"], string> = {
  student: IDS.student,
  student2: IDS.student2,
  partner: IDS.partner,
  owner: IDS.owner,
  manager: IDS.manager,
  admin: IDS.admin,
};

export const badges: Badge[] = [
  { id: IDS.badgeSafety, code: "LAB_SAFETY_1", name: "Lab Safety Level 1", description: "General lab safety induction: PPE, fire exits, ESD and first aid." },
  { id: IDS.badgePrinter, code: "PRINTER_3D", name: "3D Printer Trained", description: "Hands-on Makerspace session on slicing, bed levelling and filament changes." },
  { id: IDS.badgeScope, code: "SCOPE_BASIC", name: "Oscilloscope Basics", description: "Probe compensation, triggering and safe measurement on bench scopes." },
];

export const userBadges: UserBadge[] = [
  ...[IDS.badgeSafety, IDS.badgePrinter, IDS.badgeScope].map((badge_id) => ({
    user_id: IDS.student, badge_id, issued_by: IDS.manager, issued_at: "2026-08-20T11:00:00+05:30", evidence_path: null, status: "active" as const,
  })),
  { user_id: IDS.student2, badge_id: IDS.badgeSafety, issued_by: IDS.manager, issued_at: "2026-09-02T11:00:00+05:30", evidence_path: null, status: "active" },
  { user_id: IDS.student2, badge_id: IDS.badgePrinter, issued_by: null, issued_at: null, evidence_path: "certificates/diya-printer.pdf", status: "pending" },
  { user_id: IDS.partner, badge_id: IDS.badgeScope, issued_by: IDS.manager, issued_at: "2026-09-15T11:00:00+05:30", evidence_path: null, status: "active" },
  { user_id: IDS.meera, badge_id: IDS.badgeSafety, issued_by: IDS.manager, issued_at: "2026-08-10T11:00:00+05:30", evidence_path: null, status: "active" },
];

const resource = (r: Partial<Resource> & Pick<Resource, "id" | "owner_id" | "name" | "category" | "description" | "location" | "usage_rules">): Resource => ({
  image_url: null,
  requires_approval: true,
  requires_supervision: false,
  max_hours: 3,
  credit_cost: 2,
  cooldown_hours: 0,
  visibility: "campus",
  status: "active",
  created_at: CREATED,
  ...r,
});

export const resources: Resource[] = [
  resource({
    id: IDS.printer, owner_id: IDS.ownerMaker, name: "Prusa MK4 3D Printer", category: "fabrication",
    description: "FDM printer with a 25 × 21 × 22 cm build volume. PLA and PETG stocked; bring your own sliced G-code on a USB stick.",
    location: "Makerspace, Mechanical Block, Room 104",
    requires_supervision: true, max_hours: 4, credit_cost: 3, cooldown_hours: 24,
    usage_rules: "A Makerspace volunteer must be present for the first layer.\nPLA and PETG only, no ABS (ventilation).\nRemove your print and clean the bed before you leave.\nPrints over 4 hours need a separate overnight request.",
  }),
  resource({
    id: IDS.scope, owner_id: IDS.owner, name: "Rigol DS1054Z Oscilloscope", category: "test_measurement",
    description: "4-channel, 50 MHz digital storage oscilloscope with two passive probes. Good for embedded and power-electronics projects.",
    location: "ECE Instrumentation Lab, Room 211",
    max_hours: 3, credit_cost: 2, visibility: "partner",
    usage_rules: "Use only the probes in the case and return them coiled.\nNo mains-voltage measurements without supervision.\nLog your session in the bench register.",
  }),
  resource({
    id: IDS.dslr, owner_id: IDS.owner, name: "Canon EOS 90D DSLR Kit", category: "media",
    description: "Body with 18–135 mm lens, two batteries, a 64 GB card and a tripod. Popular for club events and project videos.",
    location: "Media Lab, Library Annexe, Room 12",
    max_hours: 4, credit_cost: 2, cooldown_hours: 24,
    usage_rules: "Charge both batteries before returning.\nFormat the card only after copying your files.\nNo use in rain or near the swimming pool.\nReport any lens scratch immediately, however small.",
  }),
  resource({
    id: IDS.pi, owner_id: IDS.owner, name: "Raspberry Pi 5 Kit", category: "test_measurement",
    description: "Pi 5 (8 GB) with case, 27 W supply, 64 GB microSD with Raspberry Pi OS, HDMI cable and a breadboard starter set.",
    location: "ECE Instrumentation Lab, Room 211",
    requires_approval: false, max_hours: 4, credit_cost: 1, visibility: "partner",
    usage_rules: "Don't re-flash the card; use your own microSD for custom images.\nReturn all GPIO jumper wires in the bag.",
  }),
  resource({
    id: IDS.hall, owner_id: IDS.ownerEstates, name: "Seminar Hall B", category: "space",
    description: "120-seat hall with a projector, two wireless mics and a podium. Good for club talks and project demos.",
    location: "Academic Block 2, Ground Floor",
    max_hours: 3, credit_cost: 4, visibility: "partner",
    usage_rules: "Faculty coordinator's name required in the purpose.\nNo food inside the hall.\nSwitch off the AC and projector when you leave.",
  }),
  resource({
    id: IDS.room, owner_id: IDS.ownerEstates, name: "Project Room 2", category: "space",
    description: "Quiet 8-seat room with a whiteboard and a 55\" display. Great for team stand-ups and hackathon nights.",
    location: "Library, 2nd Floor",
    requires_approval: false, max_hours: 4, credit_cost: 1,
    usage_rules: "Leave the whiteboard clean.\nMax 8 people.",
  }),
  resource({
    id: IDS.solder, owner_id: IDS.ownerMaker, name: "Soldering Station (Hakko FX-888D)", category: "fabrication",
    description: "Temperature-controlled station with fume extractor, helping hands and lead-free solder.",
    location: "Makerspace, Mechanical Block, Room 104",
    max_hours: 2, credit_cost: 1, visibility: "department",
    usage_rules: "Fume extractor on at all times.\nNever leave the iron unattended while hot.\nSafety glasses required.",
  }),
  resource({
    id: IDS.projector, owner_id: IDS.owner, name: "Epson Portable Projector", category: "media",
    description: "3,600-lumen projector with HDMI and USB-C, in a carry bag with a 5 m HDMI cable.",
    location: "Media Lab, Library Annexe, Room 12",
    requires_approval: false, max_hours: 4, credit_cost: 1, status: "maintenance",
    usage_rules: "Let the lamp cool for 5 minutes before packing.",
  }),
];

export const resourceBadges: ResourceBadge[] = [
  { resource_id: IDS.printer, badge_id: IDS.badgePrinter },
  { resource_id: IDS.printer, badge_id: IDS.badgeSafety },
  { resource_id: IDS.scope, badge_id: IDS.badgeScope },
  { resource_id: IDS.solder, badge_id: IDS.badgeSafety },
];

const windows = (resource_id: string, days: number[], start: string, end: string, base: number): AvailabilityWindow[] =>
  days.map((weekday, i) => ({ id: id(base + i), resource_id, weekday, start_time: start, end_time: end }));

const ALL = [0, 1, 2, 3, 4, 5, 6];
const MON_SAT = [1, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];

export const availabilityWindows: AvailabilityWindow[] = [
  ...windows(IDS.printer, MON_FRI, "10:00", "17:00", 1000),
  ...windows(IDS.scope, MON_SAT, "09:00", "18:00", 1010),
  ...windows(IDS.dslr, ALL, "09:00", "20:00", 1020),
  ...windows(IDS.pi, MON_SAT, "09:00", "18:00", 1030),
  ...windows(IDS.hall, ALL, "08:00", "21:00", 1040),
  ...windows(IDS.room, ALL, "08:00", "23:00", 1050),
  ...windows(IDS.solder, MON_SAT, "10:00", "17:00", 1060),
  ...windows(IDS.projector, ALL, "09:00", "20:00", 1070),
];

// ---------- Time-relative rows (built lazily so nothing runs at import time) ----------

/** Local time `dayOffset` days from today at `hour`:00. */
function at(now: Date, dayOffset: number, hour: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export interface TimedRows {
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  notifications: Notification[];
  auditEvents: AuditEvent[];
}

export function buildTimedRows(now: Date): TimedRows {
  const b = (n: number, r: Partial<Booking> & Pick<Booking, "resource_id" | "borrower_id" | "starts_at" | "ends_at" | "status" | "purpose">): Booking => ({
    id: id(n), decision_reason: null, decided_by: null, decided_at: null, created_at: at(now, -3, 10), ...r,
  });

  const bookings: Booking[] = [
    // The conflicting DSLR slot (§10): tomorrow 2–5 PM is already approved for Meera.
    b(501, { resource_id: IDS.dslr, borrower_id: IDS.meera, starts_at: at(now, 1, 14), ends_at: at(now, 1, 17), status: "approved", purpose: "Photography Club: Dandiya Night coverage", decided_by: IDS.owner, decided_at: at(now, -1, 16), decision_reason: "Club event, all checks passed." }),
    // Aarav (Student): one in every state
    b(502, { resource_id: IDS.solder, borrower_id: IDS.student, starts_at: at(now, 3, 11), ends_at: at(now, 3, 13), status: "approved", purpose: "Solder the motor-driver board for our line follower", decided_by: IDS.ownerMaker, decided_at: at(now, -1, 12), decision_reason: "Badge verified, slot free." }),
    b(503, { resource_id: IDS.scope, borrower_id: IDS.student, starts_at: at(now, -2, 10), ends_at: at(now, -2, 12), status: "completed", purpose: "Debug the PWM signal on the ESP32 inverter" }),
    b(504, { resource_id: IDS.pi, borrower_id: IDS.student, starts_at: at(now, -6, 14), ends_at: at(now, -6, 17), status: "returned", purpose: "Run the OpenCV demo for the robotics club" }),
    b(505, { resource_id: IDS.room, borrower_id: IDS.student, starts_at: at(now, -1, 20), ends_at: at(now, -1, 23), status: "cancelled", purpose: "Team stand-up", decision_reason: "Cancelled by borrower: meeting moved online." }),
    // Diya (Student 2)
    b(506, { resource_id: IDS.room, borrower_id: IDS.student2, starts_at: at(now, -4, 18), ends_at: at(now, -4, 21), status: "completed", purpose: "CAD review for the SAE Baja team" }),
    b(507, { resource_id: IDS.printer, borrower_id: IDS.student2, starts_at: at(now, -3, 10), ends_at: at(now, -3, 13), status: "rejected", purpose: "Print a gearbox housing", decided_by: IDS.ownerMaker, decided_at: at(now, -4, 9), decision_reason: "Missing the 3D Printer Trained badge. Book a Thursday training session first." }),
    // Others, so dashboards aren't empty
    b(508, { resource_id: IDS.hall, borrower_id: IDS.meera, starts_at: at(now, 2, 17), ends_at: at(now, 2, 19), status: "requested", purpose: "ASCE student chapter talk (coordinator: Dr. Rao)" }),
    b(509, { resource_id: IDS.printer, borrower_id: IDS.student, starts_at: at(now, -1, 10), ends_at: at(now, -1, 14), status: "overdue", purpose: "Prototype enclosure for the smart-meter project" }),
    b(510, { resource_id: IDS.scope, borrower_id: IDS.meera, starts_at: at(now, 0, 9), ends_at: at(now, 0, 11), status: "checked_out", purpose: "Lab practice for Circuits II" }),
  ];

  const notifications: Notification[] = [
    { id: id(601), user_id: IDS.student, title: "Request approved", body: "Soldering Station is yours on " + new Date(at(now, 3, 11)).toDateString() + ", 11 AM–1 PM.", link: "/bookings", read: false, created_at: at(now, -1, 12) },
    { id: id(602), user_id: IDS.student, title: "Return overdue", body: "The Prusa 3D printer was due back yesterday at 2 PM. Please return it today.", link: "/bookings", read: false, created_at: at(now, 0, 9) },
    { id: id(603), user_id: IDS.student2, title: "Badge under review", body: "Your 3D Printer Trained certificate is with the manager.", link: "/passport", read: false, created_at: at(now, -1, 15) },
    { id: id(604), user_id: IDS.owner, title: "New request", body: "Seminar Hall B requested for an ASCE talk.", link: "/owner", read: false, created_at: at(now, -1, 18) },
    { id: id(605), user_id: IDS.manager, title: "Badge request", body: "Diya Sharma uploaded a 3D-printer certificate.", link: "/manager", read: false, created_at: at(now, -1, 15) },
    { id: id(606), user_id: IDS.admin, title: "Ledger verified", body: "Nightly integrity check passed for 128 events.", link: "/admin", read: true, created_at: at(now, 0, 2) },
    { id: id(607), user_id: IDS.partner, title: "Welcome, partner", body: "You can borrow 3 shared resources from NIT Warangal labs.", link: "/explore", read: false, created_at: at(now, -2, 10) },
  ];

  const auditEvents: AuditEvent[] = [
    { id: 1, actor_id: IDS.meera, action: "booking.requested", entity_type: "booking", entity_id: id(501), details: { resource: "Canon EOS 90D DSLR Kit" }, prev_hash: null, hash: "9f2c41d7a8e0b3c56d1f8e2a7b4c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8", created_at: at(now, -2, 11) },
    { id: 2, actor_id: IDS.owner, action: "booking.approved", entity_type: "booking", entity_id: id(501), details: { reason: "Club event, all checks passed." }, prev_hash: "9f2c41d7a8e0b3c56d1f8e2a7b4c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8", hash: "4b7e2a9c0d1f3e5a6b8c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a", created_at: at(now, -1, 16) },
  ];

  return { bookings, waitlist: [], notifications, auditEvents };
}
