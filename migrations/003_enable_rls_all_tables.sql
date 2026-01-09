-- Migration: 003_enable_rls_all_tables.sql
-- Purpose: Enable Row Level Security (RLS) on all public tables
-- Security: Fixes Supabase linter warnings for RLS disabled tables
--
-- Tables addressed:
--   - donors (ensure complete policies)
--   - donations
--   - food_resources
--   - profiles
--   - pantries
--
-- Role-based access:
--   - admin: Full access to all tables
--   - donor: Own donation records only
--   - client: Own profile only
--   - volunteer: Own profile only

-- ============================================================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================================================
-- This function checks if the authenticated user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE - RLS
-- ============================================================================
-- Users can manage their own profile, admins can see all

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not role - handled by app logic)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admins can update all profiles
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (is_admin());

-- ============================================================================
-- DONATIONS TABLE - RLS
-- ============================================================================
-- Donors can see their own donations, admins have full access

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Donors can view their own donations (matched by email)
CREATE POLICY "donations_select_own"
  ON donations FOR SELECT
  USING (
    donor_email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR is_admin()
  );

-- Admins can insert donations
CREATE POLICY "donations_insert_admin"
  ON donations FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update donations
CREATE POLICY "donations_update_admin"
  ON donations FOR UPDATE
  USING (is_admin());

-- Admins can delete donations
CREATE POLICY "donations_delete_admin"
  ON donations FOR DELETE
  USING (is_admin());

-- ============================================================================
-- DONORS TABLE - Complete RLS Policies
-- ============================================================================
-- Note: RLS already enabled in 002_phase2_tables.sql, adding complete policies

-- Donors can view their own donor record (matched by email)
CREATE POLICY "donors_select_own"
  ON donors FOR SELECT
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR is_admin()
  );

-- Admins can insert donors
CREATE POLICY "donors_insert_admin"
  ON donors FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update donors
CREATE POLICY "donors_update_admin"
  ON donors FOR UPDATE
  USING (is_admin());

-- Admins can delete donors
CREATE POLICY "donors_delete_admin"
  ON donors FOR DELETE
  USING (is_admin());

-- ============================================================================
-- FOOD_RESOURCES TABLE - RLS
-- ============================================================================
-- Public read access for active resources, admin full access

ALTER TABLE food_resources ENABLE ROW LEVEL SECURITY;

-- Public read access for food resources (anyone can view)
CREATE POLICY "food_resources_select_public"
  ON food_resources FOR SELECT
  USING (true);

-- Admins can insert food resources
CREATE POLICY "food_resources_insert_admin"
  ON food_resources FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update food resources
CREATE POLICY "food_resources_update_admin"
  ON food_resources FOR UPDATE
  USING (is_admin());

-- Admins can delete food resources
CREATE POLICY "food_resources_delete_admin"
  ON food_resources FOR DELETE
  USING (is_admin());

-- ============================================================================
-- PANTRIES TABLE - RLS
-- ============================================================================
-- Public read access for pantries, admin full access

ALTER TABLE pantries ENABLE ROW LEVEL SECURITY;

-- Public read access for pantries (anyone can view)
CREATE POLICY "pantries_select_public"
  ON pantries FOR SELECT
  USING (true);

-- Admins can insert pantries
CREATE POLICY "pantries_insert_admin"
  ON pantries FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update pantries
CREATE POLICY "pantries_update_admin"
  ON pantries FOR UPDATE
  USING (is_admin());

-- Admins can delete pantries
CREATE POLICY "pantries_delete_admin"
  ON pantries FOR DELETE
  USING (is_admin());

-- ============================================================================
-- ADDITIONAL POLICIES FOR PHASE 2 TABLES
-- ============================================================================
-- Complete the policies for tables that had RLS enabled but incomplete policies

-- Admins can manage all volunteer tasks
CREATE POLICY "volunteer_tasks_admin"
  ON volunteer_tasks FOR ALL
  USING (is_admin());

-- Admins can manage all volunteer hours
CREATE POLICY "volunteer_hours_admin"
  ON volunteer_hours FOR ALL
  USING (is_admin());

-- Admins can manage all events
CREATE POLICY "events_admin"
  ON events FOR ALL
  USING (is_admin());

-- Admins can manage all event_volunteers
CREATE POLICY "event_volunteers_admin"
  ON event_volunteers FOR ALL
  USING (is_admin());

-- Volunteers can view events they're registered for
CREATE POLICY "event_volunteers_select_own"
  ON event_volunteers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM volunteers v
      WHERE v.id = event_volunteers.volunteer_id
        AND v.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- GRANT USAGE ON HELPER FUNCTIONS
-- ============================================================================
-- Ensure the function can be called by authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
