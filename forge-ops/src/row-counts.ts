import { runPg, type PgConnection } from './pg.js';

export type RowCounts = Record<string, number>;

/**
 * Exact row count for every table in `public`, in one statement.
 * query_to_xml runs a per-table count(*) built with format('%I'), so table
 * names are quoted by Postgres and nothing is concatenated on our side.
 */
const ROW_COUNTS_SQL = `
select t.table_name || '\t' || (xpath('/row/c/text()',
  query_to_xml(format('select count(*) as c from public.%I', t.table_name), false, true, '')))[1]::text
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by t.table_name`;

/** Count rows in every `public` table of a database. */
export async function fetchRowCounts(connection: PgConnection, pgBin?: string): Promise<RowCounts> {
  const output = await runPg(
    'psql',
    connection,
    ['--no-psqlrc', '--tuples-only', '--no-align', '-v', 'ON_ERROR_STOP=1', '-c', ROW_COUNTS_SQL],
    pgBin,
  );
  return parseRowCounts(output);
}

/** Parse `table<TAB>count` lines from psql. */
export function parseRowCounts(output: string): RowCounts {
  const counts: RowCounts = {};
  for (const line of output.split('\n')) {
    const [table, count] = line.trim().split('\t');
    if (table && count !== undefined) counts[table] = Number(count);
  }
  return counts;
}

/**
 * Compare restored counts against the ones recorded at backup time.
 *
 * @returns one human-readable line per mismatch; empty when they agree.
 */
export function diffRowCounts(expected: RowCounts, actual: RowCounts): string[] {
  const tables = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  return tables
    .filter((table) => expected[table] !== actual[table])
    .map(
      (table) =>
        `${table}: expected ${expected[table] ?? 'no table'}, got ${actual[table] ?? 'no table'}`,
    );
}
