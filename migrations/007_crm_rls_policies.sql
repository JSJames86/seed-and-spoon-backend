-- Migration: 007_crm_rls_policies.sql
-- Purpose: Row Level Security policies for all CRM tables
--
-- Strategy:
--   - Admins & ED have full access to everything
--   - Board members can access governance data
--   - Employees can access their own records + org-wide docs
--   - Volunteers can view their own groups, shifts, hours
--   - Donors can view their own donations, tax docs, recurring
--   - Clients can view their own household, enrollments, reports
--   - Data isolation: users only see their own records unless elevated

-- ============================================================================
-- ROLES & ROLE_ASSIGNMENTS
-- ============================================================================

-- Roles table: readable by all authenticated users
CREATE POLICY "roles_select_authenticated"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Role assignments: users can see their own
CREATE POLICY "role_assignments_select_own"
  ON role_assignments FOR SELECT
  USING (profile_id = auth.uid());

-- Admins/ED can manage all role assignments
CREATE POLICY "role_assignments_admin"
  ON role_assignments FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- ============================================================================
-- CLIENT CRM POLICIES
-- ============================================================================

-- Households: clients see their own, admin/ED see all
CREATE POLICY "households_select_own"
  ON households FOR SELECT
  USING (primary_contact_id = auth.uid());

CREATE POLICY "households_update_own"
  ON households FOR UPDATE
  USING (primary_contact_id = auth.uid());

CREATE POLICY "households_admin"
  ON households FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Household members: same access as household
CREATE POLICY "household_members_select_own"
  ON household_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = household_members.household_id
        AND h.primary_contact_id = auth.uid()
    )
  );

CREATE POLICY "household_members_insert_own"
  ON household_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = household_members.household_id
        AND h.primary_contact_id = auth.uid()
    )
  );

CREATE POLICY "household_members_update_own"
  ON household_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = household_members.household_id
        AND h.primary_contact_id = auth.uid()
    )
  );

CREATE POLICY "household_members_admin"
  ON household_members FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Programs: readable by all authenticated, managed by admin/employee
CREATE POLICY "programs_select_authenticated"
  ON programs FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "programs_admin"
  ON programs FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Program enrollments: clients see their own
CREATE POLICY "program_enrollments_select_own"
  ON program_enrollments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "program_enrollments_insert_own"
  ON program_enrollments FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "program_enrollments_admin"
  ON program_enrollments FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Client reports: reporters see their own, admin/employee can manage
CREATE POLICY "client_reports_select_own"
  ON client_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "client_reports_insert_own"
  ON client_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "client_reports_admin"
  ON client_reports FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- ============================================================================
-- DONOR CRM POLICIES
-- ============================================================================

-- Recurring donations: donors see their own
CREATE POLICY "recurring_donations_select_own"
  ON recurring_donations FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "recurring_donations_update_own"
  ON recurring_donations FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "recurring_donations_admin"
  ON recurring_donations FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Tax documents: donors see their own
CREATE POLICY "tax_documents_select_own"
  ON tax_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM donors d
      WHERE d.id = tax_documents.donor_id
        AND d.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "tax_documents_admin"
  ON tax_documents FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Donor events: donors can view
CREATE POLICY "donor_events_select_donor"
  ON donor_events FOR SELECT
  USING (has_role('donor') OR is_admin() OR has_role('executive_director'));

CREATE POLICY "donor_events_admin"
  ON donor_events FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- ============================================================================
-- VOLUNTEER SYSTEM POLICIES
-- ============================================================================

-- Volunteer groups: visible to all authenticated
CREATE POLICY "volunteer_groups_select_authenticated"
  ON volunteer_groups FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "volunteer_groups_admin"
  ON volunteer_groups FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Leaders can update their own groups
CREATE POLICY "volunteer_groups_update_leader"
  ON volunteer_groups FOR UPDATE
  USING (leader_id = auth.uid());

-- Volunteer memberships: members see their own
CREATE POLICY "volunteer_memberships_select_own"
  ON volunteer_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM volunteers v
      WHERE v.id = volunteer_memberships.volunteer_id
        AND v.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "volunteer_memberships_admin"
  ON volunteer_memberships FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Shifts: visible to all volunteers, managed by admin/employee
CREATE POLICY "shifts_select_volunteer"
  ON shifts FOR SELECT
  USING (has_any_role(ARRAY['volunteer', 'employee', 'admin', 'executive_director']));

