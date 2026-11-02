import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const allFiles = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? allFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const webUi = [...allFiles('apps/web/src/app'), ...allFiles('apps/web/src/features')]
  .filter(p => p.endsWith('/ui.tsx') || (p.endsWith('.tsx') && p.includes('/components/')));

test('all interactive pages use user-safe error messages and no native error alerts', () => {
  const offenders = [];
  for (const file of webUi) {
    const source = read(file);
    if (/\b(?:err|error|e|x|refreshErr)\??\.message\b/.test(source))
      offenders.push(file + ': direct exception.message');
    if (/(?:window\.)?\balert\s*\(/.test(source))
      offenders.push(file + ': native error alert');
  }
  assert.deepEqual(offenders, []);
});

test('neither login page ships reusable demo credentials or technical failure instructions', () => {
  for (const path of ['apps/web/src/app/admin/login/ui.tsx', 'apps/web/src/app/operator/login/ui.tsx']) {
    const source = read(path);
    assert.doesNotMatch(source, /(?:Admin|Operator)Password123!|Quick Demo Credentials Helper|port 4000|check the server logs/i);
    assert.match(source, /Unable to connect right now/);
  }
});

test('API errors are redacted and still preserve business conflict metadata', () => {
  const source = read('apps/api/src/common/http/api-exception.filter.ts');
  assert.match(source, /safeBusinessDetails/);
  assert.match(source, /duplicateConfirmationToken/);
  assert.match(source, /activeAssignmentCount|Object\.entries\(object\)/);
  assert.match(source, /friendlyIssue/);
  assert.doesNotMatch(source, /console\.error\('API 500 ERROR:',\s*exception\)/);
  assert.doesNotMatch(source, /message:\s*\(exception as any\)\?\.message/);
  assert.match(source, /http\.unhandled_exception/);
});

test('API request logs use route templates and never log payloads or raw URLs', () => {
  const source = read('apps/api/src/main.ts');
  assert.match(source, /event:\s*'http\.response'/);
  assert.match(source, /durationMs/);
  assert.match(source, /req\.route\?\.path \|\| '\/unmatched'/);
  assert.doesNotMatch(source, /JSON\.stringify\(req\.body\)|originalUrl|console\.log\(req\)/);
});

test('document worker never persists arbitrary error.message and bounds asset cache', () => {
  const source = read('apps/worker/src/main.ts');
  assert.match(source, /safeJobErrorCode\(error\)/);
  assert.match(source, /MAX_CACHE_BYTES = 32 \* 1024 \* 1024/);
  assert.match(source, /rememberAsset\(logoKey, logoBuf\)/);
  assert.doesNotMatch(source, /console\.error\(\x60\[Worker ERROR\]/);
  assert.doesNotMatch(source, /String\(error\?\.message \|\| 'JOB_FAILED'\)/);
  assert.doesNotMatch(source, /error:\s*err\.message/);
});

test('shared client errors include friendly fields, stable codes and bounded request duration', () => {
  const source = read('apps/web/src/lib/api.ts');
  assert.match(source, /readableFieldName/);
  assert.match(source, /getUserErrorMessage/);
  assert.match(source, /apiResponseError/);
  assert.match(source, /csrfInFlight/);
  assert.match(source, /MAX_REQUEST_MS = 120000/);
  assert.doesNotMatch(source, /detailsMsg \|\| body\.message/);
});
