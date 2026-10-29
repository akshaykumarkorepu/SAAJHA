-- ============================================================================
-- SAAJHA COMPLETE DATABASE SETUP SCRIPT
-- Combined single-file execution for Supabase SQL Editor
--
-- Components included in exact dependency order:
-- 1. 20261030000001_initial_schema.sql (Extensions, Tables, Constraints)
-- 2. 20261030000002_functions_and_triggers.sql (Audit Trigger, RPC Functions, Grants)
-- 3. 20261030000003_rls_policies.sql (Row Level Security for all tables)
-- 4. seed.sql (Reference Institutions, Equipment, Schedules, Badges)
-- 5. create_auth_users.sql (Demo Auth accounts linked to Profiles)
--
-- Safe for execution in Supabase Dashboard -> SQL Editor.
-- ============================================================================



-- ============================================================================
-- START COMPONENT: supabase/migrations/20261030000001_initial_schema.sql
-- ============================================================================

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



-- ============================================================================
-- START COMPONENT: supabase/migrations/20261030000002_functions_and_triggers.sql
-- ============================================================================

-- Migration 002: Core RPC Functions, Booking Lifecycle, and Audit Ledger
-- Enforces business logic inside the database with security definer functions
-- Hardened with SET search_path = pg_catalog, public, pg_temp and strict auth.uid() checks

