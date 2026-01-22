-- Migration: 010_enhanced_rls_policies.sql
-- Purpose: Harden RLS policies with youth data protection, incident isolation,
--          and tighter access controls
--
-- Changes:
--   1. Youth data isolation (household_members where is_minor = true)
--   2. Incident report isolation (client_reports with severity = 'critical')
--   3. Tighten profiles access (employees can read client profiles for service delivery)
--   4. Add intakes access for staff (currently only own + admin)
--   5. Tighten donation access (employees read-only, not full access)
--   6. Add missing DELETE restrictions
--
-- Philosophy:
--   - "Own data" policies use auth.uid() directly
--   - "Elevated" policies use is_elevated() (admin + ED)
--   - "Staff" policies use is_staff() (admin + ED + employee)
--   - Youth data is NEVER accessible to volunteers or donors
--   - Incident reports with 'critical' severity restricted to ED + admin only
--   - DELETE is always restricted to elevated roles (never employees alone)

-- ============================================================================
-- 1. YOUTH DATA PROTECTION
-- ============================================================================
-- Household members who are minors require stricter access.
-- Only staff (employee + ED + admin) can see minor data.
-- Volunteers and donors NEVER see youth records.

-- Drop existing policies that are too permissive for youth data
DROP POLICY IF EXISTS "household_members_admin" ON household_members;

-- Recreate: Staff can see all household members (including minors)
CREATE POLICY "household_members_staff_all"
  ON household_members FOR SELECT
  USING (is_staff());

-- Staff can modify household members
CREATE POLICY "household_members_staff_modify"
  ON household_members FOR ALL
  USING (is_elevated());

-- The existing "household_members_select_own" policy remains:
-- parents/guardians (primary_contact) can see their own household members.
-- This correctly includes their own children.

-- ============================================================================
-- 2. INCIDENT REPORT ISOLATION
-- ============================================================================
-- client_reports with severity = 'critical' or report_type = 'safety_concern'
-- or report_type = 'staff_behavior' are restricted to ED + admin only.
-- Regular employees should NOT see reports about staff behavior.

-- Drop existing permissive policy
DROP POLICY IF EXISTS "client_reports_admin" ON client_reports;

-- Employees can see non-sensitive reports (for service delivery)
CREATE POLICY "client_reports_staff_read"
  ON client_reports FOR SELECT
  USING (
    is_staff()
    AND (
      -- Employees can only see non-sensitive reports
      has_any_role(ARRAY['admin', 'executive_director'])
      OR (
        severity != 'critical'
        AND report_type NOT IN ('safety_concern', 'staff_behavior')
      )
    )
  );

-- Only elevated can manage all reports (including sensitive ones)
CREATE POLICY "client_reports_elevated_all"
  ON client_reports FOR ALL
  USING (is_elevated());

-- ============================================================================
-- 3. TIGHTEN PROFILES ACCESS
-- ============================================================================
-- Current state: users see own profile, admins see all.
-- Problem: employees need to look up client profiles for service delivery.
-- Solution: staff can SELECT profiles, but only elevated can modify others.

-- Add staff read access to profiles
CREATE POLICY "profiles_select_staff"
  ON profiles FOR SELECT
  USING (is_staff());

-- ============================================================================
-- 4. INTAKES: Staff read access
-- ============================================================================
-- Currently only own + admin. Staff need read access for service delivery.
-- Employees should be able to view (not modify) client intakes.

CREATE POLICY "intakes_select_staff"
  ON intakes FOR SELECT
  USING (is_staff());

-- Only elevated can modify others' intakes
CREATE POLICY "intakes_elevated_all"
  ON intakes FOR ALL
  USING (is_elevated());

-- ============================================================================
-- 5. TIGHTEN DONATION ACCESS
-- ============================================================================
-- Current: admin + ED have full access. Employees get full access via households_admin pattern.
-- Fix: Employees get read-only access to donations for reporting. Only elevated can modify.

-- Drop the overly permissive pattern from donations if it exists
DROP POLICY IF EXISTS "donations_admin" ON donations;

-- Staff can read donations (for reporting, dashboards)
CREATE POLICY "donations_select_staff"
  ON donations FOR SELECT
  USING (is_staff());

-- Only elevated can modify donations
CREATE POLICY "donations_elevated_modify"
  ON donations FOR INSERT
  WITH CHECK (is_elevated());

CREATE POLICY "donations_elevated_update"
  ON donations FOR UPDATE
  USING (is_elevated());

CREATE POLICY "donations_elevated_delete"
  ON donations FOR DELETE
  USING (is_elevated());

-- ============================================================================
-- 6. TIGHTEN RECURRING DONATIONS
-- ============================================================================
-- Drop existing admin policy (too broad - gives employees full access)
DROP POLICY IF EXISTS "recurring_donations_admin" ON recurring_donations;

-- Staff can read recurring donations
CREATE POLICY "recurring_donations_select_staff"
  ON recurring_donations FOR SELECT
  USING (is_staff());

-- Only elevated can modify
CREATE POLICY "recurring_donations_elevated_modify"
  ON recurring_donations FOR ALL
  USING (is_elevated());

