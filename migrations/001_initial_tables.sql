-- Migration 001: Initial tables
-- food_banks, services, operating_hours, donations, volunteers, notes
-- Run this first in Supabase SQL Editor before any other migration.

-- ============================================================
-- FOOD BANKS
-- ============================================================
CREATE TABLE IF NOT EXISTS food_banks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  address     TEXT NOT NULL,
  city        VARCHAR(100),
  state       VARCHAR(2),
  zip_code    VARCHAR(10),
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  phone       VARCHAR(20),
  email       VARCHAR(255),
  website     VARCHAR(255),
  active      BOOLEAN DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_banks_active ON food_banks(active);
CREATE INDEX IF NOT EXISTS idx_food_banks_city   ON food_banks(city);
CREATE INDEX IF NOT EXISTS idx_food_banks_state  ON food_banks(state);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_bank_id  UUID REFERENCES food_banks(id) ON DELETE CASCADE,
  service_type  VARCHAR(100) NOT NULL,
  description   TEXT,
  eligibility   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_food_bank ON services(food_bank_id);

-- ============================================================
-- OPERATING HOURS
-- ============================================================
CREATE TABLE IF NOT EXISTS operating_hours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_bank_id  UUID REFERENCES food_banks(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun … 6=Sat
  open_time     TIME,
  close_time    TIME,
  is_closed     BOOLEAN DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operating_hours_food_bank ON operating_hours(food_bank_id);

-- ============================================================
-- DONATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS donations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id  VARCHAR(255) UNIQUE NOT NULL,
  amount                    DECIMAL(10, 2) NOT NULL,
  currency                  VARCHAR(3) DEFAULT 'usd',
  donor_email               VARCHAR(255),
  donor_name                VARCHAR(255),
  donor_id                  UUID,               -- FK added in 002 after donors table exists
  status                    VARCHAR(50) NOT NULL,
  metadata                  JSONB,
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_stripe_id  ON donations(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_status     ON donations(status);

-- ============================================================
-- VOLUNTEERS
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  age_range     VARCHAR(50),
  food_bank_id  UUID REFERENCES food_banks(id) ON DELETE SET NULL,
  availability  TEXT,
  interests     TEXT,
  status        VARCHAR(50) DEFAULT 'pending',  -- pending | active | inactive
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_status    ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_food_bank ON volunteers(food_bank_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_email     ON volunteers(email);

-- ============================================================
-- NOTES (polymorphic admin notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(50) NOT NULL,   -- 'food_bank' | 'volunteer' | 'donor' | etc.
  resource_id   UUID NOT NULL,
  content       TEXT NOT NULL,
  created_by    VARCHAR(255),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_resource    ON notes(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at  ON notes(created_at);

-- ============================================================
-- ROW LEVEL SECURITY — public read for directory tables
-- ============================================================
ALTER TABLE food_banks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;

-- Public read: active food banks + their services/hours
CREATE POLICY "Public read active food banks"
  ON food_banks FOR SELECT USING (active = true);

CREATE POLICY "Public read services"
  ON services FOR SELECT USING (true);

CREATE POLICY "Public read operating hours"
  ON operating_hours FOR SELECT USING (true);

-- Service role bypass (all API routes use service role key)
CREATE POLICY "Service role full access food_banks"
  ON food_banks USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access services"
  ON services USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access operating_hours"
  ON operating_hours USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access donations"
  ON donations USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access volunteers"
  ON volunteers USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access notes"
  ON notes USING (auth.role() = 'service_role');
