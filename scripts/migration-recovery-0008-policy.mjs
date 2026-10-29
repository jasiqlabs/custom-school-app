/**
 * Only the two tightly scoped states observed for migration 0008 can be recovered:
 * - PostgreSQL atomically rolled back all the migration's DDL: retry migration.
 * - The old failed attempt left an empty academic_sessions table: repair and
 *   verify it in a single transaction before marking the migration applied.
 *
 * Any residual enum, index, or other DDL object without the table is ambiguous
 * and requires investigation. This is NOT a general migration repair policy.
 */
export function choose0008Recovery({ tablePresent, enumPresent, residualObjects }) {
  if (tablePresent) return 'repair-empty-table';
  if (!enumPresent && residualObjects === 0) return 'retry-fully-rolled-back';
  throw new Error(
    'Migration recovery stopped safely: academic_sessions table is absent but migration artifacts remain'
  );
}
