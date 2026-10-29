import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsRoot = path.join(root, 'prisma', 'migrations');
const expectedUuidSchoolIdCounts = {
  '0008_task_007_academic_sessions': 1,
  '0011_task_012_fee_categories_and_rules': 2,
  '0012_task_013_multi_category_fee_charges': 2,
  '0014_task_034_035_examination_admit_cards': 2,
};

let failures = 0;
let checked = 0;
for (const entry of fs.readdirSync(migrationsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(migrationsRoot, entry.name, 'migration.sql');
  if (!fs.existsSync(file)) continue;
  const sql = fs.readFileSync(file, 'utf8');
  checked++;

  // schools.id is UUID. PostgreSQL rejects varchar school_id FKs referencing it.
  const invalid = [...sql.matchAll(/"?school_id"?\s+(?:VARCHAR\b|CHARACTER\s+VARYING\b|TEXT\b)/gi)];
  if (invalid.length) {
    console.error(`INVALID ${entry.name}: ${invalid.length} non-UUID school_id declaration(s)`);
    failures++;
  }

  if (Object.hasOwn(expectedUuidSchoolIdCounts, entry.name)) {
    const actual = [...sql.matchAll(/"school_id"\s+UUID\s+NOT\s+NULL/gi)].length;
    const expected = expectedUuidSchoolIdCounts[entry.name];
    if (actual !== expected) {
      console.error(`INVALID ${entry.name}: expected ${expected} UUID school_id declarations, found ${actual}`);
      failures++;
    }
  }
}

if (!checked) {
  console.error('No migration.sql files found');
  failures++;
}
console.log(`Migration UUID audit: ${checked} files checked; ${failures} failures`);
process.exitCode = failures ? 1 : 0;
