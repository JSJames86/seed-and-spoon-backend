-- Seed: email_sequences_seed.sql
-- Purpose: Insert the 3 core drip sequences for Seed & Spoon
-- Run AFTER email_tables.sql

-- ============================================================================
-- SEQUENCES
-- ============================================================================

INSERT INTO email_sequences (id, name, description, segment, status) VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Donor Onboarding',
    'Three-step sequence for new donors: thank you → impact story → recurring giving ask',
    'donor',
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Volunteer Welcome',
    'Three-step sequence for new volunteers: welcome → first shift tips → community spotlight',
    'volunteer',
    'active'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'General Newsletter Onboarding',
    'Two-step welcome sequence for general subscribers before monthly broadcasts begin',
    'general',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEQUENCE STEPS
-- ============================================================================

-- Donor Onboarding steps
INSERT INTO email_sequence_steps (sequence_id, step_number, subject, delay_days, template_key) VALUES
  ('a1000000-0000-0000-0000-000000000001', 1, 'Thank you for your gift to Seed & Spoon 💚',            0,  'donor_thank_you'),
  ('a1000000-0000-0000-0000-000000000001', 2, 'Here''s what your gift made possible',                   3,  'donor_impact_story'),
  ('a1000000-0000-0000-0000-000000000001', 3, 'Make your impact ongoing — join our recurring donors',   14, 'donor_recurring_ask')
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- Volunteer Welcome steps
INSERT INTO email_sequence_steps (sequence_id, step_number, subject, delay_days, template_key) VALUES
  ('a1000000-0000-0000-0000-000000000002', 1, 'Welcome to the Seed & Spoon volunteer family 🌱',        0,  'volunteer_welcome'),
  ('a1000000-0000-0000-0000-000000000002', 2, 'Your first shift — what to expect',                      2,  'volunteer_shift_tips'),
  ('a1000000-0000-0000-0000-000000000002', 3, 'Meet someone whose life you''re changing',               7,  'volunteer_community_spotlight')
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- Newsletter Onboarding steps
INSERT INTO email_sequence_steps (sequence_id, step_number, subject, delay_days, template_key) VALUES
  ('a1000000-0000-0000-0000-000000000003', 1, 'Welcome to the Seed & Spoon community 🌱',               0,  'newsletter_welcome'),
  ('a1000000-0000-0000-0000-000000000003', 2, 'Your first look at our impact in Newark',                7,  'newsletter_monthly_impact')
ON CONFLICT (sequence_id, step_number) DO NOTHING;
