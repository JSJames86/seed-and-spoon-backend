# Supabase RLS & Permission Architecture

> Seed & Spoon NJ - Nonprofit CRM
> Last updated: 2026-01-22

---

## 1. Role Model

### Role Hierarchy (Least to Most Privilege)

| Role | Description | Scope |
|------|-------------|-------|
| `public` | Unauthenticated visitors | Read-only on public resources (food_resources, pantries, public policies) |
| `client` | Service recipients | Own household, enrollments, intakes, reports |
| `donor` | Financial/in-kind contributors | Own donations, tax docs, recurring configs |
| `volunteer` | Time donors | Own shifts, hours, groups, memberships |
| `employee` | Paid staff | Read access to client/donor/volunteer data for service delivery |
| `board_member` | Board directors | Governance data (meetings, votes, policies) |
| `executive_director` | ED with full org visibility | Everything except system administration |
| `admin` | System administrators | Full technical access, role management |

### Permission Matrix

| Role | Read Own | Read Others | Write Own | Write Others | Delete | Manage Roles |
|------|----------|-------------|-----------|--------------|--------|--------------|
| public | - | Public resources only | - | - | - | - |
| client | Yes | - | Yes (limited) | - | - | - |
| donor | Yes | - | Yes (limited) | - | - | - |
| volunteer | Yes | - | Yes (limited) | - | - | - |
| employee | Yes | Clients, donors, volunteers (read-only) | Yes | - | - | - |
| board_member | Yes | Governance data | Yes (votes) | - | - | - |
| executive_director | Yes | Everything | Yes | Yes | Yes (non-system) | Yes (non-admin) |
| admin | Yes | Everything | Yes | Yes | Yes | Yes |

### Key Principle: Multi-Role Support

A single user can hold multiple roles simultaneously. For example:
- An employee who is also a board member
- A volunteer who is also a donor
- An ED who is also a board member

The `role_assignments` table handles this via a many-to-many relationship:

```
profiles (1) ---> (N) role_assignments (N) <--- (1) roles
```

RLS policies use `has_role()` / `has_any_role()` checks that query active assignments.

---

## 2. RLS Patterns

### Helper Functions (The Foundation)

All RLS logic flows through a small set of `SECURITY DEFINER` functions. This is the single source of truth for role checks.

| Function | Purpose | Used When |
|----------|---------|-----------|
| `is_admin()` | Check admin role (legacy + role_assignments) | System-level operations |
| `has_role(name)` | Check specific role | Role-gated access |
| `has_any_role(names[])` | Check if user has any of the listed roles | Multi-role gates |
| `is_staff()` | Shorthand for employee + ED + admin | Service delivery access |
| `is_elevated()` | Shorthand for ED + admin | Write access to others' data |
| `owns_profile(uuid)` | Check if a profile_id belongs to current user | Ownership checks |

**Why functions instead of inline checks:**
1. Single point of change when role logic evolves
2. No duplication across dozens of policies
3. `SECURITY DEFINER` ensures the check runs with elevated permissions (can read role_assignments)
4. `SET search_path = ''` prevents injection attacks

### Pattern 1: Own-Record Access

```sql
CREATE POLICY "table_select_own"
  ON some_table FOR SELECT
  USING (profile_id = (select auth.uid()));
```

Use when: The table has a direct `profile_id` FK to the authenticated user.

**Performance note:** Always use `(select auth.uid())` instead of bare `auth.uid()`. The subselect is evaluated once per query; the bare call is evaluated per row.

### Pattern 2: Indirect Ownership (Join-Based)

```sql
CREATE POLICY "household_members_select_own"
  ON household_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = household_members.household_id
        AND h.primary_contact_id = (select auth.uid())
    )
  );
```

Use when: Ownership is determined through a parent table (e.g., household members belong to a household, which has a primary contact).

### Pattern 3: Role-Gated Access

```sql
CREATE POLICY "shifts_select_volunteer"
  ON shifts FOR SELECT
  USING (has_any_role(ARRAY['volunteer', 'employee', 'admin', 'executive_director']));
```

Use when: Access is determined by role, not ownership.

### Pattern 4: Tiered Access (Read vs. Write)

