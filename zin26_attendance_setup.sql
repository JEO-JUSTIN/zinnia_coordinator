-- ==============================================================================
-- ZINNIA 2026 (zin26) — OFFICIAL ATTENDANCE & CHECK-IN SCHEMA SETUP
-- ==============================================================================
-- This script creates the official 3 attendance tables in the `zin26` schema:
-- 1. zin26.participant_checkins (Gate Entry - Unique per user)
-- 2. zin26.event_attendance (Event Attendance - Unique per user per event)
-- 3. zin26.food_attendance (Food/Lunch Attendance - Unique per user, Lunch only once)
-- ==============================================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS zin26;

-- Grant schema usage to standard roles
GRANT USAGE ON SCHEMA zin26 TO postgres, anon, authenticated, service_role;

-- ============================================
-- 1. PARTICIPANT CHECK-IN (GATE ENTRY)
-- ============================================

CREATE TABLE IF NOT EXISTS zin26.participant_checkins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid,

  UNIQUE (user_id),

  CONSTRAINT participant_checkins_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES zin26.participants(user_id)
);

-- Fast lookup index on gate check-in
CREATE INDEX IF NOT EXISTS idx_participant_checkins_user 
  ON zin26.participant_checkins (user_id);

-- Enable RLS & Policies
ALTER TABLE zin26.participant_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS participant_checkins_select ON zin26.participant_checkins;
CREATE POLICY participant_checkins_select ON zin26.participant_checkins
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS participant_checkins_insert ON zin26.participant_checkins;
CREATE POLICY participant_checkins_insert ON zin26.participant_checkins
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT ALL ON zin26.participant_checkins TO anon, authenticated, service_role;


-- ============================================
-- 2. EVENT ATTENDANCE
-- ============================================

CREATE TABLE IF NOT EXISTS zin26.event_attendance (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  event_code text NOT NULL,
  reg_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'PRESENT'
    CHECK (status IN ('PRESENT', 'ABSENT')),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,

  UNIQUE (user_id, event_code),

  CONSTRAINT event_attendance_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES zin26.participants(user_id),

  CONSTRAINT event_attendance_event_fkey
    FOREIGN KEY (event_code)
    REFERENCES zin26.events(code),

  CONSTRAINT event_attendance_registration_fkey
    FOREIGN KEY (reg_id)
    REFERENCES zin26.registrations(reg_id)
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_user_event 
  ON zin26.event_attendance (user_id, event_code);

CREATE INDEX IF NOT EXISTS idx_event_attendance_event 
  ON zin26.event_attendance (event_code);

-- Enable RLS & Policies
ALTER TABLE zin26.event_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_attendance_select ON zin26.event_attendance;
CREATE POLICY event_attendance_select ON zin26.event_attendance
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS event_attendance_insert ON zin26.event_attendance;
CREATE POLICY event_attendance_insert ON zin26.event_attendance
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT ALL ON zin26.event_attendance TO anon, authenticated, service_role;


-- ============================================
-- 3. FOOD ATTENDANCE (LUNCH ONLY, ONCE)
-- ============================================

CREATE TABLE IF NOT EXISTS zin26.food_attendance (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  collected_by uuid,

  UNIQUE (user_id),

  CONSTRAINT food_attendance_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES zin26.participants(user_id)
);

-- Fast lookup index on food attendance
CREATE INDEX IF NOT EXISTS idx_food_attendance_user 
  ON zin26.food_attendance (user_id);

-- Enable RLS & Policies
ALTER TABLE zin26.food_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS food_attendance_select ON zin26.food_attendance;
CREATE POLICY food_attendance_select ON zin26.food_attendance
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS food_attendance_insert ON zin26.food_attendance;
CREATE POLICY food_attendance_insert ON zin26.food_attendance
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT ALL ON zin26.food_attendance TO anon, authenticated, service_role;