-- 0. Helper to check if current auth user has a specific role (Required by readiness_check & RLS)
CREATE OR REPLACE FUNCTION public.auth_user_has_role(VARIADIC allowed_roles public.user_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_has_role FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_has_role TO authenticated;

-- 1. Function to record an immutable, hash-chained audit event
CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_prev_hash TEXT;
  v_hash TEXT;
  v_created_at TIMESTAMPTZ := pg_catalog.clock_timestamp();
  v_new_id BIGINT;
  v_effective_actor UUID;
BEGIN
  -- Obtain advisory lock to prevent race conditions during hash chain computation
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('saajha_audit_events_lock'));

  v_effective_actor := coalesce(auth.uid(), p_actor_id);

  SELECT hash INTO v_prev_hash
  FROM public.audit_events
  ORDER BY id DESC
  LIMIT 1;

  IF v_prev_hash IS NULL THEN
    v_prev_hash := 'GENESIS_HASH_SAAJHA_NITW_2026';
  END IF;

  v_hash := pg_catalog.encode(
    public.digest(
      v_prev_hash ||
      coalesce(v_effective_actor::text, '00000000-0000-0000-0000-000000000000') ||
      p_action ||
      p_entity_type ||
      p_entity_id::text ||
      p_details::text ||
      v_created_at::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.audit_events (
    actor_id, action, entity_type, entity_id, details, prev_hash, hash, created_at
  ) VALUES (
    v_effective_actor, p_action, p_entity_type, p_entity_id, p_details, v_prev_hash, v_hash, v_created_at
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- 2. Verify Audit Ledger Integrity
CREATE OR REPLACE FUNCTION public.verify_ledger()
RETURNS TABLE (
  valid BOOLEAN,
  total_events BIGINT,
  broken_id BIGINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  rec RECORD;
  v_expected_prev TEXT := 'GENESIS_HASH_SAAJHA_NITW_2026';
  v_computed_hash TEXT;
  v_count BIGINT := 0;
BEGIN
  -- Role check: only manager or admin can verify audit ledger integrity
  IF auth.uid() IS NOT NULL AND NOT public.auth_user_has_role('manager', 'admin') AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized: only administrators and managers can run cryptographic ledger verification.';
  END IF;

  FOR rec IN SELECT * FROM public.audit_events ORDER BY id ASC LOOP
    v_count := v_count + 1;

    IF rec.prev_hash IS DISTINCT FROM v_expected_prev THEN
      RETURN QUERY SELECT false, v_count, rec.id, 'Chain broken at prev_hash mismatch on event ID ' || rec.id::text;
      RETURN;
    END IF;

    v_computed_hash := pg_catalog.encode(
      public.digest(
        rec.prev_hash ||
        coalesce(rec.actor_id::text, '00000000-0000-0000-0000-000000000000') ||
        rec.action ||
        rec.entity_type ||
        rec.entity_id::text ||
        rec.details::text ||
        rec.created_at::text,
        'sha256'
      ),
      'hex'
    );

    IF v_computed_hash != rec.hash THEN
      RETURN QUERY SELECT false, v_count, rec.id, 'Tamper detected! Hash mismatch on event ID ' || rec.id::text;
      RETURN;
    END IF;

    v_expected_prev := rec.hash;
  END LOOP;

  RETURN QUERY SELECT true, v_count, NULL::BIGINT, 'All ' || v_count::text || ' audit events verified intact.';
END;
$$;

-- 3. Access-Readiness Check Engine (Server-side RPC)
CREATE OR REPLACE FUNCTION public.readiness_check(
  p_resource_id UUID,
  p_user_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user public.profiles%ROWTYPE;
  v_resource public.resources%ROWTYPE;
  v_inst public.institutions%ROWTYPE;
  v_duration_hours NUMERIC;
  v_checks JSONB := '[]'::jsonb;
  v_missing_badges TEXT[] := '{}';
  v_upcoming_count INT := 0;
  v_last_used TIMESTAMPTZ;
  v_cooldown_ends TIMESTAMPTZ;
  v_in_window BOOLEAN := false;
  v_slot_taken BOOLEAN := false;
  v_waitlist_pos INT := 1;
  v_waitlist_score NUMERIC(6, 2) := 100.00;
  v_recent_bookings_count INT := 0;
  v_is_partner BOOLEAN := false;
  v_outcome TEXT := 'ready';
  v_has_blocking BOOLEAN := false;
  v_weekday INT;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  -- Security check: If authenticated, user can only check own readiness (or manager/admin)
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id AND NOT public.auth_user_has_role('manager', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: you can only run the Access-Readiness Check for your own account.';
  END IF;

  -- Fetch user profile
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile % not found', p_user_id;
  END IF;

  -- Fetch resource
  SELECT * INTO v_resource FROM public.resources WHERE id = p_resource_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource % not found', p_resource_id;
  END IF;

  -- Duration calculation
  v_duration_hours := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 3600.0;
  IF v_duration_hours <= 0 THEN
    RAISE EXCEPTION 'Booking end time must be after start time';
  END IF;

  -- Check if user is partner college
  SELECT * INTO v_inst FROM public.institutions WHERE id = v_user.institution_id;
  IF FOUND AND v_inst.short_code != 'NITW' THEN
    v_is_partner := true;
  END IF;

  -- Check 1: Verified Institute Member
  IF v_user.verified THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'verified',
      'label', 'Verified institute member',
      'passed', true,
      'message', v_user.full_name || ' · ' || coalesce(v_user.roll_no, v_user.email) || ' is verified.'
    );
  ELSE
    v_checks := v_checks || jsonb_build_object(
      'key', 'verified',
      'label', 'Verified institute member',
      'passed', false,
      'message', 'Your account is not verified yet. Ask your department office to verify your roll number.'
    );
    v_has_blocking := true;
  END IF;

  -- Check 2: Required Training Badges
  SELECT array_agg(b.name) INTO v_missing_badges
  FROM public.resource_badges rb
  JOIN public.badges b ON b.id = rb.badge_id
  WHERE rb.resource_id = v_resource.id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub
      WHERE ub.user_id = v_user.id
        AND ub.badge_id = rb.badge_id
        AND ub.status = 'active'
    );

  IF v_missing_badges IS NULL OR array_length(v_missing_badges, 1) = 0 THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'badges',
      'label', 'Required badges held',
      'passed', true,
      'message', 'You hold every badge this resource needs.'
    );
  ELSE
    v_checks := v_checks || jsonb_build_object(
      'key', 'badges',
      'label', 'Required badges held',
      'passed', false,
      'message', 'Missing: ' || array_to_string(v_missing_badges, ', ') || '.',
      'fix', jsonb_build_object('label', 'Get the ' || v_missing_badges[1] || ' badge', 'href', '/passport')
    );
    v_has_blocking := true;
  END IF;

  -- Check 3: Weekly Credits
  IF v_user.weekly_credits >= v_resource.credit_cost THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'credits',
      'label', 'Within weekly credits',
      'passed', true,
      'message', 'Needs ' || v_resource.credit_cost || ' credits, you have ' || v_user.weekly_credits || ' this week.'
    );
  ELSE
    v_checks := v_checks || jsonb_build_object(
      'key', 'credits',
      'label', 'Within weekly credits',
      'passed', false,
      'message', 'Needs ' || v_resource.credit_cost || ' credits but you have ' || v_user.weekly_credits || '. Credits reset every Monday.'
    );
    v_has_blocking := true;
  END IF;

  -- Check 4: Active Booking Cap (Max 2 upcoming)
  SELECT count(*) INTO v_upcoming_count
  FROM public.bookings
  WHERE borrower_id = v_user.id
    AND status IN ('requested', 'approved')
    AND ends_at > now();

  IF v_upcoming_count < 2 THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'cap',
      'label', 'Active booking cap (max 2 upcoming)',
      'passed', true,
      'message', 'You have ' || v_upcoming_count || ' upcoming booking(s), so there is room for this one.'
    );
  ELSE
    v_checks := v_checks || jsonb_build_object(
      'key', 'cap',
      'label', 'Active booking cap (max 2 upcoming)',
      'passed', false,
      'message', 'You already have 2 upcoming bookings. Cancel or finish one first, so others get a turn.',
      'fix', jsonb_build_object('label', 'See my bookings', 'href', '/bookings')
    );
    v_has_blocking := true;
  END IF;

  -- Check 5: Cooldown Respected
  SELECT max(ends_at) INTO v_last_used
  FROM public.bookings
  WHERE borrower_id = v_user.id
    AND resource_id = v_resource.id
    AND status IN ('approved', 'checked_out', 'overdue', 'returned', 'completed');

  IF v_resource.cooldown_hours = 0 OR v_last_used IS NULL THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'cooldown',
      'label', 'Cooldown respected',
      'passed', true,
      'message', 'No cooldown on this resource.'
    );
  ELSE
    v_cooldown_ends := v_last_used + (v_resource.cooldown_hours || ' hours')::interval;
    IF v_cooldown_ends <= p_starts_at THEN
      v_checks := v_checks || jsonb_build_object(
        'key', 'cooldown',
        'label', 'Cooldown respected',
        'passed', true,
        'message', 'High-demand item: ' || v_resource.cooldown_hours || ' h gap between your bookings. You are clear.'
      );
    ELSE
      v_checks := v_checks || jsonb_build_object(
        'key', 'cooldown',
        'label', 'Cooldown respected',
        'passed', false,
        'message', 'You used this recently. Cooldown active until ' || to_char(v_cooldown_ends, 'YYYY-MM-DD HH24:MI') || '.'
      );
      v_has_blocking := true;
    END IF;
  END IF;

  -- Check 6: Within Max Duration, Opening Hours & Active Status
  v_weekday := EXTRACT(DOW FROM p_starts_at)::int;
  v_start_time := p_starts_at::time;
  v_end_time := p_ends_at::time;

  SELECT EXISTS (
    SELECT 1 FROM public.availability_windows
    WHERE resource_id = v_resource.id
      AND weekday = v_weekday
      AND start_time <= v_start_time
      AND end_time >= v_end_time
  ) INTO v_in_window;

  IF v_resource.status != 'active' THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'window',
      'label', 'Within max duration and opening hours',
      'passed', false,
      'message', 'This resource is under ' || v_resource.status || '. The owner will reopen bookings soon.'
    );
    v_has_blocking := true;
  ELSIF v_duration_hours > v_resource.max_hours THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'window',
      'label', 'Within max duration and opening hours',
      'passed', false,
      'message', 'Max ' || v_resource.max_hours || ' h per booking; you picked ' || round(v_duration_hours, 1) || ' h.'
    );
    v_has_blocking := true;
  ELSIF NOT v_in_window THEN
    v_checks := v_checks || jsonb_build_object(
      'key', 'window',
      'label', 'Within max duration and opening hours',
      'passed', false,
      'message', 'That time is outside the opening hours for this resource.'
    );
    v_has_blocking := true;
  ELSE
    v_checks := v_checks || jsonb_build_object(
      'key', 'window',
      'label', 'Within max duration and opening hours',
      'passed', true,
      'message', round(v_duration_hours, 1) || ' h of ' || v_resource.max_hours || ' h max, inside opening hours.'
    );
  END IF;

  -- Check 7: Slot Free or Waitlist
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE resource_id = v_resource.id
      AND status IN ('approved', 'checked_out')
      AND slot && tstzrange(p_starts_at, p_ends_at, '[)')
  ) INTO v_slot_taken;

  IF v_slot_taken THEN
    -- Compute waitlist position & score
    SELECT count(*) INTO v_waitlist_pos
    FROM public.waitlist_entries
    WHERE resource_id = v_resource.id
      AND status = 'waiting'
      AND tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)');

    v_waitlist_pos := v_waitlist_pos + 1;

    SELECT count(*) INTO v_recent_bookings_count
    FROM public.bookings
    WHERE borrower_id = v_user.id
      AND status IN ('approved', 'checked_out', 'overdue', 'returned', 'completed')
      AND starts_at >= now() - interval '14 days';

    v_waitlist_score := 100.00 - (10.0 * v_recent_bookings_count) + (0.2 * v_user.reliability);

    v_checks := v_checks || jsonb_build_object(
      'key', 'slot',
      'label', 'Slot free',
      'passed', false,
      'kind', 'waitlist',
      'message', 'Someone already holds this slot. Join the waitlist, you would be #' || v_waitlist_pos || '.'
    );
  ELSE
    v_checks := v_checks || jsonb_build_object(
      'key', 'slot',
      'label', 'Slot free',
      'passed', true,
      'message', 'Nobody else holds this slot.'
    );
  END IF;

  -- Check 8: Approval & Supervision Information
  v_checks := v_checks || jsonb_build_object(
    'key', 'oversight',
    'label', CASE WHEN v_is_partner THEN 'Partner-college access' ELSE 'Approval and supervision' END,
    'passed', true,
    'kind', 'info',
    'message', CASE
      WHEN v_is_partner THEN 'Partner-college access: needs owner approval + supervision.'
      ELSE 'Heads-up: ' ||
           CASE WHEN v_resource.requires_approval THEN 'the lab in-charge approves each request' ELSE 'requests are auto-approved' END ||
           CASE WHEN v_resource.requires_supervision THEN ', and a supervisor must be present.' ELSE '.' END
    END
  );

  -- Final Outcome
  IF v_has_blocking THEN
    v_outcome := 'blocked';
  ELSIF v_slot_taken THEN
    v_outcome := 'waitlist';
  ELSE
    v_outcome := 'ready';
  END IF;

  RETURN jsonb_build_object(
    'checks', v_checks,
    'outcome', v_outcome,
    'waitlist', CASE WHEN v_outcome = 'waitlist' THEN jsonb_build_object(
      'position', v_waitlist_pos,
      'score', v_waitlist_score,
      'breakdown', jsonb_build_array(
        jsonb_build_object('label', 'Base', 'value', 100),
        jsonb_build_object('label', v_recent_bookings_count || ' booking(s) in last 14 days', 'value', -10 * v_recent_bookings_count),
        jsonb_build_object('label', 'Reliability ' || v_user.reliability, 'value', round(0.2 * v_user.reliability, 1)),
        jsonb_build_object('label', 'Time waiting', 'value', 0)
      )
    ) ELSE NULL END
  );