```sql
-- Staff can READ
CREATE POLICY "donations_select_staff"
  ON donations FOR SELECT
  USING (is_staff());

-- Only elevated can WRITE
CREATE POLICY "donations_elevated_modify"
  ON donations FOR INSERT
  WITH CHECK (is_elevated());
```

Use when: Different privilege levels need different operations. This is the most common pattern for sensitive data.

### Pattern 5: Visibility-Based Access

```sql
CREATE POLICY "policies_select_by_visibility"
  ON policies FOR SELECT
  USING (
    is_elevated()
    OR (
      status = 'active'
      AND (
        visibility = 'public'
        OR (visibility = 'all_roles' AND auth.uid() IS NOT NULL)
        OR (visibility = 'employees' AND is_staff())
        OR (visibility = 'board_only' AND has_any_role(ARRAY['board_member', 'executive_director', 'admin']))
      )
    )
  );
```

Use when: The row itself declares who can see it via a visibility/access column.

### Pattern 6: Conditional Sensitivity

```sql
CREATE POLICY "client_reports_staff_read"
  ON client_reports FOR SELECT
  USING (
    is_staff()
    AND (
      has_any_role(ARRAY['admin', 'executive_director'])
      OR (
        severity != 'critical'
        AND report_type NOT IN ('safety_concern', 'staff_behavior')
      )
    )
  );
```

Use when: Some rows in a table are more sensitive than others. Regular staff see most records, but sensitive ones are elevated-only.

---

## 3. Table-by-Table Strategy

### Identity & Access

| Table | Own Record | Staff Read | Elevated Write | Notes |
|-------|-----------|------------|----------------|-------|
| `profiles` | SELECT, UPDATE, INSERT | SELECT | UPDATE, DELETE | Users can't change their own `role` field |
| `roles` | SELECT (all authenticated) | - | - | Lookup table, read-only |
| `role_assignments` | SELECT own | - | ALL | Guarded by `prevent_privilege_escalation()` trigger |

### Client CRM

| Table | Client Access | Staff Access | Elevated Access | Notes |
|-------|---------------|--------------|-----------------|-------|
| `households` | SELECT/UPDATE own (via primary_contact) | SELECT all | ALL | Clients manage their own household |
| `household_members` | SELECT/INSERT/UPDATE own household | SELECT all | ALL | **Youth data: only staff+** |
| `programs` | SELECT active | SELECT all | ALL | Active programs visible to all authenticated |
| `program_enrollments` | SELECT/INSERT own | SELECT all | ALL | Clients can self-enroll |
| `intakes` | SELECT/INSERT/UPDATE/DELETE own | SELECT all | ALL | Staff read for service delivery |
| `client_reports` | SELECT/INSERT own | SELECT non-sensitive | ALL | **Critical/safety: elevated only** |

### Donor CRM

| Table | Donor Access | Staff Access | Elevated Access | Notes |
|-------|-------------|--------------|-----------------|-------|
| `donors` | SELECT own (email or profile_id) | SELECT all | INSERT/UPDATE/DELETE | Linked via email (legacy) + profile_id |
| `donations` | SELECT own (by email) | SELECT all | INSERT/UPDATE/DELETE | Staff read-only for dashboards |
| `recurring_donations` | SELECT/UPDATE own | SELECT all | ALL | Donors can pause/cancel their own |
| `tax_documents` | SELECT own (via donor) | - | ALL | Only donors + elevated see tax docs |
| `donor_events` | SELECT (donor role) | - | ALL | Event access for donors |

### Volunteer System

| Table | Volunteer Access | Staff Access | Elevated Access | Notes |
|-------|-----------------|--------------|-----------------|-------|
| `volunteers` | SELECT own | SELECT all | ALL | **Youth guardian info: staff only** |
| `volunteer_groups` | SELECT active | SELECT all | ALL | Leaders can UPDATE own group |
| `volunteer_memberships` | SELECT own | SELECT all | ALL | Via volunteer email join |
| `shifts` | SELECT (volunteer role) | SELECT all | ALL | Open shifts visible to volunteers |
| `shift_signups` | SELECT/INSERT own | SELECT all | ALL | Volunteers can sign up |
| `volunteer_hours` | - | - | ALL | Admin manages hours |
| `volunteer_tasks` | - | - | ALL | Admin manages tasks |
| `background_checks` | SELECT own | - | ALL | **Sensitive PII: elevated only** |

