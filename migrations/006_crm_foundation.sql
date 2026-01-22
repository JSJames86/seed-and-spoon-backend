-- Migration: 006_crm_foundation.sql
-- Purpose: Build the CRM foundation for Seed & Spoon nonprofit operating system
--
-- This migration creates:
--   1. Multi-role identity system (roles + role_assignments)
--   2. Client CRM (households, programs, enrollments, reports)
--   3. Enhanced Donor CRM (recurring donations, tax documents)
--   4. Enhanced Volunteer system (groups, memberships, shifts, background checks)
--   5. Employee system (employees, schedules, trainings, documents)
--   6. Governance system (board meetings, agendas, votes, policies)
--
-- IMPORTANT: This extends existing tables. Does NOT break existing functionality.

-- ============================================================================
-- 1. IDENTITY & ROLES (FOUNDATION)
-- ============================================================================

-- Roles lookup table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the core roles
INSERT INTO roles (name, description) VALUES
  ('client', 'Individuals receiving services from Seed & Spoon'),
  ('donor', 'Financial or in-kind contributors'),
  ('volunteer', 'Individuals donating their time'),
  ('employee', 'Paid staff members'),
  ('board_member', 'Members of the board of directors'),
  ('executive_director', 'Executive Director with full organizational visibility'),
  ('admin', 'System administrators with full technical access');

-- Many-to-many: profiles can have multiple roles
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(profile_id, role_id)
);

CREATE INDEX idx_role_assignments_profile ON role_assignments(profile_id);
CREATE INDEX idx_role_assignments_role ON role_assignments(role_id);
CREATE INDEX idx_role_assignments_active ON role_assignments(is_active);

-- ============================================================================
-- 2. CLIENT CRM
-- ============================================================================

-- Households group clients together (family units)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255), -- e.g., "The Smith Family"
  primary_contact_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  preferred_contact_method VARCHAR(50) DEFAULT 'phone', -- 'phone', 'email', 'text'
  delivery_preference VARCHAR(50) DEFAULT 'pickup', -- 'pickup', 'delivery'
  delivery_address TEXT, -- if different from household address
  dietary_restrictions TEXT[], -- array of restrictions
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_households_primary_contact ON households(primary_contact_id);
CREATE INDEX idx_households_status ON households(status);

-- Members of a household (including minors under 18)
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for minors without accounts
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  date_of_birth DATE,
  relationship VARCHAR(50), -- 'head', 'spouse', 'child', 'dependent', 'other'
  is_minor BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_household_members_profile ON household_members(profile_id);

-- Programs offered by the organization
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  program_type VARCHAR(100), -- 'food_assistance', 'nutrition_education', 'garden', 'youth', etc.
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'archived'
  capacity INTEGER, -- max enrollees, NULL = unlimited
  eligibility_criteria TEXT, -- description of who qualifies
  start_date DATE,
  end_date DATE, -- NULL = ongoing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_type ON programs(program_type);

-- Client enrollment in programs
CREATE TABLE program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'active', 'completed', 'withdrawn', 'denied'
  enrolled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_program_enrollments_program ON program_enrollments(program_id);
CREATE INDEX idx_program_enrollments_profile ON program_enrollments(profile_id);
CREATE INDEX idx_program_enrollments_household ON program_enrollments(household_id);
CREATE INDEX idx_program_enrollments_status ON program_enrollments(status);

-- Client reports (issues, concerns, feedback)
CREATE TABLE client_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(100) NOT NULL, -- 'allergy', 'safety_concern', 'staff_behavior', 'service_issue', 'feedback', 'other'
  subject VARCHAR(255),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'resolved', 'dismissed'
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_reports_reporter ON client_reports(reporter_id);
CREATE INDEX idx_client_reports_type ON client_reports(report_type);
CREATE INDEX idx_client_reports_status ON client_reports(status);
CREATE INDEX idx_client_reports_severity ON client_reports(severity);

-- ============================================================================
-- 3. DONOR CRM ENHANCEMENTS
-- ============================================================================

-- Recurring donation configurations (supplements existing donations table)
CREATE TABLE recurring_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'failed'
  next_charge_date DATE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recurring_donations_donor ON recurring_donations(donor_id);
CREATE INDEX idx_recurring_donations_status ON recurring_donations(status);
CREATE INDEX idx_recurring_donations_next_charge ON recurring_donations(next_charge_date);

