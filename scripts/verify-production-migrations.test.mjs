import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reviewMigrationSql, auditMigrations, gitBlobHash } from './verify-production-migrations.mjs';

test('transactional additive migration is accepted', () => {
  assert.deepEqual(reviewMigrationSql(`
    -- safe additive change
    BEGIN;
    CREATE TABLE "example" ("id" UUID PRIMARY KEY);
    COMMIT;
  `), []);
});

test('migration without explicit transaction is rejected', () => {
  assert.match(reviewMigrationSql('CREATE TABLE foo(id UUID);').join(' '), /BEGIN/);
});

test('destructive operations are rejected', () => {
  for (const statement of [
    'DROP TABLE schools;',
    'ALTER TABLE students DROP COLUMN full_name;',
    'TRUNCATE TABLE fee_payments;',
    'DELETE FROM students;',
    'CREATE UNIQUE INDEX CONCURRENTLY idx ON schools(id);',
  ]) {
    assert.ok(reviewMigrationSql(`BEGIN; ${statement} COMMIT;`).length > 0, statement);
  }
});

test('commented BEGIN and COMMIT do not satisfy transaction check', () => {
  assert.match(reviewMigrationSql('-- BEGIN;\nCREATE TABLE foo(id UUID);\n-- COMMIT;').join(' '), /BEGIN/);
});

test('historical migrations cannot be modified or removed', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-gate-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const name = '0001_initial';
  fs.mkdirSync(path.join(dir, name));
  const sqlFile = path.join(dir, name, 'migration.sql');
  const baselineSql = 'BEGIN; CREATE TABLE t (id UUID); COMMIT;\n';
  const baseline = { [name]: gitBlobHash(baselineSql) };
  fs.writeFileSync(sqlFile, baselineSql);
  assert.deepEqual(auditMigrations(dir, baseline).errors, []);

  fs.writeFileSync(sqlFile, baselineSql.replace('UUID', 'VARCHAR'));
  assert.match(auditMigrations(dir, baseline).errors.join(' '), /historical migration changed/);

  fs.rmSync(path.join(dir, name), { recursive: true });
  assert.match(auditMigrations(dir, baseline).errors.join(' '), /Historical migration removed/);
});

test('new migrations are checked before deployment', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-gate-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const name = '0015_add_school_note';
  fs.mkdirSync(path.join(dir, name));
  const sqlFile = path.join(dir, name, 'migration.sql');
  fs.writeFileSync(sqlFile, 'BEGIN; ALTER TABLE schools ADD COLUMN note TEXT; COMMIT;');
  assert.deepEqual(auditMigrations(dir, {}).errors, []);

  fs.writeFileSync(sqlFile, 'DROP TABLE schools;');
  assert.ok(auditMigrations(dir, {}).errors.length > 0);
});