### Employee System

| Table | Employee Access | Staff Access | Elevated Access | Notes |
|-------|----------------|--------------|-----------------|-------|
| `employees` | SELECT own | - | ALL | Can't see other employees' records |
| `employee_schedules` | SELECT own | - | ALL | Own schedule only |
| `trainings` | SELECT (employee role) | - | ALL | All trainings visible to employees |
| `training_completions` | SELECT/INSERT own | - | ALL | Employees mark own completions |
| `employee_documents` | SELECT own + org-wide | - | ALL | Personal docs + company-wide |

### Governance

| Table | Board Access | Staff Access | Elevated Access | Notes |
|-------|-------------|--------------|-----------------|-------|
| `board_meetings` | SELECT | - | ALL | Board + ED + admin can view |
| `meeting_agendas` | SELECT | - | ALL | Same as meetings |
| `board_votes` | SELECT | - | ALL | Board can view vote status |
| `vote_records` | SELECT, INSERT own | - | SELECT, DELETE (admin only) | **Immutable after cast** |
| `policies` | SELECT (by visibility) | SELECT (employees visibility) | ALL | Draft policies: elevated only |
| `meeting_attendance` | SELECT, UPDATE own | - | ALL | Members update own attendance |

### System

| Table | Access | Notes |
|-------|--------|-------|
| `audit_log` | SELECT (elevated only) | **Append-only**, written by triggers |
| `food_resources` | SELECT (public) | Anyone can view |
| `pantries` | SELECT (public) | Anyone can view |

---

## 4. Audit & Safety Considerations

### Audit Logging

The `audit_log` table automatically captures:
- **Who** performed the action (actor_id, email, roles snapshot)
- **What** changed (table, record, old/new data, changed columns)
- **When** it happened (timestamp)
- **Severity** classification (info / warning / critical)

**Audited tables:**
- `role_assignments` (critical) - All privilege changes
- `profiles` (warning) - Identity changes
- `donations` / `recurring_donations` (warning/critical) - Financial records
- `household_members` (warning) - Youth data changes
- `background_checks` (critical on delete) - Sensitive PII
- `client_reports` (critical on delete) - Incident reports
- `board_votes` / `vote_records` (info) - Governance accountability
- `employee_documents` (info) - HR records

**Severity levels:**
- `info` - Normal operations (inserts, routine updates)
- `warning` - Sensitive changes (profile updates, financial modifications, youth data)
- `critical` - Privilege escalation, deletions of sensitive records

### Privilege Escalation Prevention

The `prevent_privilege_escalation()` trigger enforces:
1. **No self-assignment** - You cannot assign roles to yourself
2. **Admin-only for admin** - Only existing admins can create new admins
3. **ED/Admin for ED** - Only existing ED or admin can assign ED role

These rules are enforced at the database level, not the application level.

### Youth Data Protection (Under 18)

Youth data receives enhanced protection:
- `household_members` where `is_minor = true` - Only staff can view
- `volunteers` where `is_youth = true` - Guardian contact info restricted to staff
- Volunteers and donors NEVER see youth records
- All changes to `household_members` are audited with `warning` severity

### Incident Report Safety

`client_reports` with sensitive content are isolated:
- Reports with `severity = 'critical'` - ED + admin only
- Reports with `report_type = 'safety_concern'` - ED + admin only
- Reports with `report_type = 'staff_behavior'` - ED + admin only (prevents staff seeing complaints about themselves)
- Regular employees see non-sensitive reports for service delivery
- All report deletions are logged as `critical` severity

---

## 5. Common Mistakes to Avoid

### 1. Overly Permissive Policies

**Bad:**
```sql
CREATE POLICY "employees_can_do_everything"
  ON households FOR ALL
  USING (has_role('employee'));
```

