-- Migration: 009_audit_logging.sql
-- Purpose: Create audit logging infrastructure for sensitive actions
--
-- Design principles:
--   1. Audit log is append-only (no UPDATE or DELETE allowed via RLS)
--   2. Only elevated roles can READ audit logs
--   3. Logs are written via SECURITY DEFINER trigger functions (bypass RLS)
--   4. Sensitive tables automatically log INSERT/UPDATE/DELETE
--   5. Column-level change tracking for critical fields
--
-- Tables audited:
--   - role_assignments (privilege changes)
--   - profiles (identity changes)
--   - donations / recurring_donations (financial)
--   - household_members (youth data)
--   - background_checks (PII/sensitive)
--   - client_reports (incident reports)
--   - board_votes / vote_records (governance)
--   - employee_documents (HR)

-- ============================================================================
-- 1. AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What happened
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID, -- PK of the affected row (NULL if composite key)
  -- Who did it
  actor_id UUID, -- auth.uid() at time of action (NULL for system/service role)
  actor_email TEXT, -- denormalized for readability in logs
  actor_roles TEXT[], -- snapshot of roles at time of action
  -- What changed
  old_data JSONB, -- previous state (NULL for INSERT)
  new_data JSONB, -- new state (NULL for DELETE)
  changed_columns TEXT[], -- which columns changed (UPDATE only)
  -- Context
  ip_address INET, -- from request headers if available
  user_agent TEXT,
  session_id TEXT, -- Supabase auth session
  -- Metadata
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  notes TEXT, -- optional human-readable context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_severity ON audit_log(severity) WHERE severity IN ('warning', 'critical');

-- Composite index for "show me all changes to this record"
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id, created_at DESC);

-- ============================================================================
-- 2. RLS ON AUDIT LOG (append-only, read-restricted)
-- ============================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin and ED can read audit logs
CREATE POLICY "audit_log_select_elevated"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON ra.role_id = r.id
      WHERE ra.profile_id = (select auth.uid())
        AND r.name IN ('admin', 'executive_director')
        AND ra.is_active = true
    )
  );

-- No one can INSERT/UPDATE/DELETE via client — only triggers (SECURITY DEFINER)
-- This prevents tampering. Writes happen via trigger functions that bypass RLS.

-- ============================================================================
-- 3. GENERIC AUDIT TRIGGER FUNCTION
-- ============================================================================
-- This function is called by triggers on sensitive tables.
-- It captures the actor, action, and changed data automatically.

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  _actor_id UUID;
  _actor_email TEXT;
  _actor_roles TEXT[];
  _record_id UUID;
  _old_data JSONB;
  _new_data JSONB;
  _changed_columns TEXT[];
  _severity VARCHAR(20);
  _col TEXT;
BEGIN
  -- Get actor info
  _actor_id := auth.uid();

  -- Get actor email (best effort, don't fail if profiles not accessible)
  BEGIN
    SELECT email INTO _actor_email
    FROM public.profiles
    WHERE id = _actor_id;
  EXCEPTION WHEN OTHERS THEN
    _actor_email := NULL;
  END;

  -- Get actor roles snapshot
  BEGIN
    SELECT ARRAY_AGG(r.name) INTO _actor_roles
    FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = _actor_id AND ra.is_active = true;
  EXCEPTION WHEN OTHERS THEN
    _actor_roles := NULL;
  END;

  -- Determine record ID (try common PK column names)
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _record_id := NEW.id;
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _record_id := NEW.id;
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);

    -- Calculate changed columns
    _changed_columns := ARRAY[]::TEXT[];
    FOR _col IN SELECT key FROM jsonb_each(to_jsonb(NEW))
    LOOP
      IF (to_jsonb(OLD) ->> _col) IS DISTINCT FROM (to_jsonb(NEW) ->> _col) THEN
        _changed_columns := _changed_columns || _col;
      END IF;
    END LOOP;
  END IF;

  -- Determine severity based on table and action
  _severity := 'info';

  -- Critical: role changes, background checks, financial deletes
  IF TG_TABLE_NAME = 'role_assignments' THEN
    _severity := 'critical';
  ELSIF TG_TABLE_NAME IN ('background_checks', 'client_reports') AND TG_OP = 'DELETE' THEN
    _severity := 'critical';
  ELSIF TG_TABLE_NAME IN ('donations', 'recurring_donations') AND TG_OP = 'DELETE' THEN
    _severity := 'critical';
  -- Warning: profile changes, financial updates, youth data changes
  ELSIF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
    _severity := 'warning';
  ELSIF TG_TABLE_NAME = 'household_members' THEN
    _severity := 'warning';
  ELSIF TG_TABLE_NAME IN ('donations', 'recurring_donations') AND TG_OP = 'UPDATE' THEN
    _severity := 'warning';
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_log (
    action, table_name, record_id,
    actor_id, actor_email, actor_roles,
    old_data, new_data, changed_columns,
    severity
  ) VALUES (
    TG_OP, TG_TABLE_NAME, _record_id,
    _actor_id, _actor_email, _actor_roles,
    _old_data, _new_data, _changed_columns,
    _severity
  );

  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 4. ATTACH AUDIT TRIGGERS TO SENSITIVE TABLES
