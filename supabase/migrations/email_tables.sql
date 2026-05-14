-- Migration: email_tables.sql
-- Purpose: Email marketing infrastructure for Seed & Spoon
-- Tables: email_subscribers, email_logs, email_sequences,
--         email_sequence_steps, email_enrollments

-- ============================================================================
-- 1. EMAIL SUBSCRIBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  first_name        TEXT,
  last_name         TEXT,
  segment           TEXT NOT NULL DEFAULT 'general',       -- 'general', 'donor', 'volunteer', 'client', 'board'
  source            TEXT NOT NULL DEFAULT 'api',            -- 'api', 'website', 'import', 'stripe', 'donation'
  status            TEXT NOT NULL DEFAULT 'subscribed',     -- 'subscribed', 'unsubscribed', 'bounced', 'complained'
  subscribed_at     TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at   TIMESTAMPTZ,
  metadata          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_email   ON email_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status  ON email_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_segment ON email_subscribers (segment);

-- ============================================================================
-- 2. EMAIL LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id      UUID REFERENCES email_subscribers (id) ON DELETE SET NULL,
  sequence_id        UUID,                                   -- FK added after email_sequences table
  recipient_email    TEXT NOT NULL,
  subject            TEXT NOT NULL,
  email_type         TEXT NOT NULL DEFAULT 'transactional', -- 'transactional', 'welcome', 'sequence', 'broadcast'
  status             TEXT NOT NULL DEFAULT 'pending',        -- 'pending', 'sent', 'failed', 'bounced', 'opened', 'clicked'
  resend_message_id  TEXT,
  error_message      TEXT,
  metadata           JSONB,
  sent_at            TIMESTAMPTZ,
  opened_at          TIMESTAMPTZ,
  clicked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_subscriber    ON email_logs (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient     ON email_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status        ON email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id     ON email_logs (resend_message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at       ON email_logs (sent_at);

-- ============================================================================
-- 3. EMAIL SEQUENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  segment     TEXT,                                         -- target segment, null = all
  status      TEXT NOT NULL DEFAULT 'draft',                -- 'draft', 'active', 'paused', 'archived'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Back-fill FK on email_logs now that email_sequences exists
ALTER TABLE email_logs
  ADD CONSTRAINT fk_email_logs_sequence
  FOREIGN KEY (sequence_id) REFERENCES email_sequences (id) ON DELETE SET NULL;

-- ============================================================================
-- 4. EMAIL SEQUENCE STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id   UUID NOT NULL REFERENCES email_sequences (id) ON DELETE CASCADE,
  step_number   INTEGER NOT NULL,
  subject       TEXT NOT NULL,
  delay_days    INTEGER NOT NULL DEFAULT 0,                 -- days after previous step (or enrollment)
  template_key  TEXT NOT NULL,                              -- e.g. 'welcome', 'follow_up_1', 'impact_report'
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sequence_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_seq ON email_sequence_steps (sequence_id);

-- ============================================================================
-- 5. EMAIL ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id   UUID NOT NULL REFERENCES email_subscribers (id) ON DELETE CASCADE,
  sequence_id     UUID NOT NULL REFERENCES email_sequences (id) ON DELETE CASCADE,
  current_step    INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active',           -- 'active', 'completed', 'paused', 'cancelled'
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  next_send_at    TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subscriber_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_email_enrollments_subscriber ON email_enrollments (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_sequence   ON email_enrollments (sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_status     ON email_enrollments (status);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_next_send  ON email_enrollments (next_send_at);

-- ============================================================================
-- 6. UPDATED_AT TRIGGER (shared helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_email_sequences_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_email_sequence_steps_updated_at
  BEFORE UPDATE ON email_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_email_enrollments_updated_at
  BEFORE UPDATE ON email_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE email_subscribers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_enrollments    ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; anon/authenticated users have no access by default.
-- Add explicit policies below if frontend read access is ever needed.
