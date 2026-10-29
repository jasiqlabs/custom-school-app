import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewMigrationSql } from './verify-production-migrations.mjs';

test('transactional additive migration is allowed', () => {
  assert.deepEqual(reviewMigrationSql(`
    -- non-destructive schema expansion
    BEGIN;
    CREATE TABLE "example" ("id" UUID PRIMARY KEY);
    COMMIT;
  `), []);
});

test('unwrapped new migration fails closed', () => {
  assert.match(reviewMigrationSql('CREATE TABLE foo(id UUID);').join(' '), /BEGIN/);
});

test('unsafe destructive statements are blocked', () => {
  for (const statement of [
    'DROP TABLE schools;',
    'ALTER TABLE students DROP COLUMN full_name;',
    'TRUNCATE TABLE fee_payments;',
    'DELETE FROM students;',
    'CREATE UNIQUE INDEX CONCURRENTLY idx ON schools(id);',
  ]) {
    const issues = reviewMigrationSql(`BEGIN; ${statement} COMMIT;`);
    assert.ok(issues.length > 0, statement);
  }
});

test('comments do not bypass required transaction boundaries', () => {
  const sql = '-- BEGIN;\nCREATE TABLE foo(id UUID);\n-- COMMIT;';
  assert.match(reviewMigrationSql(sql).join(' '), /BEGIN/);
});
