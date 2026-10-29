import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Safety gate for NEW PostgreSQL migrations. Historical migrations are not
 * rewritten: changing the checksum of a previously applied migration is unsafe.
 *
 * This guard is intentionally conservative and is not a SQL parser. Passing
 * this check does NOT replace rehearsal on a restored database.
 */
const establishedMigrations = new Set([
  '0001_greenfield_v2_mod_000_002',
  '0002_mod_003_student_management',
  '0003_mod_004_fee_management',
  '0004_mod_005_transport_management',
  '0005_task_001_operator_roles',
  '0006_task_003_school_identity',
  '0007_task_004_optional_aadhaar',
  '0008_task_007_academic_sessions',
  '0009_task_008_session_enrollment',
  '0010_task_009_effective_enrollment',
  '0011_task_012_fee_categories_and_rules',
  '0012_task_013_multi_category_fee_charges',
  '0013_task_017_books_and_uniform_selection',
  '0014_task_034_035_examination_admit_cards',
]);

export function reviewMigrationSql(sql) {
  const clean = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '').trim();
  const problems = [];
  if (!/^BEGIN\s*;/i.test(clean) || !/COMMIT\s*;\s*$/i.test(clean)) {
    problems.push('New PostgreSQL migration must be enclosed in explicit BEGIN; ... COMMIT;');
  }
  // Potentially destructive/data-rewriting operations require their own,
  // reviewed expand/migrate/contract rollout, not an ordinary auto-deploy.
  const prohibited = [
    [/\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i, 'DROP TABLE/SCHEMA/DATABASE'],
    [/\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i, 'DROP COLUMN'],
    [/\bTRUNCATE\s+(?:TABLE\s+)?/i, 'TRUNCATE'],
    [/\bDELETE\s+FROM\b/i, 'DELETE FROM'],
    [/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i, 'CREATE INDEX CONCURRENTLY is incompatible with a transaction'],
  ];
  for (const [pattern, label] of prohibited) {
    if (pattern.test(clean)) problems.push(`Potentially unsafe migration operation: ${label}`);
  }
  return problems;
}

export function auditMigrations(migrationRoot) {
  const errors = [];
  let inspectedNew = 0;
  const entries = fs.readdirSync(migrationRoot, { withFileTypes: true });
  for (const item of entries) {
    if (!item.isDirectory()) continue;
    const file = path.join(migrationRoot, item.name, 'migration.sql');
    if (!fs.existsSync(file)) {
      errors.push(`${item.name}: missing migration.sql`);
      continue;
    }
    if (establishedMigrations.has(item.name)) continue;
    inspectedNew++;
    const issues = reviewMigrationSql(fs.readFileSync(file, 'utf8'));
    for (const issue of issues) errors.push(`${item.name}: ${issue}`);
  }
  for (const name of establishedMigrations) {
    if (!entries.some((x) => x.name === name && x.isDirectory())) {
      errors.push(`Historical migration is missing: ${name}`);
    }
  }
  return { errors, inspectedNew };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'migrations');
  const outcome = auditMigrations(root);
  for (const issue of outcome.errors) console.error(`MIGRATION SAFETY: ${issue}`);
  console.log(`Production migration guard: ${outcome.inspectedNew} new migration(s) checked, ${outcome.errors.length} error(s)`);
  process.exitCode = outcome.errors.length ? 1 : 0;
}
