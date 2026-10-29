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
