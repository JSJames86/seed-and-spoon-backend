-- Migration: 004_fix_intakes_rls_performance.sql
-- Purpose: Fix RLS performance warnings on intakes table
--
-- Issues addressed:
--   1. Multiple permissive policies for same role/action (duplicates)
--   2. auth.uid() being re-evaluated per row (use select wrapper)

-- ============================================================================
-- STEP 1: Drop duplicate/conflicting policies
-- ============================================================================
-- Drop the duplicate policies - keep one consolidated policy per action

DROP POLICY IF EXISTS "Users can manage their own intakes" ON intakes;
DROP POLICY IF EXISTS "authenticated_owner_delete" ON intakes;
DROP POLICY IF EXISTS "authenticated_owner_insert" ON intakes;
DROP POLICY IF EXISTS "authenticated_owner_select" ON intakes;
DROP POLICY IF EXISTS "authenticated_owner_update" ON intakes;

-- ============================================================================
-- STEP 2: Create optimized policies with (select auth.uid()) pattern
-- ============================================================================
-- Using (select auth.uid()) prevents re-evaluation for each row

-- Users can view their own intakes
CREATE POLICY "intakes_select_own"
  ON intakes FOR SELECT
  USING (user_id = (select auth.uid()));

-- Users can insert their own intakes
CREATE POLICY "intakes_insert_own"
  ON intakes FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Users can update their own intakes
CREATE POLICY "intakes_update_own"
  ON intakes FOR UPDATE
  USING (user_id = (select auth.uid()));

-- Users can delete their own intakes
CREATE POLICY "intakes_delete_own"
  ON intakes FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- STEP 3: Admin access policies
-- ============================================================================
-- Admins can manage all intakes

CREATE POLICY "intakes_admin"
  ON intakes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
