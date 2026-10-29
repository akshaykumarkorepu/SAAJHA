-- Migration 002: Core RPC Functions, Booking Lifecycle, and Audit Ledger
-- Enforces business logic inside the database with security definer functions
-- Hardened with SET search_path = pg_catalog, public, extensions, pg_temp and strict auth.uid() checks

-- 0. Compatibility wrappers: Route public.digest to extensions.digest across bytea/text signatures
CREATE OR REPLACE FUNCTION public.digest(data bytea, type text)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, extensions, public, pg_temp
AS $$
  SELECT extensions.digest(data, type);
$$;

CREATE OR REPLACE FUNCTION public.digest(data text, type text)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, extensions, public, pg_temp
AS $$
  SELECT extensions.digest(convert_to(data, 'UTF8'), type);
$$;

-- 0.1 Helper to check if current auth user has a specific role (Required by readiness_check & RLS)
CREATE OR REPLACE FUNCTION public.auth_user_has_role(VARIADIC allowed_roles public.user_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
    digest(
      convert_to(
        v_prev_hash ||
        coalesce(v_effective_actor::text, '00000000-0000-0000-0000-000000000000') ||
        p_action ||
        p_entity_type ||
        p_entity_id::text ||
        p_details::text ||
        v_created_at::text,
        'UTF8'
      ),
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
      digest(
        convert_to(
          rec.prev_hash ||
          coalesce(rec.actor_id::text, '00000000-0000-0000-0000-000000000000') ||
          rec.action ||
          rec.entity_type ||
          rec.entity_id::text ||
          rec.details::text ||
          rec.created_at::text,
          'UTF8'
        ),
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
SET search_path = pg_catalog, public, extensions, pg_temp
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
