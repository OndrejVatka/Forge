-- Run by forge-ops in the same transaction as the migration it records.
-- psql substitutes :'name' as a quoted literal, so values are never spliced
-- into the SQL text.
INSERT INTO forge_meta.schema_migrations (name, checksum)
VALUES (:'migration_name', :'migration_checksum');
