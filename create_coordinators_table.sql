-- ==============================================================================
-- DEDICATED COORDINATORS LOGIN TABLE FOR ZINNIA EVENT MANAGEMENT
-- ==============================================================================
-- Run this in your Supabase SQL Editor to create the dedicated coordinators table.
-- Coordinators can log in using their Roll Number (case-insensitive) and password.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no varchar NOT NULL,
  full_name varchar NOT NULL,
  password text NOT NULL,
  role varchar NOT NULL DEFAULT 'COORDINATOR', 
  assignment_type varchar NOT NULL, 
  event_id varchar REFERENCES public.events(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Case-insensitive unique constraint on roll_no
CREATE UNIQUE INDEX IF NOT EXISTS idx_coordinators_roll_no_lower 
ON public.coordinators (lower(roll_no));

-- Enable RLS
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

-- Allow coordinators to verify login credentials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'coordinators' AND policyname = 'coordinators_login_select'
  ) THEN
    CREATE POLICY coordinators_login_select ON public.coordinators
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- SAMPLE COORDINATOR ACCOUNTS (Use Coordinator Codes like TECH01, FOODC01, etc.)
-- ------------------------------------------------------------------------------
INSERT INTO public.coordinators (roll_no, full_name, password, role, assignment_type, event_id, is_active)
VALUES
  -- 1. Super Admin (Full access to all tabs & events)
  ('ADMIN01', 'Dr. R. Vignesh', 'admin123', 'SUPER_ADMIN', 'OVERALL_TECH', NULL, true),

  -- 2. Overall Tech Lead (Access to all 5 Tech events)
  ('TECH01', 'Kavin Raj', 'tech123', 'COORDINATOR', 'OVERALL_TECH', NULL, true),

  -- 3. Individual Tech Coordinator (Debugging only)
  ('TECH02', 'Priya Dharshini', 'tech123', 'COORDINATOR', 'TECH_EVENT', 'debugging', true),

  -- 4. Overall Non-Tech Lead (Access to all 4 Non-Tech events)
  ('NONTECH01', 'Divya Bharathi', 'nontech123', 'COORDINATOR', 'OVERALL_NON_TECH', NULL, true),

  -- 5. Individual Non-Tech Coordinator (Short Film only)
  ('NONTECH02', 'Arun Vijay', 'film123', 'COORDINATOR', 'NON_TECH_EVENT', 'short-flim', true),

  -- 6. Food Committee Lead (Food tab only)
  ('FOODC01', 'Suresh Babu', 'food123', 'FOOD_STAFF', 'FOOD', NULL, true),

  -- 7. Food Committee Counter 2 (Food tab only)
  ('FOODC02', 'Rajesh Kumar', 'food123', 'FOOD_STAFF', 'FOOD', NULL, true),

  -- 8. Refreshment Committee Staff (Refreshment tab only)
  ('REFR01', 'Ananya Sharma', 'refresh123', 'COORDINATOR', 'REFRESHMENT', NULL, true),

  -- 9. Blocked / Inactive Coordinator (To test rejection)
  ('BLOCK01', 'Suspended Volunteer', 'pass123', 'VOLUNTEER', 'FOOD', NULL, false)
ON CONFLICT (roll_no) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password = EXCLUDED.password,
  assignment_type = EXCLUDED.assignment_type,
  event_id = EXCLUDED.event_id,
  is_active = EXCLUDED.is_active;