-- ============================================================================
-- 7. BACKGROUND CHECKS: Restrict to elevated only
-- ============================================================================
-- Background check results are sensitive PII. Employees should not
-- see each other's background checks. Only ED + admin.
DROP POLICY IF EXISTS "background_checks_admin" ON background_checks;

CREATE POLICY "background_checks_elevated"
  ON background_checks FOR ALL
  USING (is_elevated());

-- ============================================================================
-- 8. EMPLOYEE RECORDS: Restrict modifications to elevated
-- ============================================================================
-- Employees can see their own record. Only ED/admin can modify employee records.
-- This prevents employees from changing their own employment details.
DROP POLICY IF EXISTS "employees_admin" ON employees;

CREATE POLICY "employees_elevated_all"
  ON employees FOR ALL
  USING (is_elevated());

-- ED can see all employees (for management)
CREATE POLICY "employees_select_elevated"
  ON employees FOR SELECT
  USING (is_elevated());

-- ============================================================================
-- 9. VOLUNTEER YOUTH PROTECTION
-- ============================================================================
-- Volunteers marked as is_youth = true need additional protection.
-- Their parent/guardian contact info is sensitive.
-- Add a view-layer note: the volunteers table policies already restrict
-- to own-record + staff. Youth volunteer guardian info is only visible to staff.

-- Ensure volunteers can only see their own record
CREATE POLICY "volunteers_select_own"
  ON volunteers FOR SELECT
  USING (
    email = (SELECT email FROM public.profiles WHERE id = (select auth.uid()))
  );

-- Staff can see all volunteers
CREATE POLICY "volunteers_select_staff"
  ON volunteers FOR SELECT
  USING (is_staff());

-- Only elevated can modify volunteer records
CREATE POLICY "volunteers_elevated_modify"
  ON volunteers FOR ALL
  USING (is_elevated());

-- ============================================================================
-- 10. BOARD VOTES: Prevent vote tampering
-- ============================================================================
-- Once a vote is cast, it should not be updatable.
-- Only the vote_records INSERT policy allows casting.
-- No one should be able to UPDATE a vote record (enforced at DB level).

-- Drop existing permissive admin policy on vote_records
DROP POLICY IF EXISTS "vote_records_admin" ON vote_records;

-- Elevated can view all vote records but NOT modify after cast
CREATE POLICY "vote_records_elevated_select"
  ON vote_records FOR SELECT
  USING (is_elevated());

-- No UPDATE policy exists = no one can change a cast vote via RLS
-- DELETE only by admin (for corrections with audit trail)
CREATE POLICY "vote_records_delete_admin"
  ON vote_records FOR DELETE
  USING (is_admin());

-- ============================================================================
-- 11. POLICIES/BYLAWS: Ensure draft policies aren't visible
-- ============================================================================
-- Only published (status = 'active') policies should follow visibility rules.
-- Draft policies should only be visible to elevated users.
DROP POLICY IF EXISTS "policies_select_public" ON policies;

CREATE POLICY "policies_select_by_visibility"
  ON policies FOR SELECT
  USING (
    -- Elevated can see everything (including drafts)
    is_elevated()
    OR (
      -- Non-elevated can only see active policies matching their visibility level
      status = 'active'
      AND (
        visibility = 'public'
        OR (visibility = 'all_roles' AND auth.uid() IS NOT NULL)
        OR (visibility = 'employees' AND is_staff())
        OR (visibility = 'board_only' AND has_any_role(ARRAY['board_member', 'executive_director', 'admin']))
      )
    )
  );

-- ============================================================================
-- 12. HOUSEHOLDS: Tighten write access
-- ============================================================================
-- Drop overly permissive admin policy (gives employees full CRUD)
DROP POLICY IF EXISTS "households_admin" ON households;

-- Staff can read all households
CREATE POLICY "households_select_staff"
  ON households FOR SELECT
  USING (is_staff());

-- Only elevated can create/modify/delete households
CREATE POLICY "households_elevated_modify"
  ON households FOR INSERT
  WITH CHECK (is_elevated() OR owns_profile(primary_contact_id));

CREATE POLICY "households_elevated_update"
  ON households FOR UPDATE
  USING (is_elevated());

CREATE POLICY "households_elevated_delete"
  ON households FOR DELETE
  USING (is_elevated());

-- ============================================================================
-- 13. DONORS TABLE: Add profile_id for reliable identity linking
-- ============================================================================
-- The current system links donors to profiles via email, which is fragile
-- (emails can change). Add profile_id for a stable FK-based link.
-- Keep email column for legacy/display purposes.

ALTER TABLE donors ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_donors_profile ON donors(profile_id);

-- Update existing donor policies to also check profile_id
DROP POLICY IF EXISTS "donors_select_own" ON donors;

CREATE POLICY "donors_select_own"
  ON donors FOR SELECT
  USING (
    profile_id = (select auth.uid())
    OR email = (SELECT email FROM public.profiles WHERE id = (select auth.uid()))
    OR is_staff()
  );

-- Tax documents: Add profile_id based access path
CREATE POLICY "tax_documents_select_by_profile"
  ON tax_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.id = tax_documents.donor_id
        AND (
          d.profile_id = (select auth.uid())
          OR d.email = (SELECT email FROM public.profiles WHERE id = (select auth.uid()))
        )
    )
  );
