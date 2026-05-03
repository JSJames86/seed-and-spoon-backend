-- Migration: 011_donor_fundraising_module.sql
-- Purpose: Donor/Development Ops module
--
-- Adds:
--   1. campaigns       - Fundraising campaigns with goals and channels
--   2. gifts           - All gift types (Stripe + non-Stripe) attributed to donors/campaigns
--   3. acknowledgments - IRS-compliant thank-you tracking per gift
--   4. reconciliations - Monthly Stripe vs DB balance audits
--
-- Design notes:
--   - `gifts` complements (does not replace) the existing `donations` table.
--     `donations` tracks raw Stripe payment events; `gifts` is the fundraising
--     record that covers all payment methods and carries campaign attribution.
--     Stripe-sourced gifts carry a `donation_id` FK back to `donations`.
--   - `acknowledgments.irs_compliant` flags whether the letter meets IRS
--     contemporaneous written acknowledgment requirements (gifts >= $250).

-- ============================================================================
-- 1. CAMPAIGNS
-- ============================================================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goal DECIMAL(12, 2),                          -- fundraising goal in USD
  channel VARCHAR(100),                          -- 'email', 'direct_mail', 'event', 'online', 'major_gifts', 'grant', 'other'
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active',           -- 'draft', 'active', 'completed', 'cancelled'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. GIFTS
-- ============================================================================
-- Fundraising-level gift record that supports all payment methods.
-- Stripe-sourced gifts link back to `donations` via donation_id.

CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,  -- Stripe-sourced only
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  gift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'stripe',   -- 'stripe', 'check', 'cash', 'wire', 'stock', 'in_kind', 'other'
  check_number VARCHAR(50),                       -- for check payments
  in_kind_description TEXT,                       -- for in-kind gifts
  fund_designation VARCHAR(255),                  -- where the gift is directed (e.g., 'general', 'capital', program name)
  acknowledgment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'not_required'
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gifts_donor ON gifts(donor_id);
CREATE INDEX idx_gifts_campaign ON gifts(campaign_id);
CREATE INDEX idx_gifts_donation ON gifts(donation_id);
CREATE INDEX idx_gifts_date ON gifts(gift_date);
CREATE INDEX idx_gifts_acknowledgment_status ON gifts(acknowledgment_status);
CREATE INDEX idx_gifts_payment_method ON gifts(payment_method);

CREATE TRIGGER update_gifts_updated_at BEFORE UPDATE ON gifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ACKNOWLEDGMENTS
-- ============================================================================
-- IRS-compliant contemporaneous written acknowledgments.
-- Required for all gifts >= $250 under IRC § 170(f)(8).

CREATE TABLE acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL DEFAULT 'email',   -- 'email', 'letter', 'both'
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  irs_compliant BOOLEAN DEFAULT false,           -- true once all required language is confirmed present
  template_used VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',          -- 'pending', 'sent', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_acknowledgments_gift ON acknowledgments(gift_id);
CREATE INDEX idx_acknowledgments_donor ON acknowledgments(donor_id);
CREATE INDEX idx_acknowledgments_status ON acknowledgments(status);
CREATE INDEX idx_acknowledgments_sent_at ON acknowledgments(sent_at);

CREATE TRIGGER update_acknowledgments_updated_at BEFORE UPDATE ON acknowledgments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. RECONCILIATIONS
-- ============================================================================
-- Monthly audit comparing Stripe payouts to gift records in the database.

CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  stripe_total DECIMAL(12, 2),                  -- sum from Stripe dashboard/API
  db_total DECIMAL(12, 2),                      -- sum of gifts in DB for the period
  variance DECIMAL(12, 2) GENERATED ALWAYS AS (stripe_total - db_total) STORED,
  transaction_count_stripe INTEGER,
  transaction_count_db INTEGER,
  status VARCHAR(50) DEFAULT 'pending',         -- 'pending', 'in_review', 'reconciled', 'flagged'
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_year, period_month)
);

CREATE INDEX idx_reconciliations_period ON reconciliations(period_year, period_month);
CREATE INDEX idx_reconciliations_status ON reconciliations(status);

CREATE TRIGGER update_reconciliations_updated_at BEFORE UPDATE ON reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. RLS
-- ============================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

-- Staff (admin/ED/employee) can read and write all fundraising data.
-- Donors cannot read other donors' gift records via RLS even if they hit the API
-- directly; the API layer further enforces admin-only access.

CREATE POLICY "Staff full access to campaigns"
  ON campaigns FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

CREATE POLICY "Staff full access to gifts"
  ON gifts FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

CREATE POLICY "Staff full access to acknowledgments"
  ON acknowledgments FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));

CREATE POLICY "Staff full access to reconciliations"
  ON reconciliations FOR ALL
  USING (is_admin() OR has_any_role(ARRAY['executive_director', 'employee']));