END;
$$;

-- 4. Request Booking RPC (Re-validates readiness server-side and checks caller identity)
CREATE OR REPLACE FUNCTION public.request_booking(
  p_resource_id UUID,
  p_borrower_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_purpose TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_readiness JSONB;
  v_outcome TEXT;
  v_resource public.resources%ROWTYPE;
  v_new_booking_id UUID;
  v_status public.booking_status;
  v_audit_id BIGINT;
BEGIN
  -- Security check: Must be authenticated and caller must match borrower ID
  IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Authentication required: anonymous callers cannot request bookings.';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != p_borrower_id THEN
    RAISE EXCEPTION 'Unauthorized: borrower ID must match the authenticated user.';
  END IF;

  IF p_purpose IS NULL OR trim(p_purpose) = '' THEN
    RAISE EXCEPTION 'A clear purpose is required to request a booking.';
  END IF;

  SELECT * INTO v_resource FROM public.resources WHERE id = p_resource_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;

  -- Re-run the readiness check server-side
  v_readiness := public.readiness_check(p_resource_id, p_borrower_id, p_starts_at, p_ends_at);
  v_outcome := v_readiness->>'outcome';

  IF v_outcome = 'blocked' THEN
    RAISE EXCEPTION 'Booking request failed readiness check on the server.';
  END IF;

  IF v_outcome = 'waitlist' THEN
    -- Insert into waitlist entries
    INSERT INTO public.waitlist_entries (
      resource_id, user_id, starts_at, ends_at, purpose, priority_score, position, status
    ) VALUES (
      p_resource_id,
      p_borrower_id,
      p_starts_at,
      p_ends_at,
      p_purpose,
      (v_readiness->'waitlist'->>'score')::numeric,
      (v_readiness->'waitlist'->>'position')::int,
      'waiting'
    ) RETURNING id INTO v_new_booking_id;

    -- Record in audit ledger
    v_audit_id := public.record_audit_event(
      p_borrower_id,
      'waitlist.joined',
      'waitlist_entry',
      v_new_booking_id,
      jsonb_build_object(
        'resource_id', p_resource_id,
        'position', (v_readiness->'waitlist'->>'position')::int,
        'score', (v_readiness->'waitlist'->>'score')::numeric
      )
    );

    RETURN jsonb_build_object(
      'id', v_new_booking_id,
      'status', 'waitlisted',
      'outcome', 'waitlist',
      'position', (v_readiness->'waitlist'->>'position')::int
    );
  END IF;

  -- If ready, determine whether auto-approved or requested
  IF v_resource.requires_approval THEN
    v_status := 'requested';
  ELSE
    v_status := 'approved';
  END IF;

  BEGIN
    INSERT INTO public.bookings (
      resource_id, borrower_id, starts_at, ends_at, purpose, status, decided_at
    ) VALUES (
      p_resource_id,
      p_borrower_id,
      p_starts_at,
      p_ends_at,
      p_purpose,
      v_status,
      CASE WHEN v_status = 'approved' THEN now() ELSE NULL END
    ) RETURNING id INTO v_new_booking_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Conflict: This slot was just booked by another user. Please choose another slot.';
  END;

  -- Audit event
  v_audit_id := public.record_audit_event(
    p_borrower_id,
    CASE WHEN v_status = 'approved' THEN 'booking.auto_approved' ELSE 'booking.requested' END,
    'booking',
    v_new_booking_id,
    jsonb_build_object(
      'resource_id', p_resource_id,
      'resource_name', v_resource.name,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at,
      'purpose', p_purpose
    )
  );

  -- Notify the owner
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (
    v_resource.owner_id,
    'New booking request',
    v_resource.name || ' requested for ' || to_char(p_starts_at, 'Mon DD, HH24:MI'),
    '/owner'
  );

  RETURN jsonb_build_object(
    'id', v_new_booking_id,
    'status', v_status,
    'outcome', 'ready'
  );
END;
$$;

-- 5. Owner Decision RPC (Approve or Reject with mandatory reason and concurrency guard)
CREATE OR REPLACE FUNCTION public.decide_booking(
  p_booking_id UUID,
  p_decided_by UUID,
  p_decision TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_resource public.resources%ROWTYPE;
  v_decider public.profiles%ROWTYPE;
  v_audit_id BIGINT;
BEGIN
  -- Security check: Must be authenticated and caller must match decider ID
  IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Authentication required: anonymous callers cannot decide bookings.';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != p_decided_by THEN
    RAISE EXCEPTION 'Unauthorized: decider ID must match the authenticated user.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  IF v_booking.status != 'requested' THEN
    RAISE EXCEPTION 'Booking is already %; only requested bookings can be decided.', v_booking.status;
  END IF;

  SELECT * INTO v_resource FROM public.resources WHERE id = v_booking.resource_id;
  SELECT * INTO v_decider FROM public.profiles WHERE id = p_decided_by;

  -- Role check: decider must be resource owner or manager or admin
  IF v_resource.owner_id != p_decided_by AND v_decider.role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only the resource owner or an admin/manager can decide this booking.';
  END IF;

  IF p_decision = 'rejected' THEN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
      RAISE EXCEPTION 'A clear written reason is mandatory when rejecting a booking.';
    END IF;

    UPDATE public.bookings
    SET status = 'rejected',
        decision_reason = p_reason,
        decided_by = p_decided_by,
        decided_at = now()
    WHERE id = p_booking_id;

    v_audit_id := public.record_audit_event(
      p_decided_by,
      'booking.rejected',
      'booking',
      p_booking_id,
      jsonb_build_object('reason', p_reason)
    );

    -- Notify borrower
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      v_booking.borrower_id,
      'Booking request rejected',
      'Your request for ' || v_resource.name || ' was rejected: ' || p_reason,
      '/bookings'
    );

    RETURN jsonb_build_object('id', p_booking_id, 'status', 'rejected');

  ELSIF p_decision = 'approved' THEN
    -- Check for conflict before approving
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE resource_id = v_booking.resource_id
        AND id != p_booking_id
        AND status IN ('approved', 'checked_out')
        AND slot && v_booking.slot
    ) THEN
      RAISE EXCEPTION 'Conflict: This slot is already approved for another borrower.';
    END IF;

    -- Concurrency guard: Exclusion constraint catches simultaneous approvals
    BEGIN
      UPDATE public.bookings
      SET status = 'approved',
          decision_reason = coalesce(p_reason, 'Approved by lab in-charge.'),
          decided_by = p_decided_by,
          decided_at = now()
      WHERE id = p_booking_id;
    EXCEPTION WHEN exclusion_violation THEN
      RAISE EXCEPTION 'Conflict: This slot was just approved for another borrower.';
    END;

    v_audit_id := public.record_audit_event(
      p_decided_by,
      'booking.approved',
      'booking',
      p_booking_id,
      jsonb_build_object('reason', p_reason)
    );

    -- Notify borrower
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      v_booking.borrower_id,
      'Booking request approved',
      'Your request for ' || v_resource.name || ' is approved!',
      '/bookings'
    );

    RETURN jsonb_build_object('id', p_booking_id, 'status', 'approved');

  ELSE
    RAISE EXCEPTION 'Invalid decision %. Must be approved or rejected.', p_decision;
  END IF;