-- Tax documents (receipts, year-end summaries)
CREATE TABLE tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'receipt', 'year_end_summary', 'acknowledgment_letter'
  tax_year INTEGER NOT NULL,
  total_amount DECIMAL(10, 2),
  file_path TEXT, -- Supabase Storage path
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tax_documents_donor ON tax_documents(donor_id);
CREATE INDEX idx_tax_documents_year ON tax_documents(tax_year);

-- Add visibility preference to donors table
ALTER TABLE donors ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS public_display_name VARCHAR(255);

-- Donor event access (donor-exclusive events)
CREATE TABLE donor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  min_donation_tier VARCHAR(50), -- 'any', 'silver', 'gold', 'platinum' (NULL = all donors)
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donor_events_event ON donor_events(event_id);

-- ============================================================================
-- 4. VOLUNTEER SYSTEM ENHANCEMENTS
-- ============================================================================

-- Volunteer groups (organizations, schools, churches, etc.)
CREATE TABLE volunteer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  group_type VARCHAR(100), -- 'school', 'church', 'corporate', 'community_org', 'other'
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  qr_code_token VARCHAR(255) UNIQUE, -- unique token for QR code join link
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volunteer_groups_leader ON volunteer_groups(leader_id);
CREATE INDEX idx_volunteer_groups_status ON volunteer_groups(status);
CREATE INDEX idx_volunteer_groups_qr_token ON volunteer_groups(qr_code_token);

-- Membership in volunteer groups
CREATE TABLE volunteer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES volunteer_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'member', 'leader', 'co-leader'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(volunteer_id, group_id)
);

CREATE INDEX idx_volunteer_memberships_volunteer ON volunteer_memberships(volunteer_id);
CREATE INDEX idx_volunteer_memberships_group ON volunteer_memberships(group_id);
CREATE INDEX idx_volunteer_memberships_active ON volunteer_memberships(is_active);

-- Shifts (scheduled volunteer time slots)
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  description TEXT,
  location TEXT,
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_volunteers INTEGER,
  current_volunteers INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'full', 'in_progress', 'completed', 'cancelled'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shifts_food_bank ON shifts(food_bank_id);
CREATE INDEX idx_shifts_start_time ON shifts(start_time);
CREATE INDEX idx_shifts_status ON shifts(status);

-- Shift signups (volunteers registered for shifts)
CREATE TABLE shift_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'registered', -- 'registered', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled'
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  hours_credited DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shift_id, volunteer_id)
);

CREATE INDEX idx_shift_signups_shift ON shift_signups(shift_id);
CREATE INDEX idx_shift_signups_volunteer ON shift_signups(volunteer_id);

-- Background checks (shared between volunteers and employees)
CREATE TABLE background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_type VARCHAR(100) NOT NULL, -- 'criminal', 'sex_offender', 'child_abuse', 'full'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'passed', 'failed', 'expired'
  provider VARCHAR(255), -- external service name
  reference_number VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_background_checks_profile ON background_checks(profile_id);
CREATE INDEX idx_background_checks_status ON background_checks(status);
CREATE INDEX idx_background_checks_expires ON background_checks(expires_at);

-- Add youth flag and age-related fields to volunteers table
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS is_youth BOOLEAN DEFAULT false;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS parent_guardian_name VARCHAR(255);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS parent_guardian_phone VARCHAR(20);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS parent_guardian_email VARCHAR(255);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(50) DEFAULT 'not_required';

-- ============================================================================
-- 5. EMPLOYEE SYSTEM
-- ============================================================================

-- Employees (linked to profiles)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) UNIQUE,
  department VARCHAR(100),
  position VARCHAR(255),
  hire_date DATE NOT NULL,
  termination_date DATE,
  employment_type VARCHAR(50) DEFAULT 'full_time', -- 'full_time', 'part_time', 'seasonal', 'intern'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'on_leave', 'terminated'
  is_minor BOOLEAN DEFAULT false, -- hired at 16, restrictions apply
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employees_profile ON employees(profile_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);

-- Employee schedules
CREATE TABLE employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE, -- NULL = ongoing
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_effective ON employee_schedules(effective_from, effective_until);

-- Trainings (videos, materials, certifications)
CREATE TABLE trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  training_type VARCHAR(100), -- 'orientation', 'safety', 'food_handling', 'compliance', 'professional_dev'
  content_url TEXT, -- private video/document link
  duration_minutes INTEGER,
  is_required BOOLEAN DEFAULT false,
  required_for_roles TEXT[], -- which roles must complete this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trainings_type ON trainings(training_type);
CREATE INDEX idx_trainings_required ON trainings(is_required);

-- Training completions (who has done what)
CREATE TABLE training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  score DECIMAL(5, 2), -- if applicable
  certificate_url TEXT, -- Supabase Storage path
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(training_id, employee_id)
);