CREATE POLICY "shifts_admin"
  ON shifts FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Shift signups: volunteers see their own
CREATE POLICY "shift_signups_select_own"
  ON shift_signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM volunteers v
      WHERE v.id = shift_signups.volunteer_id
        AND v.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "shift_signups_insert_own"
  ON shift_signups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM volunteers v
      WHERE v.id = shift_signups.volunteer_id
        AND v.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "shift_signups_admin"
  ON shift_signups FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- Background checks: users see their own
CREATE POLICY "background_checks_select_own"
  ON background_checks FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "background_checks_admin"
  ON background_checks FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

-- ============================================================================
-- EMPLOYEE SYSTEM POLICIES
-- ============================================================================

-- Employees: see their own record
CREATE POLICY "employees_select_own"
  ON employees FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "employees_admin"
  ON employees FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Employee schedules: employees see their own
CREATE POLICY "employee_schedules_select_own"
  ON employee_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_schedules.employee_id
        AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY "employee_schedules_admin"
  ON employee_schedules FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Trainings: employees can view all trainings
CREATE POLICY "trainings_select_employee"
  ON trainings FOR SELECT
  USING (has_any_role(ARRAY['employee', 'admin', 'executive_director']));

CREATE POLICY "trainings_admin"
  ON trainings FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Training completions: employees see their own
CREATE POLICY "training_completions_select_own"
  ON training_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = training_completions.employee_id
        AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY "training_completions_insert_own"
  ON training_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = training_completions.employee_id
        AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY "training_completions_admin"
  ON training_completions FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Employee documents: employees see their own + org-wide
CREATE POLICY "employee_documents_select_own"
  ON employee_documents FOR SELECT
  USING (
    is_org_wide = true
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_documents.employee_id
        AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY "employee_documents_admin"
  ON employee_documents FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- ============================================================================
-- GOVERNANCE POLICIES
-- ============================================================================

-- Board meetings: board members + ED + admin
CREATE POLICY "board_meetings_select_board"
  ON board_meetings FOR SELECT
  USING (has_any_role(ARRAY['board_member', 'executive_director', 'admin']));

CREATE POLICY "board_meetings_admin"
  ON board_meetings FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Meeting agendas: same as meetings
CREATE POLICY "meeting_agendas_select_board"
  ON meeting_agendas FOR SELECT
  USING (has_any_role(ARRAY['board_member', 'executive_director', 'admin']));

CREATE POLICY "meeting_agendas_admin"
  ON meeting_agendas FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Board votes: board members can view and vote
CREATE POLICY "board_votes_select_board"
  ON board_votes FOR SELECT
  USING (has_any_role(ARRAY['board_member', 'executive_director', 'admin']));

CREATE POLICY "board_votes_admin"
  ON board_votes FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Vote records: board members see all votes, can insert their own
CREATE POLICY "vote_records_select_board"
  ON vote_records FOR SELECT
  USING (has_any_role(ARRAY['board_member', 'executive_director', 'admin']));

CREATE POLICY "vote_records_insert_own"
  ON vote_records FOR INSERT
  WITH CHECK (
    member_id = auth.uid()
    AND has_role('board_member')
  );

CREATE POLICY "vote_records_admin"
  ON vote_records FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Policies/bylaws: visibility-based access
CREATE POLICY "policies_select_public"
  ON policies FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'all_roles' AND auth.uid() IS NOT NULL)
    OR (visibility = 'employees' AND has_any_role(ARRAY['employee', 'executive_director', 'admin']))
    OR (visibility = 'board_only' AND has_any_role(ARRAY['board_member', 'executive_director', 'admin']))
  );

CREATE POLICY "policies_admin"
  ON policies FOR ALL
  USING (is_admin() OR has_role('executive_director'));

-- Meeting attendance: board members see all, can update their own
CREATE POLICY "meeting_attendance_select_board"
  ON meeting_attendance FOR SELECT
  USING (has_any_role(ARRAY['board_member', 'executive_director', 'admin']));

CREATE POLICY "meeting_attendance_update_own"
  ON meeting_attendance FOR UPDATE
  USING (member_id = auth.uid());

CREATE POLICY "meeting_attendance_admin"
  ON meeting_attendance FOR ALL
  USING (is_admin() OR has_role('executive_director'));
