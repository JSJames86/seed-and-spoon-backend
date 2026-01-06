-- Phase 2: Admin Dashboard, Volunteer Management, Donor Management, and Calendar
-- Migration: 002_phase2_tables.sql

-- ============================================================================
-- VOLUNTEER TASKS
-- ============================================================================
-- Stores tasks that can be assigned to volunteers
CREATE TABLE volunteer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(100), -- e.g., 'food_sorting', 'delivery', 'event_support', 'admin'
  status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_by VARCHAR(255), -- admin user who assigned the task
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volunteer_tasks_volunteer ON volunteer_tasks(volunteer_id);
CREATE INDEX idx_volunteer_tasks_food_bank ON volunteer_tasks(food_bank_id);
CREATE INDEX idx_volunteer_tasks_status ON volunteer_tasks(status);
CREATE INDEX idx_volunteer_tasks_due_date ON volunteer_tasks(due_date);

-- ============================================================================
-- VOLUNTEER HOURS
-- ============================================================================
-- Tracks volunteer hours worked
CREATE TABLE volunteer_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE SET NULL,
  task_id UUID REFERENCES volunteer_tasks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  activity_type VARCHAR(100), -- e.g., 'food_distribution', 'sorting', 'delivery', 'admin', 'event'
  verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(255), -- admin user who verified the hours
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volunteer_hours_volunteer ON volunteer_hours(volunteer_id);
CREATE INDEX idx_volunteer_hours_food_bank ON volunteer_hours(food_bank_id);
CREATE INDEX idx_volunteer_hours_date ON volunteer_hours(date);
CREATE INDEX idx_volunteer_hours_verified ON volunteer_hours(verified);

-- ============================================================================
-- DONORS
-- ============================================================================
-- Stores donor contact information and preferences
CREATE TABLE donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  donor_type VARCHAR(50) DEFAULT 'individual', -- 'individual', 'organization', 'corporate'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'do_not_contact'
  preferred_contact_method VARCHAR(50), -- 'email', 'phone', 'mail'
  communication_preferences JSONB, -- e.g., { "newsletter": true, "receipts": true, "updates": false }
  tax_id VARCHAR(50), -- For organizations/corporate donors
  total_donated DECIMAL(10, 2) DEFAULT 0,
  donation_count INTEGER DEFAULT 0,
  first_donation_date TIMESTAMP WITH TIME ZONE,
  last_donation_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donors_email ON donors(email);
CREATE INDEX idx_donors_status ON donors(status);
CREATE INDEX idx_donors_type ON donors(donor_type);
CREATE INDEX idx_donors_total_donated ON donors(total_donated);

-- ============================================================================
-- EVENTS
-- ============================================================================
-- Stores nonprofit events for calendar management
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100), -- e.g., 'food_drive', 'volunteer_training', 'fundraiser', 'community_event'
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE SET NULL,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format for recurring events
  max_volunteers INTEGER,
  registered_volunteers INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  visibility VARCHAR(50) DEFAULT 'public', -- 'public', 'private', 'volunteers_only'
  google_calendar_id VARCHAR(255), -- For Google Calendar sync
  apple_calendar_id VARCHAR(255), -- For Apple Calendar sync
  organizer_email VARCHAR(255),
  organizer_name VARCHAR(255),
  contact_phone VARCHAR(20),
  metadata JSONB, -- Additional event-specific data
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_food_bank ON events(food_bank_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_visibility ON events(visibility);

-- ============================================================================
-- EVENT VOLUNTEERS
-- ============================================================================
-- Many-to-many relationship between events and volunteers
CREATE TABLE event_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'registered', -- 'registered', 'confirmed', 'attended', 'no_show', 'cancelled'
  role VARCHAR(100), -- e.g., 'volunteer', 'coordinator', 'leader'
  hours_credited DECIMAL(5, 2),
  notes TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, volunteer_id)
);

CREATE INDEX idx_event_volunteers_event ON event_volunteers(event_id);
CREATE INDEX idx_event_volunteers_volunteer ON event_volunteers(volunteer_id);
CREATE INDEX idx_event_volunteers_status ON event_volunteers(status);

-- ============================================================================
-- UPDATE DONATIONS TABLE
-- ============================================================================
-- Add donor_id to link donations to donor profiles
ALTER TABLE donations
ADD COLUMN donor_id UUID REFERENCES donors(id) ON DELETE SET NULL;

CREATE INDEX idx_donations_donor ON donations(donor_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_volunteer_tasks_updated_at BEFORE UPDATE ON volunteer_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteer_hours_updated_at BEFORE UPDATE ON volunteer_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_volunteers_updated_at BEFORE UPDATE ON event_volunteers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - Recommended for Production)
-- ============================================================================
-- Enable RLS on new tables
ALTER TABLE volunteer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_volunteers ENABLE ROW LEVEL SECURITY;

-- Public read access for public events
CREATE POLICY "Public read access for public events"
  ON events FOR SELECT
  USING (visibility = 'public' AND status IN ('scheduled', 'in_progress'));

-- Volunteers can view their own tasks and hours
CREATE POLICY "Volunteers can view their own tasks"
  ON volunteer_tasks FOR SELECT
  USING (auth.uid()::text = volunteer_id::text);

CREATE POLICY "Volunteers can view their own hours"
  ON volunteer_hours FOR SELECT
  USING (auth.uid()::text = volunteer_id::text);

-- Admin policies (will need to implement auth.user_role() function)
-- CREATE POLICY "Admins have full access" ...

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================
-- View for volunteer statistics
CREATE OR REPLACE VIEW volunteer_stats AS
SELECT
  v.id,
  v.name,
  v.email,
  v.status,
  COUNT(DISTINCT vh.id) as total_shifts,
  COALESCE(SUM(vh.hours), 0) as total_hours,
  COUNT(DISTINCT vt.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN vt.status = 'completed' THEN vt.id END) as completed_tasks
FROM volunteers v
LEFT JOIN volunteer_hours vh ON v.id = vh.volunteer_id AND vh.verified = true
LEFT JOIN volunteer_tasks vt ON v.id = vt.volunteer_id
GROUP BY v.id, v.name, v.email, v.status;

-- View for donor statistics
CREATE OR REPLACE VIEW donor_stats AS
SELECT
  d.id,
  d.email,
  d.name,
  d.donor_type,
  d.total_donated,
  d.donation_count,
  d.first_donation_date,
  d.last_donation_date,
  COUNT(don.id) as verified_donation_count,
  COALESCE(SUM(don.amount), 0) as verified_total_amount
FROM donors d
LEFT JOIN donations don ON d.id = don.donor_id AND don.status = 'succeeded'
GROUP BY d.id, d.email, d.name, d.donor_type, d.total_donated, d.donation_count, d.first_donation_date, d.last_donation_date;

-- View for event statistics
CREATE OR REPLACE VIEW event_stats AS
SELECT
  e.id,
  e.title,
  e.event_type,
  e.start_time,
  e.status,
  e.max_volunteers,
  COUNT(ev.id) as registered_count,
  COUNT(CASE WHEN ev.status = 'attended' THEN 1 END) as attended_count,
  COALESCE(SUM(ev.hours_credited), 0) as total_hours_credited
FROM events e
LEFT JOIN event_volunteers ev ON e.id = ev.event_id
GROUP BY e.id, e.title, e.event_type, e.start_time, e.status, e.max_volunteers;
