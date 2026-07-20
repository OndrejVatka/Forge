-- Migration 0001 — restrict board access to an email allowlist
--
-- Applies to databases created from a version of `db/schema.sql` whose RLS
-- policies were `USING (true)`, which granted every authenticated user full
-- read/write access to every table. New installs get this from `schema.sql`
-- directly and do not need to run this file.
--
-- ⚠️  STOP: edit the INSERT in step 2 to your own email address first.
--     Running this with the placeholder left in will lock you out of your
--     own board. (Recovery is possible from the SQL Editor, which runs as
--     the service role and ignores RLS — but it is easier not to.)
--
-- Run the whole file in the Supabase SQL Editor. It is wrapped in a
-- transaction, so it either fully applies or fully rolls back.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Allowlist table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No policy is defined, so no anon-key client can read or modify this table.
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Seed yourself — EDIT THIS LINE
-- ---------------------------------------------------------------------------
INSERT INTO allowed_users (email, note)
VALUES ('you@example.com', 'owner')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Allowlist check
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can read `allowed_users`, which the `authenticated`
-- role cannot. search_path is pinned to defeat search-path hijacking.
CREATE OR REPLACE FUNCTION is_allowed_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_users
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Swap the policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_full_access" ON projects;
DROP POLICY IF EXISTS "auth_full_access" ON project_ticket_sequences;
DROP POLICY IF EXISTS "auth_full_access" ON tickets;
DROP POLICY IF EXISTS "auth_full_access" ON tags;
DROP POLICY IF EXISTS "auth_full_access" ON ticket_tags;
DROP POLICY IF EXISTS "auth_full_access" ON comments;

CREATE POLICY "allowlisted_full_access" ON projects
  FOR ALL TO authenticated
  USING ((SELECT is_allowed_user())) WITH CHECK ((SELECT is_allowed_user()));
CREATE POLICY "allowlisted_full_access" ON project_ticket_sequences
  FOR ALL TO authenticated
  USING ((SELECT is_allowed_user())) WITH CHECK ((SELECT is_allowed_user()));
CREATE POLICY "allowlisted_full_access" ON tickets
  FOR ALL TO authenticated
  USING ((SELECT is_allowed_user())) WITH CHECK ((SELECT is_allowed_user()));
CREATE POLICY "allowlisted_full_access" ON tags
  FOR ALL TO authenticated
  USING ((SELECT is_allowed_user())) WITH CHECK ((SELECT is_allowed_user()));
CREATE POLICY "allowlisted_full_access" ON ticket_tags
  FOR ALL TO authenticated
  USING ((SELECT is_allowed_user())) WITH CHECK ((SELECT is_allowed_user()));
CREATE POLICY "allowlisted_full_access" ON comments
  FOR ALL TO authenticated
  USING ((SELECT is_allowed_user())) WITH CHECK ((SELECT is_allowed_user()));

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Every table should now show `allowlisted_full_access` and nothing else:
--
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename;
--
-- Then reload the web UI. Your own board should look exactly as before. If it
-- is suddenly empty, the email in step 2 does not match the one on your
-- Supabase auth user — check with:
--
--   SELECT email FROM auth.users;
