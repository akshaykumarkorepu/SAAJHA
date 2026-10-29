-- ============================================================================
-- SAAJHA: Safe Database Reset & Recovery Script
-- Project: vpggwcgfvxviumbjelbs
-- Run this in the Supabase Dashboard SQL Editor if you ever need to recover
-- from a partially applied state or completely reset application tables.
-- Does NOT touch system schemas, Supabase extensions, or platform users.
-- ============================================================================

-- 1. Drop Application Tables (Cascade drops constraints & triggers)
DROP TABLE IF EXISTS public.audit_events CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.condition_reports CASCADE;
DROP TABLE IF EXISTS public.waitlist_entries CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.availability_windows CASCADE;
DROP TABLE IF EXISTS public.resource_badges CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;

-- 2. Drop RPC Functions
DROP FUNCTION IF EXISTS public.auth_user_has_role(public.user_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.record_audit_event(UUID, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.verify_ledger() CASCADE;
DROP FUNCTION IF EXISTS public.readiness_check(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.request_booking(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.decide_booking(UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_out(UUID, UUID, public.condition_grade, JSONB, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS public.return_booking(UUID, UUID, public.condition_grade, JSONB, TEXT, TEXT[]) CASCADE;

-- 3. Clean up Demo Auth Users & Identities (IDs matching CLAUDE.md seed)
DELETE FROM auth.identities WHERE user_id IN (
  '00000000-0000-4000-a000-000000000101',
  '00000000-0000-4000-a000-000000000102',
  '00000000-0000-4000-a000-000000000103',
  '00000000-0000-4000-a000-000000000104',
  '00000000-0000-4000-a000-000000000105',
  '00000000-0000-4000-a000-000000000106'
);
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-4000-a000-000000000101',
  '00000000-0000-4000-a000-000000000102',
  '00000000-0000-4000-a000-000000000103',
  '00000000-0000-4000-a000-000000000104',
  '00000000-0000-4000-a000-000000000105',
  '00000000-0000-4000-a000-000000000106'
);
