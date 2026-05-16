-- Migration 000: Profiles table + auth trigger
-- Run this FIRST — before 001_initial_tables.sql
-- This must run before any other migration because authMiddleware.js
-- reads from the profiles table on every authenticated request.

-- ============================================================
-- PROFILES
-- One row per auth.users entry. Created automatically via trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255),
  full_name   VARCHAR(255),
  avatar_url  TEXT,
  role        VARCHAR(50) DEFAULT 'donor',   -- legacy single-role field
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role  ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role has full access (needed by authMiddleware.js)
CREATE POLICY "Service role full access profiles"
  ON profiles USING (auth.role() = 'service_role');

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Fires when a new user signs up via Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BACKFILL: create profiles for any existing auth users
-- Safe to run even if profiles already exist (ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO profiles (id, email, full_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'donor')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