**Good:**
```sql
-- Read access for service delivery
CREATE POLICY "households_select_staff"
  ON households FOR SELECT
  USING (is_staff());

-- Write access requires elevated
CREATE POLICY "households_elevated_modify"
  ON households FOR INSERT
  WITH CHECK (is_elevated());
```

Employees need to READ client data. They should NOT be able to DELETE households or modify financial records.

### 2. Frontend-Only Role Checks

RLS is the source of truth. The frontend middleware (`authMiddleware.js`) is a UX optimization, not a security boundary.

```
[Client] ---> [API Middleware: check role] ---> [Supabase: RLS enforced]
                   ^                                    ^
              UX only (nice error msgs)         ACTUAL security
```

If someone bypasses the API and hits Supabase directly with their JWT, RLS still protects the data.

### 3. "Admin Can Do Everything" Shortcuts

**Bad:**
```sql
CREATE POLICY "admin_bypass"
  ON sensitive_table FOR ALL
  USING (is_admin());
```

Even admins should not:
- Assign roles to themselves
- Delete audit logs
- Modify cast votes
- Access data without leaving an audit trail

The `prevent_privilege_escalation()` trigger and audit triggers apply to everyone, including admins.

### 4. Policy Sprawl

**Bad:** 6 separate policies for one table that could be 3.

**Good:** Use helper functions to consolidate:
```sql
-- One policy for own-record access
-- One policy for staff read access
-- One policy for elevated write access
```

Target: 2-4 policies per table maximum.

### 5. Missing `SET search_path` on SECURITY DEFINER Functions

Every `SECURITY DEFINER` function MUST include `SET search_path = ''`. Without this, an attacker can create a malicious schema with the same function names and trick the function into executing their code.

### 6. Bare `auth.uid()` in Policies

**Bad:**
```sql
USING (profile_id = auth.uid())
```

**Good:**
```sql
USING (profile_id = (select auth.uid()))
```

The subselect is evaluated once per query. The bare function call is evaluated per row, which destroys performance on large tables.

### 7. Email-Based Identity Joins

**Bad (fragile):**
```sql
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()))
```

**Better (stable FK):**
```sql
USING (profile_id = (select auth.uid()))
```

Email-based joins break when users change their email. Always prefer UUID foreign keys. The `donors.profile_id` column was added for this reason.

### 8. Forgetting RLS on New Tables

Every `CREATE TABLE` should be immediately followed by `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. A table without RLS is completely open to any authenticated user via the Supabase client.

### 9. Trusting `FOR ALL` Without Thinking

`FOR ALL` applies to SELECT, INSERT, UPDATE, and DELETE. If your USING clause only makes sense for reads, don't use `FOR ALL`. Split into separate policies per operation.

### 10. Not Testing with Different Roles

Always test policies by:
1. Creating test users with each role
2. Attempting to read/write data they shouldn't access
3. Verifying audit logs capture the actions
4. Confirming `prevent_privilege_escalation()` blocks self-assignment

---

## 6. Migration Order

Migrations should be applied in sequence:

1. `008_fix_rls_helper_functions.sql` - Fix existing functions, add new helpers
2. `009_audit_logging.sql` - Audit table, triggers, escalation guard
3. `010_enhanced_rls_policies.sql` - Tighten policies, add protections

These build on existing migrations 003-007 and are backward-compatible.

---

## 7. Decision Log

| Decision | Rationale |
|----------|-----------|
| SECURITY DEFINER for all helper functions | Allows functions to read role_assignments regardless of caller's RLS |
| Separate `is_staff()` from `is_elevated()` | Staff = can read. Elevated = can write. Clear separation of read/write privilege |
| Audit log is append-only | Prevents tampering. Even admins can't delete audit records via RLS |
| Email-based donor link preserved | Backward compatibility. profile_id added as the preferred path forward |
| Vote records are immutable | Board governance integrity. Cast votes cannot be changed, only deleted by admin (with audit trail) |
| Youth data restricted to staff+ | Regulatory compliance. Volunteers/donors have no business seeing minor details |
| Incident reports tiered by sensitivity | Prevents staff from seeing complaints about themselves |
| No `public` role in role_assignments | Public access is handled by Supabase's `anon` key + RLS policies using `USING (true)` |