CREATE INDEX idx_training_completions_training ON training_completions(training_id);
CREATE INDEX idx_training_completions_employee ON training_completions(employee_id);

-- Employee documents (handbook, policies, personal docs)
CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE, -- NULL = org-wide document
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(100), -- 'handbook', 'policy', 'tax_form', 'contract', 'certification'
  file_path TEXT, -- Supabase Storage path
  version VARCHAR(50),
  is_org_wide BOOLEAN DEFAULT false, -- true = visible to all employees
  requires_acknowledgment BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_org_wide ON employee_documents(is_org_wide);

-- ============================================================================
-- 6. GOVERNANCE (BOARD + ED)
-- ============================================================================

-- Board meetings
CREATE TABLE board_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_type VARCHAR(50) DEFAULT 'regular', -- 'regular', 'special', 'annual', 'emergency'
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  virtual_link TEXT, -- Zoom/Teams link
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  minutes_file_path TEXT, -- Supabase Storage path for meeting minutes
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_board_meetings_scheduled ON board_meetings(scheduled_at);
CREATE INDEX idx_board_meetings_status ON board_meetings(status);

-- Meeting agenda items
CREATE TABLE meeting_agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  presenter VARCHAR(255),
  duration_minutes INTEGER,
  sort_order INTEGER DEFAULT 0,
  requires_vote BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'discussed', 'tabled', 'voted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meeting_agendas_meeting ON meeting_agendas(meeting_id);

-- Board votes
CREATE TABLE board_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES meeting_agendas(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
  motion_text TEXT NOT NULL,
  vote_type VARCHAR(50) DEFAULT 'simple_majority', -- 'simple_majority', 'two_thirds', 'unanimous'
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'passed', 'failed', 'tabled'
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_board_votes_meeting ON board_votes(meeting_id);
CREATE INDEX idx_board_votes_agenda ON board_votes(agenda_id);

-- Individual vote records (who voted what)
CREATE TABLE vote_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES board_votes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote VARCHAR(20) NOT NULL, -- 'for', 'against', 'abstain'
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vote_id, member_id)
);

CREATE INDEX idx_vote_records_vote ON vote_records(vote_id);
CREATE INDEX idx_vote_records_member ON vote_records(member_id);

-- Organizational policies and bylaws
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  policy_type VARCHAR(100), -- 'bylaw', 'policy', 'procedure', 'guideline'
  category VARCHAR(100), -- 'governance', 'hr', 'finance', 'operations', 'safety'
  content TEXT, -- markdown content of the policy
  file_path TEXT, -- Supabase Storage path (for PDFs)
  version VARCHAR(50),
  effective_date DATE,
  review_date DATE, -- when it should next be reviewed
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'archived', 'under_review'
  visibility VARCHAR(50) DEFAULT 'board_only', -- 'board_only', 'employees', 'all_roles', 'public'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_policies_type ON policies(policy_type);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_visibility ON policies(visibility);

-- Meeting attendance tracking
CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'expected', -- 'expected', 'present', 'absent', 'excused'
  arrived_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(meeting_id, member_id)
);

CREATE INDEX idx_meeting_attendance_meeting ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_member ON meeting_attendance(member_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT ON NEW TABLES
-- ============================================================================

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_members_updated_at BEFORE UPDATE ON household_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_enrollments_updated_at BEFORE UPDATE ON program_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_reports_updated_at BEFORE UPDATE ON client_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_donations_updated_at BEFORE UPDATE ON recurring_donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteer_groups_updated_at BEFORE UPDATE ON volunteer_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_background_checks_updated_at BEFORE UPDATE ON background_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_schedules_updated_at BEFORE UPDATE ON employee_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON trainings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON employee_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_meetings_updated_at BEFORE UPDATE ON board_meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UPDATE is_admin() TO SUPPORT MULTI-ROLE SYSTEM
-- ============================================================================
-- The new function checks both the legacy profiles.role field AND the new
-- role_assignments table for backward compatibility during migration.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON ra.role_id = r.id
    WHERE ra.profile_id = auth.uid()
      AND r.name = 'admin'
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON ra.role_id = r.id
    WHERE ra.profile_id = auth.uid()
      AND r.name = role_name
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user has any of the given roles
CREATE OR REPLACE FUNCTION has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON ra.role_id = r.id
    WHERE ra.profile_id = auth.uid()
      AND r.name = ANY(role_names)
      AND ra.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_any_role(TEXT[]) TO authenticated;

-- ============================================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;
