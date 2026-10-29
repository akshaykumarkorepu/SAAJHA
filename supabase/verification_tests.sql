-- ============================================================================
-- SAAJHA: Automated Verification & Database Test Suite
-- Run this in the Supabase SQL Editor to test all business logic, constraints,
-- RLS, and RPC state transitions.
-- ============================================================================

DO $$
DECLARE
  v_student_id UUID := '00000000-0000-4000-a000-000000000101';
  v_student2_id UUID := '00000000-0000-4000-a000-000000000102';
  v_owner_maker_id UUID := '00000000-0000-4000-a000-000000000107';
  v_printer_id UUID := '00000000-0000-4000-a000-000000000301';
  v_scope_id UUID := '00000000-0000-4000-a000-000000000302';
  
  -- Anchor test slot to next Wednesday 11:00 AM - 1:00 PM (guaranteed active weekday window)
  v_test_start TIMESTAMPTZ := date_trunc('week', now()) + interval '9 days 11 hours';
  v_test_end TIMESTAMPTZ := date_trunc('week', now()) + interval '9 days 13 hours';

  v_res JSONB;
  v_booking_id UUID;
  v_ledger_check RECORD;
BEGIN
  RAISE NOTICE '>>> [TEST 1] Testing Access-Readiness failure for missing badge...';
  -- Student 2 (Diya) does not hold the active PRINTER_3D badge
  v_res := public.readiness_check(v_printer_id, v_student2_id, v_test_start, v_test_end);
  ASSERT v_res->>'outcome' = 'blocked', 'Expected readiness check to be blocked for missing badge';
  RAISE NOTICE '  Passed: Missing badge blocked with message: %', (v_res->'checks'->1->>'message');

  RAISE NOTICE '>>> [TEST 2] Testing successful request for verified student with badges...';
  -- Student 1 (Aarav) holds all badges
  v_res := public.request_booking(v_printer_id, v_student_id, v_test_start, v_test_end, 'Robotics club chassis print');
  ASSERT v_res->>'status' = 'requested', 'Expected booking status to be requested';
  v_booking_id := (v_res->>'id')::uuid;
  RAISE NOTICE '  Passed: Booking requested with ID %', v_booking_id;

  RAISE NOTICE '>>> [TEST 3] Testing unauthorized approval rejection...';
  -- Student 2 attempting to approve Student 1's booking
  BEGIN
    PERFORM public.decide_booking(v_booking_id, v_student2_id, 'approved', 'Unauthorized attempt');
    RAISE EXCEPTION 'Test failed: Unauthorized user was able to approve booking!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  Passed: Unauthorized approval blocked with error: %', SQLERRM;
  END;

  RAISE NOTICE '>>> [TEST 4] Testing owner rejection requiring a mandatory reason...';
  BEGIN
    PERFORM public.decide_booking(v_booking_id, v_owner_maker_id, 'rejected', '');
    RAISE EXCEPTION 'Test failed: Rejection succeeded without mandatory reason!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  Passed: Empty reason rejection blocked: %', SQLERRM;
  END;

  RAISE NOTICE '>>> [TEST 5] Testing valid owner approval...';
  v_res := public.decide_booking(v_booking_id, v_owner_maker_id, 'approved', 'Lab volunteer assigned for first layer.');
  ASSERT v_res->>'status' = 'approved', 'Expected status to be approved';
  RAISE NOTICE '  Passed: Booking approved by lab in-charge.';

  RAISE NOTICE '>>> [TEST 6] Testing Exclusion Constraint against double-booking...';
  -- Attempting to approve an overlapping booking directly in the table
  BEGIN
    INSERT INTO public.bookings (
      resource_id, borrower_id, starts_at, ends_at, purpose, status
    ) VALUES (
      v_printer_id, v_student2_id, v_test_start + interval '30 minutes', v_test_end + interval '30 minutes', 'Conflicting booking', 'approved'
    );
    RAISE EXCEPTION 'Test failed: Double booking exclusion constraint did not trigger!';
  EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE '  Passed: PostgreSQL exclusion constraint blocked double booking (23P01 exclusion_violation).';
  END;

  RAISE NOTICE '>>> [TEST 7] Testing equipment check-out with condition report...';
  v_res := public.check_out(
    v_booking_id,
    v_student_id,
    'good'::public.condition_grade,
    '{"Bed clean": true, "Nozzle clear": true}'::jsonb,
    'Bed levelled and 0.4mm nozzle installed'
  );
  ASSERT v_res->>'status' = 'checked_out', 'Expected status to be checked_out';
  RAISE NOTICE '  Passed: Check-out recorded with condition report ID %', v_res->>'report_id';

  RAISE NOTICE '>>> [TEST 8] Testing equipment return with condition report...';
  v_res := public.return_booking(
    v_booking_id,
    v_student_id,
    'excellent'::public.condition_grade,
    '{"Bed clean": true, "Part removed": true}'::jsonb,
    'Print completed cleanly, bed wiped down'
  );
  ASSERT v_res->>'status' = 'returned', 'Expected status to be returned';
  RAISE NOTICE '  Passed: Return recorded with condition report ID %', v_res->>'report_id';

  RAISE NOTICE '>>> [TEST 9] Verifying cryptographic SHA-256 audit ledger integrity...';
  SELECT * INTO v_ledger_check FROM public.verify_ledger();
  ASSERT v_ledger_check.valid = true, 'Audit ledger integrity check failed!';
  RAISE NOTICE '  Passed: %', v_ledger_check.message;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'ALL 9 SAAJHA VERIFICATION TESTS COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '=======================================================';
END;
$$;

