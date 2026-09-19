-- ==============================================================================
-- FIX SUPABASE RLS PERMISSIONS & SEED EVENTS FOR ZINNIA COORDINATOR PORTAL
-- ==============================================================================
-- Run this script in your Supabase Project -> SQL Editor -> Run
--
-- Why is this needed?
-- 1. Coordinators log in via Roll Number & Password from the `coordinators` table.
-- 2. Because coordinator logins use the portal client, Supabase queries run as `anon`.
-- 3. Strict RLS policies that were restricted `TO authenticated` blocked `events`,
--    `attendance`, and `event_registrations` from returning data to the coordinator portal.
-- 4. This script unlocks read & write access for coordinators, while inserting all
--    the official Tech & Non-Tech events matching your registered teams.
-- ==============================================================================

-- 1. UNLOCK EVENTS TABLE PERMISSIONS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coordinators_select_events ON public.events;
DROP POLICY IF EXISTS events_read_policy ON public.events;

CREATE POLICY events_read_policy ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. UNLOCK ATTENDANCE TABLE PERMISSIONS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coordinators_select_attendance ON public.attendance;
DROP POLICY IF EXISTS attendance_read_policy ON public.attendance;

CREATE POLICY attendance_read_policy ON public.attendance
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS coordinators_insert_attendance ON public.attendance;
DROP POLICY IF EXISTS attendance_insert_policy ON public.attendance;

CREATE POLICY attendance_insert_policy ON public.attendance
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. UNLOCK EVENT REGISTRATIONS TABLE PERMISSIONS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coordinators_select_registrations ON public.event_registrations;
DROP POLICY IF EXISTS registrations_read_policy ON public.event_registrations;

CREATE POLICY registrations_read_policy ON public.event_registrations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. UNLOCK TEAMS AND TEAM MEMBERS PERMISSIONS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coordinators_select_teams ON public.teams;
DROP POLICY IF EXISTS teams_read_policy ON public.teams;
CREATE POLICY teams_read_policy ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coordinators_select_team_members ON public.team_members;
DROP POLICY IF EXISTS team_members_read_policy ON public.team_members;
CREATE POLICY team_members_read_policy ON public.team_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. SEED / ENSURE ALL 9 OFFICIAL ZINNIA 2026 EVENTS
INSERT INTO public.events (
  id, code, mission_name, title, event_type, category, clearance_level, 
  team_size_min, team_size_max, is_single_event_only, schedule_time, duration, 
  venue, description, rules, status, results_finalized, results_finalized_at, 
  coordinators, registration_fee
)
VALUES
  -- 5 TECH EVENTS
  ('debugging', '01', 'DEBUGGING', 'Debugging', 'TECH', 'TECHNICAL', 'ALL', 1, 2, false, '10:00 AM - 11:30 AM', '90 Mins', 'CSE Lab 1', 'Code debugging challenge', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('the-last-signal', '02', 'THE LAST SIGNAL', 'The Last Signal', 'TECH', 'TECHNICAL', 'ALL', 1, 2, false, '11:30 AM - 01:00 PM', '90 Mins', 'CSE Seminar Hall', 'Cryptic network signal tracing', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('lost-at-sql', '03', 'LOST AT SQL', 'Lost at SQL', 'TECH', 'TECHNICAL', 'ALL', 1, 2, false, '10:00 AM - 11:30 AM', '90 Mins', 'CSE Lab 2', 'Relational DB puzzle solving', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('gadget-codes', '04', 'GADGET CODES', 'Gadget Codes', 'TECH', 'TECHNICAL', 'ALL', 1, 2, false, '02:00 PM - 03:30 PM', '90 Mins', 'IoT Center', 'Hardware programming and circuit hacking', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('paper-presentation', '05', 'PAPER PRESENTATION', 'Paper Presentation', 'TECH', 'TECHNICAL', 'ALL', 1, 2, false, '10:00 AM - 01:00 PM', '180 Mins', 'Auditorium Hall B', 'Technical research paper presentation', '[]', 'AVAILABLE', false, null, '[]', 0),

  -- 4 NON-TECH EVENTS
  ('borderland-at-gcee', '06', 'BORDERLAND AT GCEE', 'Borderland at GCEE', 'NON_TECH', 'NON_TECHNICAL', 'ALL', 1, 2, false, '02:00 PM - 04:00 PM', '120 Mins', 'Campus Quadrangle', 'Real-world campus survival & tactical quest', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('think-strike-and-win', '07', 'THINK, STRIKE AND WIN', 'Think, Strike and Win', 'NON_TECH', 'NON_TECHNICAL', 'ALL', 1, 2, false, '11:30 AM - 01:00 PM', '90 Mins', 'Seminar Hall 2', 'Strategic board, logic and rapid deduction', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('plot-twist', '08', 'PLOT TWIST', 'Plot Twist', 'NON_TECH', 'NON_TECHNICAL', 'ALL', 1, 2, false, '02:00 PM - 03:30 PM', '90 Mins', 'Drawing Hall 1', 'Creative mystery & impromptu scenario solving', '[]', 'AVAILABLE', false, null, '[]', 0),
  ('short-flim', '09', 'SHORT FILM', 'Short Film', 'NON_TECH', 'NON_TECHNICAL', 'ALL', 1, 2, false, '10:00 AM - 01:00 PM', '180 Mins', 'Main Media Center', 'Filmmaking & cinematic storytelling', '[]', 'AVAILABLE', false, null, '[]', 0)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  mission_name = EXCLUDED.mission_name,
  title = EXCLUDED.title,
  event_type = EXCLUDED.event_type,
  category = EXCLUDED.category,
  venue = EXCLUDED.venue,
  schedule_time = EXCLUDED.schedule_time,
  duration = EXCLUDED.duration,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- 6. VERIFICATION QUERY (Run this to confirm events are readable)
SELECT id, code, title, event_type, category, venue, schedule_time FROM public.events ORDER BY code;
