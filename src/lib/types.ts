// Row types mirroring CLAUDE.md §5. Field names match the Postgres columns so the
// Supabase swap only touches src/lib/data.ts.

export type UUID = string;
export type Timestamp = string; // ISO 8601 (timestamptz)

export type Role = "student" | "owner" | "manager" | "admin";
export type Category = "fabrication" | "test_measurement" | "media" | "space";
export type Visibility = "department" | "campus" | "partner";
export type ResourceStatus = "active" | "maintenance" | "suspended";
export type UserBadgeStatus = "pending" | "active" | "revoked";
export type BookingStatus =
  | "requested"
  | "waitlisted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "checked_out"
  | "overdue"
  | "returned"
  | "completed";
export type WaitlistStatus = "waiting" | "promoted" | "expired" | "left";
export type ConditionStage = "check_out" | "return";
export type Condition = "excellent" | "good" | "fair" | "damaged";
export type IncidentType = "damage" | "late_return" | "no_show" | "misuse" | "other";
export type IncidentStatus = "open" | "under_review" | "resolved" | "dismissed";

export interface Institution {
  id: UUID;
  name: string;
  short_code: string;
}

export interface Profile {
  id: UUID;
  full_name: string;
  email: string;
  role: Role;
  institution_id: UUID;
  department: string | null;
  roll_no: string | null;
  verified: boolean;
  weekly_credits: number;
  reliability: number;
  created_at: Timestamp;
}

export interface Badge {
  id: UUID;
  code: string;
  name: string;
  description: string;
}

export interface UserBadge {
  user_id: UUID;
  badge_id: UUID;
  issued_by: UUID | null;
  issued_at: Timestamp | null;
  evidence_path: string | null;
  status: UserBadgeStatus;
}

export interface Resource {
  id: UUID;
  owner_id: UUID;
  name: string;
  category: Category;
  description: string;
  location: string;
  image_url: string | null;
  requires_approval: boolean;
  requires_supervision: boolean;
  max_hours: number;
  credit_cost: number;
  cooldown_hours: number;
  usage_rules: string;
  visibility: Visibility;
  status: ResourceStatus;
  created_at: Timestamp;
}

export interface ResourceBadge {
  resource_id: UUID;
  badge_id: UUID;
}

export interface AvailabilityWindow {
  id: UUID;
  resource_id: UUID;
  weekday: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // "HH:MM"
  end_time: string;
}

export interface Booking {
  id: UUID;
  resource_id: UUID;
  borrower_id: UUID;
  starts_at: Timestamp;
  ends_at: Timestamp;
  purpose: string;
  status: BookingStatus;
  decision_reason: string | null;
  decided_by: UUID | null;
  decided_at: Timestamp | null;
  created_at: Timestamp;
}

export interface WaitlistEntry {
  id: UUID;
  resource_id: UUID;
  user_id: UUID;
  starts_at: Timestamp;
  ends_at: Timestamp;
  purpose: string;
  priority_score: number;
  position: number;
  status: WaitlistStatus;
  created_at: Timestamp;
}

export interface ConditionReport {
  id: UUID;
  booking_id: UUID;
  stage: ConditionStage;
  condition: Condition;
  checklist: Record<string, boolean>;
  notes: string | null;
  photo_paths: string[];
  author_id: UUID;
  created_at: Timestamp;
}

export interface Incident {
  id: UUID;
  booking_id: UUID;
  type: IncidentType;
  description: string;
  reported_by: UUID;
  ai_summary: string | null;
  status: IncidentStatus;
  resolution: string | null;
  penalty_credits: number;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  created_at: Timestamp;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: Timestamp;
}

export interface AuditEvent {
  id: number;
  actor_id: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID;
  details: Record<string, unknown>;
  prev_hash: string | null;
  hash: string;
  created_at: Timestamp;
}

// ---------- View / RPC shapes (what data.ts returns) ----------

export interface Slot {
  starts_at: Timestamp;
  ends_at: Timestamp;
}

/** A resource joined with what list and detail views need (a Postgres view later). */
export interface ResourceView extends Resource {
  owner: Pick<Profile, "id" | "full_name" | "department">;
  required_badges: Badge[];
  availability: AvailabilityWindow[];
  next_free: Slot | null;
}

/** One row of readiness_check() output, CLAUDE.md §6. */
export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  /** "info" rows never block; "waitlist" means the slot is taken but you can queue. */
  kind?: "info" | "waitlist";
  fix?: { label: string; href: string };
}

export interface ReadinessResult {
  checks: ReadinessCheck[];
  outcome: "ready" | "waitlist" | "blocked";
  waitlist?: {
    position: number;
    score: number;
    breakdown: { label: string; value: number }[];
  };
}

/** The six one-click demo identities on /login. */
export type DemoRole = "student" | "student2" | "partner" | "owner" | "manager" | "admin";

export interface DemoAccount {
  key: DemoRole;
  label: string;
  blurb: string;
  profile: Profile;
}


export interface BookingView extends Booking {
  resource: ResourceView;
  borrower: Pick<Profile, "id" | "full_name" | "email" | "department" | "roll_no" | "reliability">;
  condition_reports?: ConditionReport[];
}

export interface UserBadgeView extends UserBadge {
  badge: Badge;
}
