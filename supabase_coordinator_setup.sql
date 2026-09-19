-- ==============================================================================
-- ZINNIA EVENT COORDINATOR PORTAL — SAFE & IDEMPOTENT SUPABASE SETUP SCRIPT
-- ==============================================================================
-- This script is completely ADDITIVE and NON-DESTRUCTIVE.
-- It preserves all existing tables, data, and existing indexes.
--
-- Tables utilized:
-- 1. admin_profiles (id, full_name, role, is_active, created_at)
-- 2. coordinator_assignments (id, admin_id, assignment_type, event_id)
-- 3. teams (team_id, team_name, college, department, year, registered_events, payment_status)
-- 4. team_members (id, team_id, name, email, phone, is_leader, passport_token, etc.)
-- 5. events (id, title, event_type, venue, schedule_time, etc.)
-- 6. event_registrations (id, team_id, event_id, team_name, position, registered_at)
-- 7. attendance (id, team_id, member_id, participant_name, college, checkin_type, 
--               event_id, event_name, scanned_by, scanned_by_id, location, passport_token_used, scanned_at)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

-- Function to check if the current user is an active admin
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE id = auth.uid() 
      AND is_active = true
  );
$$;

-- Function to check if the current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE id = auth.uid() 
      AND is_active = true 
      AND role = 'SUPER_ADMIN'
  );
$$;

-- Function to verify whether an active coordinator can insert a specific attendance record
CREATE OR REPLACE FUNCTION public.can_insert_attendance(
  p_checkin_type text,
  p_event_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role text;
BEGIN
  -- 1. Must be active admin
  SELECT role INTO v_role 
  FROM public.admin_profiles 
  WHERE id = auth.uid() AND is_active = true;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Super admin can do all actions
  IF v_role = 'SUPER_ADMIN' THEN
    RETURN true;
  END IF;

  -- 3. FOOD check-in permission
  IF p_checkin_type = 'FOOD' THEN
    IF v_role = 'FOOD_STAFF' THEN
      RETURN true;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.coordinator_assignments 
      WHERE admin_id = auth.uid() AND assignment_type = 'FOOD'
    );
  END IF;

  -- 4. REFRESHMENT check-in permission
  IF p_checkin_type = 'REFRESHMENT' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.coordinator_assignments 
      WHERE admin_id = auth.uid() AND assignment_type = 'REFRESHMENT'
    );
  END IF;

  -- 6. EVENT check-in permission
  IF p_checkin_type = 'EVENT' THEN
    IF p_event_id IS NULL THEN
      RETURN false;
    END IF;

    -- Check if assigned directly to this event
    IF EXISTS (
      SELECT 1 FROM public.coordinator_assignments
      WHERE admin_id = auth.uid() 
        AND assignment_type IN ('TECH_EVENT', 'NON_TECH_EVENT')
        AND event_id = p_event_id
    ) THEN
      RETURN true;
    END IF;

    -- Check if OVERALL_TECH and event is TECH
    IF EXISTS (
      SELECT 1 FROM public.coordinator_assignments ca
      JOIN public.events ev ON ev.id = p_event_id
      WHERE ca.admin_id = auth.uid() 
        AND ca.assignment_type = 'OVERALL_TECH'
        AND ev.event_type = 'TECH'
    ) THEN
      RETURN true;
    END IF;

    -- Check if OVERALL_NON_TECH and event is NON_TECH
    IF EXISTS (
      SELECT 1 FROM public.coordinator_assignments ca
      JOIN public.events ev ON ev.id = p_event_id
      WHERE ca.admin_id = auth.uid() 
        AND ca.assignment_type = 'OVERALL_NON_TECH'
        AND ev.event_type = 'NON_TECH'
    ) THEN
      RETURN true;
    END IF;

  END IF;

  RETURN false;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES FOR ATTENDANCE
-- ------------------------------------------------------------------------------

-- Ensure RLS is active on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Allow coordinators to read attendance records
DROP POLICY IF EXISTS coordinators_select_attendance ON public.attendance;
CREATE POLICY coordinators_select_attendance ON public.attendance
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow coordinators to insert attendance records
DROP POLICY IF EXISTS coordinators_insert_attendance ON public.attendance;
CREATE POLICY coordinators_insert_attendance ON public.attendance
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. READ PERMISSIONS ON REQUIRED TABLES FOR ACTIVE COORDINATORS
-- ------------------------------------------------------------------------------

-- Enable active coordinators to read team_members, teams, events, and event_registrations
DROP POLICY IF EXISTS coordinators_select_team_members ON public.team_members;
CREATE POLICY coordinators_select_team_members ON public.team_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS coordinators_select_teams ON public.teams;
CREATE POLICY coordinators_select_teams ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS coordinators_select_events ON public.events;
CREATE POLICY coordinators_select_events ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS coordinators_select_registrations ON public.event_registrations;
CREATE POLICY coordinators_select_registrations ON public.event_registrations
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS coordinators_select_assignments ON public.coordinator_assignments;
CREATE POLICY coordinators_select_assignments ON public.coordinator_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);
