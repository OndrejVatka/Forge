-- Forge — database schema
-- Run this in the Supabase SQL Editor to set up the full schema.
--
-- Differences from the original brief (intentional fixes):
--   1. RLS policies include `WITH CHECK (true)` so authenticated INSERTs are
--      allowed (a FOR ALL policy with only USING blocks inserts).
--   2. Status-change activity comments are written by a Postgres trigger rather
--      than by the MCP server, so UI drag-and-drop and MCP `update_ticket_status`
--      both produce identical `system` log entries. The MCP server therefore must
--      NOT also insert a status comment (it only adds the optional user comment).

-- ============================================================================
-- Tables
-- ============================================================================

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,             -- e.g. "proofindex", "second-brain"
  prefix TEXT NOT NULL UNIQUE,           -- e.g. "PI", "SB" — used in ticket IDs
  color TEXT NOT NULL DEFAULT '#6366f1', -- hex color for UI badge
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket sequence counter per project (for PI-42 style IDs)
CREATE TABLE project_ticket_sequences (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Tags (global, not per-project)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,             -- e.g. "feature", "bug", "chore"
  color TEXT NOT NULL DEFAULT '#94a3b8'  -- hex color for UI chip
);

-- Seed default tags
INSERT INTO tags (name, color) VALUES
  ('feature',     '#6366f1'),
  ('bug',         '#ef4444'),
  ('chore',       '#f59e0b'),
  ('improvement', '#10b981'),
  ('research',    '#3b82f6'),
  ('urgent',      '#dc2626');

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,        -- auto-incremented per project
  ticket_ref TEXT NOT NULL UNIQUE,       -- e.g. "PI-42" — computed on insert
  title TEXT NOT NULL,
  description TEXT,                      -- markdown supported
  acceptance_criteria TEXT,             -- markdown supported
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'in_dev', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  created_by TEXT NOT NULL DEFAULT 'human'
    CHECK (created_by IN ('human', 'claude-code', 'codex', 'hermes')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique ticket number per project
ALTER TABLE tickets ADD CONSTRAINT tickets_project_number_unique
  UNIQUE (project_id, ticket_number);

-- Ticket <-> Tag join table
CREATE TABLE ticket_tags (
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Comments / Activity log
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  body TEXT NOT NULL,                    -- markdown supported
  author TEXT NOT NULL DEFAULT 'human'
    CHECK (author IN ('human', 'claude-code', 'codex', 'hermes', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Functions & triggers
-- ============================================================================

-- Auto-update updated_at on tickets
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atomically get the next ticket number for a project.
CREATE OR REPLACE FUNCTION next_ticket_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO project_ticket_sequences (project_id, last_number)
    VALUES (p_project_id, 1)
    ON CONFLICT (project_id)
    DO UPDATE SET last_number = project_ticket_sequences.last_number + 1
    RETURNING last_number INTO next_num;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Log a `system` comment whenever a ticket's status changes, regardless of
-- whether the change came from the web UI (direct Supabase write) or the MCP
-- server. Keeps the activity log consistent across both write paths.
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO comments (ticket_id, body, author)
    VALUES (
      NEW.id,
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_status_change
  AFTER UPDATE OF status ON tickets
  FOR EACH ROW EXECUTE FUNCTION log_ticket_status_change();

-- ============================================================================
-- Access control
-- ============================================================================
-- Forge is a single-operator tool: there is no per-user ownership in the data
-- model, so anyone with access sees the whole board. Access is therefore an
-- explicit allowlist of email addresses rather than "any logged-in user".
--
-- Two clients, two paths:
--   * The MCP server uses the service role key, which bypasses RLS entirely.
--   * The web UI uses the anon key as an authenticated user, and every policy
--     below requires that user's email to be present in `allowed_users`.
--
-- Signing up is still possible unless you also disable it in the Supabase
-- dashboard (Authentication -> Sign In / Providers -> Email). It just gets the
-- stranger nothing: no row in `allowed_users` means every read returns empty
-- and every write is rejected.

-- Emails permitted to use the board. Seed this with your own address BEFORE
-- running the policies below, or you will lock yourself out of your own app.
CREATE TABLE allowed_users (
  email TEXT PRIMARY KEY,
  note TEXT,                             -- optional: who this is
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No policy is defined for `allowed_users`, which means no client using the
-- anon key can read or modify it. Manage it from the SQL Editor or the Table
-- Editor (both run as the service role).
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- TODO: replace with your own email before running this file.
INSERT INTO allowed_users (email, note) VALUES ('you@example.com', 'owner');

/**
 * True when the caller's JWT email is on the allowlist.
 *
 * SECURITY DEFINER is required: `allowed_users` is unreadable by the
 * `authenticated` role, so the check has to run as the function owner.
 * `search_path` is pinned to defeat search-path hijacking, which is the
 * standard hardening for a SECURITY DEFINER function.
 */
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

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_ticket_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allowlisted users can read/write everything; everyone else sees nothing.
-- `is_allowed_user()` is wrapped in a scalar subquery so Postgres evaluates it
-- once per statement rather than once per row.
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

-- ============================================================================
-- Realtime
-- ============================================================================
-- Add the tables the web UI subscribes to into the realtime publication, so
-- the board updates live when Claude Code creates or moves a ticket.
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
