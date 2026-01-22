-- Migration: 008_fix_rls_helper_functions.sql
-- Purpose: Harden RLS helper functions and add missing helpers
--
-- Issues addressed:
--   1. SECURITY DEFINER functions missing SET search_path (injection risk)
--   2. Missing (select auth.uid()) optimization in functions
--   3. Missing is_staff() helper for common staff-level checks
--   4. Missing is_elevated() helper for admin + ED shorthand
--   5. Legacy profiles.role fallback should be removed from is_admin()
--      once migration to role_assignments is complete
--
-- Security principle: All SECURITY DEFINER functions MUST have
-- SET search_path = '' to prevent search_path injection attacks.

-- ============================================================================
-- 1. FIX is_admin() - Add search_path protection
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = (select auth.uid())
      AND r.name = 'admin'
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 2. FIX has_role() - Add search_path protection + optimization
-- ============================================================================
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = (select auth.uid())
      AND r.name = role_name
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 3. FIX has_any_role() - Add search_path protection + optimization
-- ============================================================================
CREATE OR REPLACE FUNCTION has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = (select auth.uid())
      AND r.name = ANY(role_names)
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 4. NEW: is_staff() - Employee + ED + Admin shorthand
-- ============================================================================
-- Used for common "staff can see this" patterns. Reduces policy duplication.
-- Staff = employee OR executive_director OR admin
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = (select auth.uid())
      AND r.name IN ('employee', 'executive_director', 'admin')
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 5. NEW: is_elevated() - ED + Admin shorthand
-- ============================================================================
-- Used for actions that require executive-level or system-level access.
-- This is the "can modify anything" check. Employees do NOT have this.
CREATE OR REPLACE FUNCTION is_elevated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = (select auth.uid())
      AND r.name IN ('executive_director', 'admin')
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 6. NEW: owns_profile() - Check if a profile_id belongs to current user
-- ============================================================================
-- Reduces repetitive auth.uid() = profile_id patterns and ensures
-- consistent behavior across policies.
CREATE OR REPLACE FUNCTION owns_profile(check_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN check_profile_id = (select auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- GRANT EXECUTE TO authenticated ROLE
-- ============================================================================
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_any_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION is_elevated() TO authenticated;
GRANT EXECUTE ON FUNCTION owns_profile(UUID) TO authenticated;
