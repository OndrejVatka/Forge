-- Migration 0002 — add `hermes` as a recognised agent identity
--
-- Widens the CHECK constraints on `tickets.created_by` and `comments.author`
-- so the Hermes agent is attributed to itself rather than defaulting to
-- `claude-code`. New installs get this from `db/schema.sql` directly and do
-- not need to run this file.
--
-- The new value sets are supersets of the old ones, so no existing row can
-- fail revalidation and no data is rewritten.
--
-- Run the whole file in the Supabase SQL Editor. It is wrapped in a
-- transaction, so it either fully applies or fully rolls back.

BEGIN;

-- The constraints are declared inline in `schema.sql`, so Postgres named them
-- `<table>_<column>_check`. IF EXISTS keeps this idempotent.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_created_by_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_created_by_check
  CHECK (created_by IN ('human', 'claude-code', 'codex', 'hermes'));

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_check;
ALTER TABLE comments ADD CONSTRAINT comments_author_check
  CHECK (author IN ('human', 'claude-code', 'codex', 'hermes', 'system'));

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Both constraints should now list `hermes`:
--
--   SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname IN ('tickets_created_by_check', 'comments_author_check');
--
-- If either row is missing, the constraint was named differently in your
-- database (e.g. created by hand). Find the real name with the same query
-- filtered on `conrelid = 'tickets'::regclass` and drop that one instead.
