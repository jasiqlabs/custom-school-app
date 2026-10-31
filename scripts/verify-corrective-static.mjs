import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const problems=[];
const check=(ok,label)=>{if(!ok)problems.push(label);};
const files={
  transport:read('apps/api/src/modules/transports/controllers/transports.controller.ts'),
  guard:read('apps/api/src/common/security/capability.guard.ts'),
  pending:read('apps/api/src/modules/fees/application/query-pending-fees.service.ts'),
  receipt:read('apps/api/src/modules/fees/application/collect-payment.service.ts'),
  void:read('apps/api/src/modules/fees/application/void-payment.service.ts'),
  tc:read('apps/api/src/modules/platform-admin/tc/tc.service.ts'),
  exam:read('apps/api/src/modules/examination/application/admit-cards.service.ts'),
};
check(files.transport.includes("transports.write"),'Missing explicit Transport write authorization');
check(files.guard.includes("REPORT_VIEWER")&&files.guard.includes("Report viewer cannot modify"),'Report viewer write-guard missing');
const pendingFunction=files.pending.split('async getPendingReport(')[1]||'';
check(!pendingFunction.includes('assessChargesForStudent(')&&!pendingFunction.includes('ensureDuesForApplicableMonths('),
  'Pending-fees read path still creates dues');
check(files.receipt.includes('receiptSnapshot')&&files.receipt.includes('requestHash')&&files.receipt.includes('lockStudentForFees'),
  'Payment receipt snapshot, hash, or account lock missing');
check(files.void.includes('allocation.voidReversedAt')&&files.void.includes('lockStudentForFees'),
  'Multi-charge void reversal is not safely idempotent');
check(files.tc.includes('checkStudentDocumentClearance')&&files.tc.includes('lockStudentForFees'),
  'TC issuance fee clearance guard missing');
const generator=read('apps/api/src/modules/fees/application/generate-dues.service.ts');
check(!generator.includes('feeCharge.deleteMany('), 'Fee generator still deletes assessed/adjusted charges');
check((generator.match(/data.isTuition && data.originRef/g)||[]).length>=2,
  'Non-tuition charges must not inherit legacy tuition payment balances');
check(generator.includes('await this.generateDueForStudent(schoolId, student.id, feeMonth)'),
  'Bulk legacy generation bypasses student-scoped lock and date eligibility');
check(generator.includes("sessionEntity.status !== 'ACTIVE'"),
  'Charge generation is not restricted to the active academic year');
const oldStatus=read('apps/api/src/modules/students/application/change-student-status.service.ts');
check(oldStatus.includes('lockStudentForFees')&&oldStatus.includes('studentEnrollment.updateMany('),
  'Legacy deactivation can bypass active enrollment closure');
const report=files.pending;
check(report.includes('effectiveFrom(enrollment)')&&report.includes('monthEnd'),
  'Historical report could show a current rather than effective-dated class');
check(files.exam.includes('lockedClearance')&&!files.exam.includes('mocked-sha256-admit-card'),
  'Admit card issuance guard or fake PDF fallback found');
for(const name of ['0015_fix_fee_adjustment_history','0016_year_transitions','0017_opening_balances','0018_receipt_snapshot','0019_school_numbering_policy']){
  const sql=read(`prisma/migrations/${name}/migration.sql`);
  check(/^\s*BEGIN\s*;/i.test(sql)&&/COMMIT\s*;\s*$/i.test(sql),`Migration ${name} missing transaction`);
  check(!/\bTRUNCATE\b|\bDELETE\s+FROM\b|\bDROP\s+TABLE\b/i.test(sql),`Destructive migration ${name}`);
}
if(problems.length) {
  console.error(problems.map(p=>'CORRECTIVE STATIC: '+p).join('\n'));
  process.exitCode=1;
} else console.log('Corrective source safety gates: PASS (static only; not a build or runtime QA)');