END;
$$;

-- 6. Check-Out RPC with Condition Report and Caller Verification
CREATE OR REPLACE FUNCTION public.check_out(
  p_booking_id UUID,
  p_actor_id UUID,
  p_condition public.condition_grade,
  p_checklist JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL,
  p_photo_paths TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_resource public.resources%ROWTYPE;
  v_report_id UUID;
  v_audit_id BIGINT;
BEGIN
  -- Security check: Must be authenticated and caller must match actor ID
  IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Authentication required: anonymous callers cannot check out equipment.';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != p_actor_id THEN
    RAISE EXCEPTION 'Unauthorized: actor ID must match the authenticated user.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status != 'approved' THEN
    RAISE EXCEPTION 'Booking must be approved before check-out (current status: %)', v_booking.status;
  END IF;

  SELECT * INTO v_resource FROM public.resources WHERE id = v_booking.resource_id;

  -- Validate actor is borrower or owner
  IF p_actor_id != v_booking.borrower_id AND p_actor_id != v_resource.owner_id THEN
    RAISE EXCEPTION 'Unauthorized: only borrower or owner can check out equipment';
  END IF;

  -- Insert check_out condition report
  INSERT INTO public.condition_reports (
    booking_id, stage, condition, checklist, notes, photo_paths, author_id
  ) VALUES (
    p_booking_id, 'check_out', p_condition, p_checklist, p_notes, p_photo_paths, p_actor_id
  ) RETURNING id INTO v_report_id;

  -- Update booking status
  UPDATE public.bookings
  SET status = 'checked_out'
  WHERE id = p_booking_id;

  v_audit_id := public.record_audit_event(
    p_actor_id,
    'booking.checked_out',
    'booking',
    p_booking_id,
    jsonb_build_object(
      'condition_report_id', v_report_id,
      'condition', p_condition,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object('id', p_booking_id, 'status', 'checked_out', 'report_id', v_report_id);
END;
$$;

-- 7. Return Booking RPC with Condition Report and Auto-Incident Trigger
CREATE OR REPLACE FUNCTION public.return_booking(
  p_booking_id UUID,
  p_actor_id UUID,
  p_condition public.condition_grade,
  p_checklist JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL,
  p_photo_paths TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_resource public.resources%ROWTYPE;
  v_report_id UUID;
  v_audit_id BIGINT;
BEGIN
  -- Security check: Must be authenticated and caller must match actor ID
  IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Authentication required: anonymous callers cannot return equipment.';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != p_actor_id THEN
    RAISE EXCEPTION 'Unauthorized: actor ID must match the authenticated user.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status NOT IN ('checked_out', 'overdue') THEN
    RAISE EXCEPTION 'Only checked-out or overdue bookings can be returned (current status: %)', v_booking.status;
  END IF;

  SELECT * INTO v_resource FROM public.resources WHERE id = v_booking.resource_id;

  -- Validate actor
  IF p_actor_id != v_booking.borrower_id AND p_actor_id != v_resource.owner_id THEN
    RAISE EXCEPTION 'Unauthorized: only borrower or owner can return equipment';
  END IF;

  -- Insert return condition report
  INSERT INTO public.condition_reports (
    booking_id, stage, condition, checklist, notes, photo_paths, author_id
  ) VALUES (
    p_booking_id, 'return', p_condition, p_checklist, p_notes, p_photo_paths, p_actor_id
  ) RETURNING id INTO v_report_id;

  -- If condition is damaged, automatically create an incident for manager review
  IF p_condition = 'damaged' THEN
    INSERT INTO public.incidents (
      booking_id, type, description, reported_by, ai_summary, status
    ) VALUES (
      p_booking_id,
      'damage',
      coalesce(p_notes, 'Equipment returned with damage reported.'),
      p_actor_id,
      'Damage flagged during return handover: ' || coalesce(p_notes, 'Check condition report details'),
      'open'
    );
  END IF;

  -- Update booking status to returned
  UPDATE public.bookings
  SET status = 'returned'
  WHERE id = p_booking_id;

  v_audit_id := public.record_audit_event(
    p_actor_id,
    'booking.returned',
    'booking',
    p_booking_id,
    jsonb_build_object(
      'condition_report_id', v_report_id,
      'condition', p_condition,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object('id', p_booking_id, 'status', 'returned', 'report_id', v_report_id);
END;
$$;

-- 8. Explicit Function Execution Grants & Revocations
-- Revoke all default PUBLIC permissions
REVOKE ALL ON FUNCTION public.record_audit_event FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_ledger FROM PUBLIC;
REVOKE ALL ON FUNCTION public.readiness_check FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_booking FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_booking FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_out FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_booking FROM PUBLIC;

-- Grant EXECUTE to anon and authenticated roles so PostgREST exposes endpoints in the schema cache.
-- Internal security checks (auth.uid() = actor/borrower) enforce authentication & authorization.
GRANT EXECUTE ON FUNCTION public.readiness_check TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_out TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.return_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ledger TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- START COMPONENT: supabase/migrations/20261030000003_rls_policies.sql
-- ============================================================================

-- Migration 003: Row Level Security (RLS) Policies
-- Enforces zero-trust database security. Never trusts client headers or cookies.
-- Idempotent & safely rerunnable using DROP POLICY IF EXISTS before each definition.

-- Enable RLS across all tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Helper to check if current auth user has a specific role (Hardened with pg_catalog first)
CREATE OR REPLACE FUNCTION public.auth_user_has_role(VARIADIC allowed_roles public.user_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_has_role FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_has_role TO authenticated;

-- 1. Institutions: Public read
DROP POLICY IF EXISTS "Institutions viewable by all" ON public.institutions;
CREATE POLICY "Institutions viewable by all"
  ON public.institutions FOR SELECT
  USING (true);

-- 2. Profiles: Authenticated read; self-update
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Badges & Resource Badges: Public read
DROP POLICY IF EXISTS "Badges viewable by all" ON public.badges;
CREATE POLICY "Badges viewable by all"
  ON public.badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "User badges viewable by authenticated users" ON public.user_badges;
CREATE POLICY "User badges viewable by authenticated users"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Resource badges viewable by all" ON public.resource_badges;
CREATE POLICY "Resource badges viewable by all"
  ON public.resource_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Availability windows viewable by all" ON public.availability_windows;
CREATE POLICY "Availability windows viewable by all"
  ON public.availability_windows FOR SELECT
  USING (true);

-- 4. Resources: Public read based on partner/campus visibility
DROP POLICY IF EXISTS "Resources viewable by all" ON public.resources;
CREATE POLICY "Resources viewable by all"
  ON public.resources FOR SELECT
  USING (
    visibility = 'campus'
    OR visibility = 'partner'
    OR (
      -- Department visibility: only if logged in from same department
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.department = (
          SELECT owner.department FROM public.profiles owner WHERE owner.id = resources.owner_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owners can manage own resources" ON public.resources;
CREATE POLICY "Owners can manage own resources"
  ON public.resources FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR public.auth_user_has_role('admin'))
  WITH CHECK (owner_id = auth.uid() OR public.auth_user_has_role('admin'));

-- 5. Bookings:
-- Anonymous schedule inspection for calendar busy slots
DROP POLICY IF EXISTS "Public can view slot schedule for approved bookings" ON public.bookings;
CREATE POLICY "Public can view slot schedule for approved bookings"
  ON public.bookings FOR SELECT
  TO anon
  USING (status IN ('approved', 'checked_out'));

-- Security Hardening: Revoke full table SELECT from anon on bookings, grant only schedule columns
REVOKE SELECT ON public.bookings FROM anon;
GRANT SELECT (id, resource_id, starts_at, ends_at, status) ON public.bookings TO anon;

-- Authenticated parties view
DROP POLICY IF EXISTS "Bookings viewable by parties, owner and managers" ON public.bookings;
CREATE POLICY "Bookings viewable by parties, owner and managers"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    borrower_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = bookings.resource_id AND r.owner_id = auth.uid()
    )
    OR public.auth_user_has_role('manager', 'admin')
  );

-- Direct inserts/updates are restricted to security definer functions,
-- but allow borrowers to insert requested bookings if using direct client:
DROP POLICY IF EXISTS "Borrowers can create booking requests" ON public.bookings;
CREATE POLICY "Borrowers can create booking requests"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (borrower_id = auth.uid());

-- 6. Condition Reports: Append-only
DROP POLICY IF EXISTS "Condition reports viewable by parties and managers" ON public.condition_reports;
CREATE POLICY "Condition reports viewable by parties and managers"
  ON public.condition_reports FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.resources r ON r.id = b.resource_id
      WHERE b.id = condition_reports.booking_id
        AND (b.borrower_id = auth.uid() OR r.owner_id = auth.uid())
    )
    OR public.auth_user_has_role('manager', 'admin')
  );

DROP POLICY IF EXISTS "Authorized parties can insert condition report" ON public.condition_reports;
CREATE POLICY "Authorized parties can insert condition report"
  ON public.condition_reports FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Prevent UPDATE and DELETE on condition reports (append-only)
-- (No policies created for UPDATE / DELETE means they are blocked by default)

-- 7. Waitlist Entries
DROP POLICY IF EXISTS "Users can view own waitlist entries or owner can view" ON public.waitlist_entries;
CREATE POLICY "Users can view own waitlist entries or owner can view"
  ON public.waitlist_entries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = waitlist_entries.resource_id AND r.owner_id = auth.uid()
    )
    OR public.auth_user_has_role('manager', 'admin')
  );

-- 8. Incidents
DROP POLICY IF EXISTS "Incidents viewable by reporter, owner, manager, admin" ON public.incidents;
CREATE POLICY "Incidents viewable by reporter, owner, manager, admin"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    reported_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.resources r ON r.id = b.resource_id
      WHERE b.id = incidents.booking_id AND r.owner_id = auth.uid()
    )
    OR public.auth_user_has_role('manager', 'admin')
  );

DROP POLICY IF EXISTS "Managers can resolve incidents" ON public.incidents;
CREATE POLICY "Managers can resolve incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (public.auth_user_has_role('manager', 'admin'))
  WITH CHECK (public.auth_user_has_role('manager', 'admin'));

-- 9. Notifications
DROP POLICY IF EXISTS "Users can view and update own notifications" ON public.notifications;
CREATE POLICY "Users can view and update own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. Audit Events: Admin and Manager read-only. No updates/deletes permitted.
DROP POLICY IF EXISTS "Audit events readable only by admin and manager" ON public.audit_events;
CREATE POLICY "Audit events readable only by admin and manager"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (public.auth_user_has_role('admin', 'manager'));


-- ============================================================================
-- START COMPONENT: supabase/seed.sql
-- ============================================================================

-- Seed Data for Saajha Campus Resource Platform
-- Uses fictional demo entities matching CLAUDE.md §10 and src/lib/mock.ts
-- DO NOT PUT SENSITIVE DATA OR SERVICE ROLE KEYS HERE.

-- 1. Institutions
INSERT INTO public.institutions (id, name, short_code) VALUES
  ('00000000-0000-4000-a000-000000000001', 'NIT Warangal', 'NITW'),
  ('00000000-0000-4000-a000-000000000002', 'Kakatiya Institute (demo)', 'KITSW')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_code = EXCLUDED.short_code;

-- 2. Profiles
INSERT INTO public.profiles (id, full_name, email, role, institution_id, department, roll_no, verified, weekly_credits, reliability) VALUES
  ('00000000-0000-4000-a000-000000000101', 'Aarav Reddy', 'student@saajha.demo', 'student', '00000000-0000-4000-a000-000000000001', 'ECE', '22ECB0F14', true, 8, 96),
  ('00000000-0000-4000-a000-000000000102', 'Diya Sharma', 'student2@saajha.demo', 'student', '00000000-0000-4000-a000-000000000001', 'Mechanical', '23MEB0A27', true, 6, 92),
  ('00000000-0000-4000-a000-000000000103', 'Karthik Rao', 'partner@saajha.demo', 'student', '00000000-0000-4000-a000-000000000002', 'EEE', 'K22EE031', true, 6, 100),
  ('00000000-0000-4000-a000-000000000104', 'Dr. Lakshmi Narayana', 'owner@saajha.demo', 'owner', '00000000-0000-4000-a000-000000000001', 'ECE · Instrumentation & Media Lab', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000105', 'Prof. Suresh Babu', 'manager@saajha.demo', 'manager', '00000000-0000-4000-a000-000000000001', 'Dean (Academic) Office', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000106', 'Neha Kulkarni', 'admin@saajha.demo', 'admin', '00000000-0000-4000-a000-000000000001', 'Saajha Admin', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000107', 'Ravi Teja', 'makerspace@saajha.demo', 'owner', '00000000-0000-4000-a000-000000000001', 'Makerspace (Mechanical)', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000108', 'Anitha G.', 'spaces@saajha.demo', 'owner', '00000000-0000-4000-a000-000000000001', 'Academic Section · Rooms', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000109', 'Meera Iyer', 'meera@saajha.demo', 'student', '00000000-0000-4000-a000-000000000001', 'Civil', '22CEB0B09', true, 10, 100)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, email = EXCLUDED.email;

-- 3. Badges
INSERT INTO public.badges (id, code, name, description) VALUES
  ('00000000-0000-4000-a000-000000000201', 'LAB_SAFETY_1', 'Lab Safety Level 1', 'General lab safety induction: PPE, fire exits, ESD and first aid.'),
  ('00000000-0000-4000-a000-000000000202', 'PRINTER_3D', '3D Printer Trained', 'Hands-on Makerspace session on slicing, bed levelling and filament changes.'),
  ('00000000-0000-4000-a000-000000000203', 'SCOPE_BASIC', 'Oscilloscope Basics', 'Probe compensation, triggering and safe measurement on bench scopes.')
ON CONFLICT (id) DO NOTHING;

-- 4. User Badges
INSERT INTO public.user_badges (user_id, badge_id, issued_by, issued_at, status) VALUES
  -- Student (Aarav has all 3)
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000105', now() - interval '60 days', 'active'),
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000202', '00000000-0000-4000-a000-000000000105', now() - interval '60 days', 'active'),
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000203', '00000000-0000-4000-a000-000000000105', now() - interval '60 days', 'active'),
  -- Student 2 (Diya has safety active, 3D printer pending)
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000105', now() - interval '40 days', 'active'),
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000202', NULL, NULL, 'pending'),
  -- Partner (Karthik has scope)
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000203', '00000000-0000-4000-a000-000000000105', now() - interval '30 days', 'active')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- 5. Resources
INSERT INTO public.resources (id, owner_id, name, category, description, location, requires_approval, requires_supervision, max_hours, credit_cost, cooldown_hours, usage_rules, visibility, status) VALUES
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000107', 'Prusa MK4 3D Printer', 'fabrication', 'FDM printer with a 25 × 21 × 22 cm build volume. PLA and PETG stocked; bring your own sliced G-code on a USB stick.', 'Makerspace, Mechanical Block, Room 104', true, true, 4, 3, 24, E'A Makerspace volunteer must be present for the first layer.\nPLA and PETG only, no ABS (ventilation).\nRemove your print and clean the bed before you leave.\nPrints over 4 hours need a separate overnight request.', 'campus', 'active'),
  ('00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000104', 'Rigol DS1054Z Oscilloscope', 'test_measurement', '4-channel, 50 MHz digital storage oscilloscope with two passive probes. Good for embedded and power-electronics projects.', 'ECE Instrumentation Lab, Room 211', true, false, 3, 2, 0, E'Use only the probes in the case and return them coiled.\nNo mains-voltage measurements without supervision.\nLog your session in the bench register.', 'partner', 'active'),
  ('00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000104', 'Canon EOS 90D DSLR Kit', 'media', 'Body with 18–135 mm lens, two batteries, a 64 GB card and a tripod. Popular for club events and project videos.', 'Media Lab, Library Annexe, Room 12', true, false, 4, 2, 24, E'Charge both batteries before returning.\nFormat the card only after copying your files.\nNo use in rain or near the swimming pool.\nReport any lens scratch immediately, however small.', 'campus', 'active'),
  ('00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000104', 'Raspberry Pi 5 Kit', 'test_measurement', 'Pi 5 (8 GB) with case, 27 W supply, 64 GB microSD with Raspberry Pi OS, HDMI cable and a breadboard starter set.', 'ECE Instrumentation Lab, Room 211', false, false, 4, 1, 0, E'Don''t re-flash the card; use your own microSD for custom images.\nReturn all GPIO jumper wires in the bag.', 'partner', 'active'),
  ('00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000108', 'Seminar Hall B', 'space', '120-seat hall with a projector, two wireless mics and a podium. Good for club talks and project demos.', 'Academic Block 2, Ground Floor', true, false, 3, 4, 0, E'Faculty coordinator''s name required in the purpose.\nNo food inside the hall.\nSwitch off the AC and projector when you leave.', 'partner', 'active'),
  ('00000000-0000-4000-a000-000000000306', '00000000-0000-4000-a000-000000000108', 'Project Room 2', 'space', 'Quiet 8-seat room with a whiteboard and a 55" display. Great for team stand-ups and hackathon nights.', 'Library, 2nd Floor', false, false, 4, 1, 0, E'Leave the whiteboard clean.\nMax 8 people.', 'campus', 'active'),
  ('00000000-0000-4000-a000-000000000307', '00000000-0000-4000-a000-000000000107', 'Soldering Station (Hakko FX-888D)', 'fabrication', 'Temperature-controlled station with fume extractor, helping hands and lead-free solder.', 'Makerspace, Mechanical Block, Room 104', true, false, 2, 1, 0, E'Fume extractor on at all times.\nNever leave the iron unattended while hot.\nSafety glasses required.', 'department', 'active'),
  ('00000000-0000-4000-a000-000000000308', '00000000-0000-4000-a000-000000000104', 'Epson Portable Projector', 'media', '3,600-lumen projector with HDMI and USB-C, in a carry bag with a 5 m HDMI cable.', 'Media Lab, Library Annexe, Room 12', false, false, 4, 1, 0, E'Let the lamp cool for 5 minutes before packing.', 'campus', 'maintenance')
ON CONFLICT (id) DO NOTHING;

-- 6. Resource Badges
INSERT INTO public.resource_badges (resource_id, badge_id) VALUES
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000202'), -- 3D printer needs PRINTER_3D
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000201'), -- 3D printer needs LAB_SAFETY_1
  ('00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203'), -- Scope needs SCOPE_BASIC
  ('00000000-0000-4000-a000-000000000307', '00000000-0000-4000-a000-000000000201')  -- Soldering needs LAB_SAFETY_1
ON CONFLICT (resource_id, badge_id) DO NOTHING;

-- 7. Availability Windows (Mon-Sat 09:00 - 18:00 default)
INSERT INTO public.availability_windows (resource_id, weekday, start_time, end_time)
SELECT r.id, w.day, '09:00'::time, '18:00'::time
FROM public.resources r
CROSS JOIN generate_series(1, 6) AS w(day)
WHERE NOT EXISTS (
  SELECT 1 FROM public.availability_windows aw
  WHERE aw.resource_id = r.id
    AND aw.weekday = w.day
    AND aw.start_time = '09:00'::time
    AND aw.end_time = '18:00'::time
);

-- 8. Notifications
INSERT INTO public.notifications (id, user_id, title, body, link, read) VALUES
  ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-a000-000000000101', 'Welcome to Saajha', 'Discover lab equipment and verify your access-readiness.', '/explore', false),
  ('00000000-0000-4000-a000-000000000902', '00000000-0000-4000-a000-000000000104', 'Lab in-charge console active', 'Review requests and confirm condition handovers.', '/owner', false)
ON CONFLICT (id) DO NOTHING;



-- ============================================================================
-- START COMPONENT: supabase/create_auth_users.sql
-- ============================================================================

-- Optional Helper: Create Supabase Auth Users for Saajha Demo Accounts
-- Run this in the Supabase Dashboard SQL Editor to allow email/password logins with Demo@1234
-- Note: This is idempotent and can be safely executed multiple times without affecting real users.

DO $$
DECLARE
  v_users JSONB := '[
    {"id": "00000000-0000-4000-a000-000000000101", "email": "student@saajha.org", "role": "student"},
    {"id": "00000000-0000-4000-a000-000000000102", "email": "student2@saajha.org", "role": "student"},
    {"id": "00000000-0000-4000-a000-000000000103", "email": "partner@saajha.org", "role": "student"},
    {"id": "00000000-0000-4000-a000-000000000104", "email": "owner@saajha.org", "role": "owner"},
    {"id": "00000000-0000-4000-a000-000000000105", "email": "manager@saajha.org", "role": "manager"},
    {"id": "00000000-0000-4000-a000-000000000106", "email": "admin@saajha.org", "role": "admin"}
  ]'::jsonb;
  u JSONB;
  v_pw_hash TEXT;
BEGIN
  -- Resolve pgcrypto crypt safely whether installed in 'extensions' or 'public'
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'crypt' AND n.nspname = 'extensions') THEN
    v_pw_hash := extensions.crypt('Demo@1234', extensions.gen_salt('bf'));
  ELSE
    v_pw_hash := public.crypt('Demo@1234', public.gen_salt('bf'));
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    -- Only insert if neither the email nor the ID exists in auth.users
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE email = u->>'email' OR id = (u->>'id')::uuid
    ) THEN
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        (u->>'id')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        u->>'email',
        v_pw_hash,
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('role', u->>'role'),
        now(),
        now()
      );
    END IF;

    -- Ensure account is confirmed and has demo password
    UPDATE auth.users
    SET email_confirmed_at = coalesce(email_confirmed_at, now()),
        encrypted_password = v_pw_hash
    WHERE id = (u->>'id')::uuid OR email = u->>'email';

    -- Add matching identity for Supabase Auth email provider if missing
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = (u->>'id')::uuid OR (provider = 'email' AND identity_data->>'email' = u->>'email')
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        (u->>'id')::uuid,
        (u->>'id')::uuid,
        jsonb_build_object('sub', u->>'id', 'email', u->>'email'),
        'email',
        u->>'id',
        now(),
        now(),
        now()
      );
    END IF;
  END LOOP;
END $$;