-- ============================================================================

-- Role assignments (privilege escalation detection)
CREATE TRIGGER audit_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Profiles (identity changes)
CREATE TRIGGER audit_profiles
  AFTER UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Donations (financial records)
CREATE TRIGGER audit_donations
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Recurring donations (financial records)
CREATE TRIGGER audit_recurring_donations
  AFTER INSERT OR UPDATE OR DELETE ON recurring_donations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Household members (youth data)
CREATE TRIGGER audit_household_members
  AFTER INSERT OR UPDATE OR DELETE ON household_members
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Background checks (sensitive PII)
CREATE TRIGGER audit_background_checks
  AFTER INSERT OR UPDATE OR DELETE ON background_checks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Client reports (incident reports)
CREATE TRIGGER audit_client_reports
  AFTER INSERT OR UPDATE OR DELETE ON client_reports
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Board votes (governance accountability)
CREATE TRIGGER audit_board_votes
  AFTER INSERT OR UPDATE OR DELETE ON board_votes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Vote records (individual vote accountability)
CREATE TRIGGER audit_vote_records
  AFTER INSERT OR UPDATE OR DELETE ON vote_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Employee documents (HR records)
CREATE TRIGGER audit_employee_documents
  AFTER INSERT OR UPDATE OR DELETE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- 5. ROLE ASSIGNMENT GUARD: Prevent self-escalation
-- ============================================================================
-- This trigger prevents users from assigning themselves elevated roles.
-- Only admin can assign admin. Only admin/ED can assign ED.
-- No one can assign roles to themselves (must be done by another elevated user).

CREATE OR REPLACE FUNCTION prevent_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
  _role_name TEXT;
  _actor_id UUID;
BEGIN
  _actor_id := auth.uid();

  -- Get the role name being assigned
  SELECT r.name INTO _role_name
  FROM public.roles r
  WHERE r.id = NEW.role_id;

  -- Rule 1: Cannot assign roles to yourself
  IF NEW.profile_id = _actor_id THEN
    RAISE EXCEPTION 'Cannot assign roles to yourself. Another administrator must do this.';
  END IF;

  -- Rule 2: Only existing admins can assign the admin role
  IF _role_name = 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON ra.role_id = r.id
      WHERE ra.profile_id = _actor_id
        AND r.name = 'admin'
        AND ra.is_active = true
    ) THEN
      RAISE EXCEPTION 'Only admins can assign the admin role.';
    END IF;
  END IF;

  -- Rule 3: Only admin or ED can assign the executive_director role
  IF _role_name = 'executive_director' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON ra.role_id = r.id
      WHERE ra.profile_id = _actor_id
        AND r.name IN ('admin', 'executive_director')
        AND ra.is_active = true
    ) THEN
      RAISE EXCEPTION 'Only admins or existing executive directors can assign the executive_director role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER guard_role_escalation
  BEFORE INSERT OR UPDATE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION prevent_privilege_escalation();

-- ============================================================================
-- 6. HELPER: Get audit trail for a specific record
-- ============================================================================
CREATE OR REPLACE FUNCTION get_audit_trail(
  p_table_name TEXT,
  p_record_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF audit_log AS $$
BEGIN
  -- Only elevated users can query audit trails
  IF NOT EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON ra.role_id = r.id
    WHERE ra.profile_id = (select auth.uid())
      AND r.name IN ('admin', 'executive_director')
      AND ra.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: audit trail requires elevated permissions.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.audit_log
  WHERE table_name = p_table_name
    AND record_id = p_record_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION get_audit_trail(TEXT, UUID, INTEGER) TO authenticated;
