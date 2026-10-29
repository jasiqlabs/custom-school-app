import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Defensive static release gate, not a SQL parser and not a substitute for
 * migration rehearsal on a copy of production data.
 *
 * Never silently rewrite historical migration files. Prisma tracks their
 * checksums in each database. Use a NEW migration for future schema changes.
 */
const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const migrationRoot = path.resolve(scriptsRoot, '..', 'prisma', 'migrations');
const historyLock = JSON.parse(fs.readFileSync(path.join(scriptsRoot, 'migration-history-lock.json'), 'utf8'));

export function gitBlobHash(sql) {
  const bytes = Buffer.from(sql, 'utf8');
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes).digest('hex');
}

export function reviewMigrationSql(sql) {
  // This heuristic intentionally rejects suspicious SQL rather than guessing.
  const clean = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '').trim();
  const problems = [];
  if (!/^BEGIN\s*;/i.test(clean) || !/COMMIT\s*;\s*$/i.test(clean)) {
    problems.push('New PostgreSQL migrations must be enclosed in BEGIN; ... COMMIT;');
  }
  const prohibited = [
    [/\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i, 'DROP TABLE/SCHEMA/DATABASE'],
    [/\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i, 'DROP COLUMN'],
    [/\bTRUNCATE\s+(?:TABLE\s+)?/i, 'TRUNCATE'],
    [/\bDELETE\s+FROM\b/i, 'DELETE FROM'],
    [/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i, 'CREATE INDEX CONCURRENTLY cannot run within a transaction'],
  ];
  for (const [pattern, label] of prohibited) {
    if (pattern.test(clean)) problems.push(`Requires explicitly reviewed multi-release migration: ${label}`);
  }
  return problems;
}

export function auditMigrations(root = migrationRoot, baseline = historyLock) {
  const errors = [];
  let inspectedNew = 0;
  let verifiedHistorical = 0;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const dirs = entries.filter((x) => x.isDirectory()).map((x) => x.name);
  for (const name of dirs) {
    const file = path.join(root, name, 'migration.sql');
    if (!fs.existsSync(file)) {
      errors.push(`${name}: missing migration.sql`);
      continue;
    }
    const sql = fs.readFileSync(file, 'utf8');
    if (Object.hasOwn(baseline, name)) {
      verifiedHistorical++;
      const actualHash = gitBlobHash(sql);
      if (actualHash !== baseline[name]) {
        errors.push(`${name}: historical migration changed (never edit applied migrations)`);
      }
      continue;
    }
    inspectedNew++;
    if (!/^\d{4}_[a-z0-9_]+$/i.test(name)) {
      errors.push(`${name}: invalid migration directory name`);
    }
    for (const issue of reviewMigrationSql(sql)) errors.push(`${name}: ${issue}`);
  }
  for (const name of Object.keys(baseline)) {
    if (!dirs.includes(name)) errors.push(`Historical migration removed: ${name}`);
  }
  return { errors, inspectedNew, verifiedHistorical };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditMigrations();
  for (const issue of result.errors) console.error(`MIGRATION SAFETY: ${issue}`);
  console.log(`Production migration gate: ${result.verifiedHistorical} historical locked; ${result.inspectedNew} new checked; ${result.errors.length} violations`);
  process.exitCode = result.errors.length ? 1 : 0;
}
