-- Migration 001: Initial Schema for Saajha Campus Resource Platform
-- Sets up core tables, enum types, indexes, and range exclusion constraint

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'owner', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_category AS ENUM ('fabrication', 'test_measurement', 'media', 'space');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_visibility AS ENUM ('department', 'campus', 'partner');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_status AS ENUM ('active', 'maintenance', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_badge_status AS ENUM ('pending', 'active', 'revoked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM (
    'requested',
    'waitlisted',
    'approved',
    'rejected',
    'cancelled',
    'checked_out',
    'overdue',
    'returned',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.waitlist_status AS ENUM ('waiting', 'promoted', 'expired', 'left');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.condition_stage AS ENUM ('check_out', 'return');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.condition_grade AS ENUM ('excellent', 'good', 'fair', 'damaged');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.incident_type AS ENUM ('damage', 'late_return', 'no_show', 'misuse', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.incident_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Institutions
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Profiles (can be linked to auth.users if available)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'student',
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  department TEXT,
  roll_no TEXT,
  verified BOOLEAN NOT NULL DEFAULT true,
  weekly_credits INT NOT NULL DEFAULT 10 CHECK (weekly_credits >= 0),
  reliability INT NOT NULL DEFAULT 100 CHECK (reliability BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Badges
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

-- 4. User Badges (Skill Passport)
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  issued_at TIMESTAMPTZ,
  evidence_path TEXT,
  status public.user_badge_status NOT NULL DEFAULT 'pending',
  PRIMARY KEY (user_id, badge_id)
);

-- 5. Resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  name TEXT NOT NULL,
  category public.resource_category NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  requires_supervision BOOLEAN NOT NULL DEFAULT false,
  max_hours INT NOT NULL DEFAULT 3 CHECK (max_hours > 0),
  credit_cost INT NOT NULL DEFAULT 1 CHECK (credit_cost >= 0),
  cooldown_hours INT NOT NULL DEFAULT 0 CHECK (cooldown_hours >= 0),
  usage_rules TEXT NOT NULL DEFAULT '',
  visibility public.resource_visibility NOT NULL DEFAULT 'campus',
  status public.resource_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Resource Badges (Required badges for a resource)
CREATE TABLE IF NOT EXISTS public.resource_badges (
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, badge_id)
);

-- 7. Availability Windows
CREATE TABLE IF NOT EXISTS public.availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT window_order CHECK (end_time > start_time)
);

-- 8. Bookings with Range Exclusion Constraint (No double bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  slot TSTZRANGE GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  purpose TEXT NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'requested',
  decision_reason TEXT,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_booking_duration CHECK (ends_at > starts_at),
  CONSTRAINT no_double_booking EXCLUDE USING gist (
    resource_id WITH =,
    slot WITH &&
  ) WHERE (status IN ('approved', 'checked_out'))
);

-- 9. Waitlist Entries
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  purpose TEXT NOT NULL,
  priority_score NUMERIC(6, 2) NOT NULL DEFAULT 100,
  position INT NOT NULL DEFAULT 1 CHECK (position > 0),
  status public.waitlist_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_waitlist_duration CHECK (ends_at > starts_at)
);

-- 10. Condition Reports (Append-only)
CREATE TABLE IF NOT EXISTS public.condition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  stage public.condition_stage NOT NULL,
  condition public.condition_grade NOT NULL,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_stage_per_booking UNIQUE (booking_id, stage)
);

-- 11. Incidents
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  type public.incident_type NOT NULL,
  description TEXT NOT NULL,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ai_summary TEXT,
  status public.incident_status NOT NULL DEFAULT 'open',
  resolution TEXT,
  penalty_credits INT NOT NULL DEFAULT 0 CHECK (penalty_credits >= 0),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Audit Events (Hash-chained, append-only)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_resource_status ON public.bookings (resource_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_borrower ON public.bookings (borrower_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.bookings USING gist (slot);
CREATE INDEX IF NOT EXISTS idx_resources_visibility_status ON public.resources (visibility, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.audit_events (created_at);

