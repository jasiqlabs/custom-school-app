import test from 'node:test';
import assert from 'node:assert/strict';
import { choose0008Recovery } from './migration-recovery-0008-policy.mjs';

test('fully rolled-back 0008 allows ledger rollback and migration retry', () => {
  assert.equal(choose0008Recovery({
    tablePresent: false, enumPresent: false, residualObjects: 0,
  }), 'retry-fully-rolled-back');
});

test('existing academic_sessions requires locked empty-table inspection', () => {
  assert.equal(choose0008Recovery({
    tablePresent: true, enumPresent: true, residualObjects: 5,
  }), 'repair-empty-table');
});

test('missing table with orphaned enum must fail closed', () => {
  assert.throws(() => choose0008Recovery({
    tablePresent: false, enumPresent: true, residualObjects: 0,
  }), /artifacts remain/);
});

test('missing table with leftover indexes must fail closed', () => {
  assert.throws(() => choose0008Recovery({
    tablePresent: false, enumPresent: false, residualObjects: 1,
  }), /artifacts remain/);
});
