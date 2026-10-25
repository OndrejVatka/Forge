-- Clear the objects a Forge backup recreates, so the restore that follows in
-- the same transaction starts from nothing. Run by forge-ops before every
-- restore; never on its own.
--
-- Objects that belong to an extension are skipped: dropping those would take
-- the extension (and anything else using it) with them.

DROP SCHEMA IF EXISTS forge_meta CASCADE;

DO $$
DECLARE
  stmt text;
BEGIN
  FOR stmt IN
    SELECT format('DROP TABLE IF EXISTS public.%I CASCADE', c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE stmt;
  END LOOP;

  FOR stmt IN
    SELECT format('DROP ROUTINE IF EXISTS public.%I(%s) CASCADE',
                  p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE stmt;
  END LOOP;
END
$$;
