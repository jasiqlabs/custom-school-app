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
  assert.match(source, /csrfEpoch/);
  assert.match(source, /if \(epoch === csrfEpoch\) csrf = body.csrfToken/);
  assert.match(source, /MAX_REQUEST_MS = 120000/);
  assert.doesNotMatch(source, /detailsMsg \|\| body\.message/);
});


test('development fixtures cannot replace real operator credentials or ship default passwords', () => {
  const source = read('apps/api/src/scripts/seed-operator.ts');
  assert.match(source, /ALLOW_DEV_OPERATOR_SEED/);
  assert.match(source, /NODE_ENV === 'production'/);
  assert.doesNotMatch(source, /OperatorPassword123!|schoolOperator\.upsert|schoolOperator\.update/);
  assert.doesNotMatch(source, /school\.update/);
  assert.match(source, /findUnique/);
  assert.match(source, /dev_operator_seed\.skipped_existing/);
});
test('admin seeding never prints raw exception objects', () => {
  const source = read('apps/api/src/scripts/seed-admin.ts');
  assert.doesNotMatch(source, /console\.error\('Platform administrator provisioning failed:', error\)/);
  assert.match(source, /platform_admin_seed\.failed/);
});
test('both web payment entry points retain idempotency keys when retrying after timeouts', () => {
  const collect = read('apps/web/src/app/operator/fees/collect/ui.tsx');
  const profile = read('apps/web/src/app/operator/students/[id]/ui.tsx');
  assert.match(collect, /school-erp-payment-attempt/);
  assert.match(collect, /pendingAttempt\.current/);
  assert.match(profile, /pendingProfilePayment\.current/);
  assert.match(profile, /school-erp-profile-payment-attempt/);
  assert.match(profile, /getUserErrorMessage\(err, 'Could not confirm the payment/);
});


test('raw school UUID SQL bindings are explicit across academic, TC and transport flows', () => {
  const targets = [
    'apps/api/src/modules/platform-admin/operators/operators.service.ts',
    'apps/api/src/modules/platform-admin/schools/schools.service.ts',
    'apps/api/src/modules/platform-admin/academics/academic-sessions.service.ts',
    'apps/api/src/modules/platform-admin/academics/academics.service.ts',
    'apps/api/src/modules/platform-admin/tc/tc.service.ts',
    'apps/api/src/modules/transports/application/assign-transport.service.ts',
    'apps/api/src/modules/transports/application/reassign-transport.service.ts',
    'apps/api/src/modules/transports/application/end-transport.service.ts',
    'apps/api/src/modules/transports/application/manage-transports.service.ts',
    'apps/api/src/modules/transports/application/manage-stoppages.service.ts',
    'apps/api/src/modules/fees/repository/fees.repository.ts',
    'apps/api/src/modules/fees/domain/receipt-number-allocator.ts',
  ];
  const offenders = [];
  for (const target of targets) {
    const source = read(target);
    for (const marker of [
      'school_id=${schoolId} AND', 'school_id = ${schoolId} AND',
      'school_id=${schoolId} FOR', 'school_id = ${schoolId} FOR',
      'WHERE id=${schoolId} FOR', 'WHERE id = ${schoolId} FOR',
    ]) if (source.includes(marker)) offenders.push(target + ': ' + marker);
  }
  assert.deepEqual(offenders, []);
});
test('operator create/update/status never return private authentication fields', () => {
  const service = read('apps/api/src/modules/platform-admin/operators/operators.service.ts');
  assert.doesNotMatch(service, /return\s*\{\s*\.\.\.row,\s*passwordHash/);
  assert.match(service, /select:\{id:true,schoolId:true,email:true,fullName:true,status:true,role:true,createdAt:true\}/);
  assert.doesNotMatch(service, /emailHash:Buffer\.from/);
});
test('legacy receipt PDF never substitutes a question mark for unsupported Unicode', () => {
  const source = read('apps/api/src/modules/fees/domain/receipt-pdf.ts');
  assert.match(source, /UnsupportedReceiptTextError/);
  assert.doesNotMatch(source, /normalize\('NFKD'\)/);
});


test('document worker writes only typed UUID school IDs in PDF file and audit SQL', () => {
  const source = read('apps/worker/src/main.ts');
  for (const field of ['tc.schoolId', 'card.schoolId']) {
    const plain = ' + field + ';
    assert.equal(source.split(plain + ',').length - 1, 0, field + ' must be UUID-typed');
    assert.ok(source.includes(plain + '::uuid'), field + ' cast missing');
  }
  assert.match(source, /DOCUMENT_RENDER_FAILED/);
});


test('Unicode receipt printing produces both copies from escaped frozen data', () => {
  const printer = read('apps/web/src/features/fees/receipt-print.ts');
  assert.match(printer, /escapeHtml/);
  assert.match(printer, /receiptCopy\('OFFICE COPY'\)/);
  assert.match(printer, /receiptCopy\('STUDENT COPY'\)/);
  assert.match(printer, /break-after:page/);
  assert.match(printer, /Print/);
  for (const path of [
    'apps/web/src/app/operator/fees/collect/ui.tsx',
    'apps/web/src/app/operator/fees/history/ui.tsx',
  ]) assert.match(read(path), /printReceiptCopies/);
  assert.ok(read('apps/api/src/modules/fees/controllers/fees.controller.ts').includes('await makeTwoCopyUnicodeReceiptPdf(receipt)'));
});

test('new receipts and TC v2 have pinned fonts, an embedded text layer and separate legacy route', () => {
  const fonts = read('scripts/prepare-pdf-fonts.mjs');
  const pdf = read('packages/storage/src/unicode-document-pdf.ts');
  const receipt = read('apps/api/src/modules/fees/domain/unicode-receipt-pdf.ts');
  const tc = read('apps/worker/src/tc-unicode-pdf.ts');
  const admit = read('apps/worker/src/admit-card-unicode-pdf.ts');
  const worker = read('apps/worker/src/main.ts');
  const pkg = JSON.parse(read('package.json'));
  const locked = JSON.parse(read('package-lock.json'));
  assert.ok(fonts.includes('ffebf8c1ee449e544955a7e813c54f9b73848eac'));
  assert.ok(fonts.includes('blobHash(data) !== expectedSha'));
  assert.ok(pdf.includes('FontFile2') && pdf.includes('ToUnicode') && pdf.includes('CIDFontType2'));
  assert.ok(pdf.includes('utf16Hex'));
  assert.ok(receipt.includes('buildUnicodeReceiptPages'));
  assert.ok(tc.includes('buildTcUnicodePdf'));
  assert.ok(admit.includes('buildAdmitCardUnicodePdf'));
  assert.ok(worker.includes("snap.templateVersion === 'standard-v2'"));
  assert.ok(worker.includes('buildTcPdf(snap, logo, sig)'));
  assert.ok(worker.includes('await buildAdmitCardUnicodePdf(snap, logo, sig)'));
  assert.ok(pkg.scripts['deploy:compile'].includes('prepare:pdf-fonts'));
  assert.equal(locked.packages['apps/worker'].dependencies.sharp, '^0.35.4');
  assert.ok(locked.packages['node_modules/sharp']);
  assert.ok(read('docs/licenses/NOTO-SIL-OFL-1.1.txt').includes('SIL OPEN FONT LICENSE'));
});


test('main-branch report viewer reads and sidebar routes remain available', () => {
  const capabilities = read('apps/api/src/common/security/capability.guard.ts');
  const role = capabilities.split('REPORT_VIEWER: [')[1]?.split('],')[0] || '';
  for (const cap of ['students.read', 'fees.read', 'transports.read',
    'academics.read', 'reports.read', 'reports.download', 'fees.export',
    'dashboard.read', 'tc.read', 'exams.read']) {
    assert.ok(role.includes("'" + cap + "'"), 'missing main viewer capability: ' + cap);
  }
  assert.match(capabilities, /role === 'REPORT_VIEWER' && isMutation/);
  const shell = read('apps/web/src/components/shell.tsx');
  const viewerNav = shell.split('if (isReportViewer)')[1]?.split('\n              return (')[0] || '';
  for (const route of ['/operator/students', '/operator/fees/pending',
    '/operator/transports', '/operator/academics', '/operator/exams']) {
    assert.ok(viewerNav.includes('href="' + route + '"'), 'viewer navigation lost ' + route);
  }
});
test('fee payment audit is committed atomically and successful receipt remains visible', () => {
  const service = read('apps/api/src/modules/fees/application/collect-payment.service.ts');
  const paymentTx = service.slice(service.indexOf('const paymentId = await this.prisma.$transaction'),
    service.indexOf('if (replayed) return'));
  assert.match(paymentTx, /await this\.audit\.append/);
  assert.match(paymentTx, /}, tx\);/);
  const afterTx = service.slice(service.indexOf('if (replayed) return'),
    service.indexOf('private buildReceiptDto'));
  assert.doesNotMatch(afterTx, /await this\.audit\.append/);
  const profile = read('apps/web/src/app/operator/students/[id]/ui.tsx');
  const afterPayment = profile.slice(profile.indexOf('async function handleCollectPayment'),
    profile.indexOf('async function handleViewReceipt'));
  assert.doesNotMatch(afterPayment, /await loadData\(\)/);
  assert.match(afterPayment, /setReceiptModalOpen\(true\)/);
});


test('collector still prepares applicable fees without mutating the dues GET route', () => {
  const controller = read('apps/api/src/modules/fees/controllers/fees.controller.ts');
  assert.match(controller, /@Post\('dues\/student\/:studentId\/ensure'\)/);
  assert.match(controller, /@RequiresCapability\('fees.write'\)\s+async ensureStudentDues/);
  assert.match(controller, /@Get\('dues\/student\/:studentId'\)/);
  const generator = read('apps/api/src/modules/fees/application/generate-dues.service.ts');
  assert.match(generator, /student\.status !== EntityStatus\.ACTIVE/);
  const client = read('apps/web/src/features/fees/api/fees-api-client.ts');
  assert.match(client, /async prepareStudentDues/);
  const collector = read('apps/web/src/app/operator/fees/collect/ui.tsx');
  assert.match(collector, /feesApi\.prepareStudentDues\(urlStudentId\)/);
  assert.match(collector, /feesApi\.prepareStudentDues\(student\.id\)/);
  assert.match(collector, /duesRequestVersion/);
});
