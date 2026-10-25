/**
 * Entries in a backup's table of contents that describe Supabase's own setup
 * rather than Forge's data: the `public` schema itself (its CREATE, comment
 * and grants) and default privileges, some of which belong to the platform's
 * `supabase_admin` role. Every Supabase project already has these, and the
 * `postgres` role may not recreate them.
 */
const PLATFORM_ENTRY =
  /^\d+; \d+ \d+ (SCHEMA - public |COMMENT - SCHEMA public |ACL - SCHEMA public |DEFAULT ACL )/;

/**
 * Filter `pg_restore --list` output down to the entries a restore should run,
 * for use with `pg_restore --use-list`.
 */
export function filterRestoreList(list: string): string {
  return list
    .split('\n')
    .filter((line) => !PLATFORM_ENTRY.test(line))
    .join('\n');
}
