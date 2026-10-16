# Regression Baseline & Compatibility Contract — CURRENT `main`

**Source:** inspected code `main@3d5a609f50be88af8366338bc7466316b435bbc1`. These are **candidate golden behaviors from code**, not proof of live execution. Intern/reviewer must confirm actual behavior with a seeded baseline run before writing code. Capture screenshots and API payload/status examples privately, never commit actual student PII.

## A. Working-product journeys that every touched task must preserve

| ID | Protected workflow | FE route or UI | API/domain code to baseline | Success and negative checks |
|---|---|---|---|---|
| BASE-01 | Public home and separate secure login entry points | `apps/web/src/app/page.tsx`, `admin/login`, `operator/login` | `platform-admin/auth`, `operator-auth`, `SessionService` | Both actor types can log in via approved routes; no platform/admin impersonation, cookies/CSRF intact, ordinary 401/403 errors correct. |
| BASE-02 | Platform admin school listing/create/edit/active state | `apps/web/src/app/admin/(protected)/schools/**` | `schools.controller.ts`, `schools.service.ts`, `prisma School` | Add/edit school details, preserve logo/principal identity and School ID, deactivation revokes operator sessions, wrong actor denied. |
| BASE-03 | Class/section create/read/edit | admin school's `academics/ui.tsx` | `platform-admin/academics/academics.service.ts` | Existing classes/sections remain visible, no accidental delete of student-bound class, school IDs isolated. |
| BASE-04 | Operator account create/update/reset/deactivate | admin school's `operators/ui.tsx` | `OperatorsService` and `SessionService` | Existing full operators retain permissions, password reset revokes sessions, school status gate works. |
| BASE-05 | Operator dashboard / summaries | `apps/web/src/app/operator/ui.tsx` | `operator-dashboard/**`, FeesPublicFacade, StudentsPublicFacade, TransportsPublicFacade | Existing cards and totals remain consistent with DB, no cross-school cache mix, no broken operator home. |
| BASE-06 | Admit student + ID suggestion | `operator/students/new/ui.tsx` | `StudentsController`, `admit-student.service.ts`, student Zod/crypto | Student created once with expected ID, class/section, guardian and optional transport; no duplicate on retry; current Aadhaar behavior recorded as baseline before approved change. |
| BASE-07 | Directory/search/student profile/update | `operator/students/ui.tsx`, `operator/students/[id]/ui.tsx` | `SearchStudentsService`, `UpdateStudentProfileService` | Code/name search, pagination, profile, class and transport update remain usable; history/audit retained. |
| BASE-08 | XLSX import + status | `operator/students/import/ui.tsx` | `student-import.controller.ts`, `student-import.service.ts` | Valid rows import; row errors and retry remain correct; malformed row cannot overwrite another school. |
| BASE-09 | Fee monthly setup and due generation | `operator/fees/setup/ui.tsx`, `operator/fees/pending/ui.tsx` | `FeesController configs/dues`, `ConfigureFeeService`, `GenerateDuesService` | Original class monthly config applied to correct month, idempotent due generate, concession snapshots, no duplicate due. |
| BASE-10 | Partial/full fee payment | `operator/fees/collect/ui.tsx` | `CollectPaymentService`, `FeePayment`, ReceiptNumberAllocator | Payment amount, reference, mode, idempotency, paid/balance and unique receipt number; no overpayment/race. |
| BASE-11 | Payment History, receipt and same-day void | `operator/fees/history/ui.tsx` | `QueryPaymentsService`, `VoidPaymentService`, receipt DTO | History/search, old receipt view and print, void conditions and restored balance, original receipt ID kept. |
| BASE-12 | Pending fees/export and dashboard reconciliation | `operator/fees/pending/ui.tsx` and dashboard | `QueryPendingFeesService`, `FeeExportsService`, FeesPublicFacade | XLSX correct count/totals, safe download, dashboard sums reconcile with source rows, viewer only approved reports. |
| BASE-13 | Transport setup, stoppages and assignments | `operator/transports/**` | `TransportsController`, `assign/end/reassign` services | Route/stop configuration, assignment/reassignment/termination and counts; no orphan active assignments. |
| BASE-14 | Platform-admin TC issue, list, download, retry | `admin/(protected)/schools/[schoolId]/transfer-certificate/ui.tsx` | `TcController`, `TcService`, `tc-pdf-builder.ts` | School/principal/logo readiness, immutable snapshot/TC ID, QUEUED/FAILED/COMPLETE job, private PDF, old document re-download. |
| BASE-15 | School branding upload & signed private files | `admin school ui` and print headers | `schools.controller.ts`, `PrivateFileService`, `SchoolFile`, `image-optimizer` | Old images visible, upload / replace / remove secure, no public PII/object path, correct school logo & signature. |
| BASE-16 | Authentication errors, privacy and audit | protected admin/operator routes | `SessionService`, guards, `AuditService`, `CsrfGuard` | unauth 401, role 403, cross-tenant 404, audit append-only, secret redaction, CSRF on mutations, deactivated sessions denied. |

**Document change examples**: TASK-030 must rerun BASE-09/10/11/12/14, not only PDF snapshot tests; TASK-004 must rerun BASE-06/07/08/14; TASK-001 must rerun **all** operator-facing protected routes, not only login.

## B. Existing HTTP route contracts (keep or deliberately provide adapter)

Real controller definitions:
- `apps/api/src/modules/fees/controllers/fees.controller.ts`: GET `/operator/fees/configs`, POST `/configs`, POST `/dues/generate`, GET `/dues/student/:studentId`, POST `/payments`, GET `/payments`, GET `/payments/:id/receipt`, POST `/payments/:id/void`, GET `/pending`, POST `/exports/pending`. **Export is POST with CSRF; viewer download capability must not bypass security.**
- `apps/api/src/modules/students/controllers/students.controller.ts`: GET `/operator/students/classes`, GET `/id-suggestion`, POST root, GET root, GET `/search`, GET `/:id`, PATCH `/:id`, PATCH `/:id/identifier`, PATCH `/:id/status`, GET `/:id/identifier-history`, GET `/:id/admission-form`, GET `/:id/fees`, GET `/:id/transport`.
- `apps/api/src/modules/platform-admin/tc/tc.controller.ts`: GET `/platform/schools/:schoolId/students/search`, POST `/transfer-certificates`, GET list, GET `/:tcId`, POST `/:tcId/retry-render`, GET `/:tcId/download`. Keep these working when adding new operator controllers.
- `apps/api/src/modules/operator-dashboard/controllers/operator-dashboard.controller.ts`: GET `/operator/dashboard/students`, `/gender`, `/fees/collection`, `/fees/dues`, `/fees/day`, `/fees/week`, `/fees/month`, `/transport`. Check GET authorization/read side effects and historic/year cache keys.

**Critical side-effect observation:** `FeesPublicFacadeImpl.getStudentFeeSummary` currently may call `GenerateDuesService.ensureDuesForApplicableMonths` during a GET. Do **not** naïvely permit it under read-only report capability. Review all GET handlers for indirect writes before granting read access. Use a safe read projection or authorized mutation with audit. This is a concrete P0 issue in TASK-001/002/013.

**Compatibility contract:** Preserve existing route/method/request shape, critical error codes, historical response fields and UI behaviors for old clients, OR provide versioned new contract + adapter verified with snapshots and approved removal window. Do not merely rename a route and update one frontend while external/internal old consumers fail. Old files and payment IDs must remain retrievable.

## C. Golden DB/business invariants

- Tenant A cannot read/modify Tenant B Student, SchoolFile, FeeDue/FeeCharge, Payment, TC, TransportAssignment, Report, AcademicSession or private downloads even if UUID is known.
- Existing `School.id` and `Student.id` do not change on migration/year rollover. No duplicate active student/year or transport assignment.
- `FeeDue` current and `FeePayment` historic IDs/receiptNumber remain associated with same school/student/amount/status. Posted money stays auditable.
- After new FeeCharge allocation cutover: `net assessed + approved adjustments − active allocated = outstanding`, **exact Decimal**, no unexplained paise variance or duplicate old/new ledger aggregation.
- No new fees outside approved enrollment start/stop and charge source keys. Carryforward shows original obligations, not cloned debt.
- Already issued TC PDF, key version and encrypted snapshot are preserved; new documents meet fee clearance and private access rules.
- Old Aadhaar profiles encrypted/masked correctly; new null Aadhaar never falls into plaintext export or a fake last4.
- Operator `MANAGER` has the same business capabilities as before; `REPORT_VIEWER` cannot reach mutating endpoints, sensitive profiles or unapproved GET writes.
- Unchanged public/API user flows remain keyboard accessible at mobile/tablet/desktop widths, and protected routes still use server auth and CSRF.

## D. Baseline NFR targets and what is NOT proved by tests alone

Targets from approved PRD/HLD should be checked for applicability on the latest Harness revision: exact Student ID lookup p95 <1s at 5k students; name search p95 <1.5s; dashboard p95 <3s at 2k students; 99.5% availability target; at least seven-year operational/financial/document history; responsive/WCAG 2.1 AA. **These are targets, not measurements.**

Before refactoring: run a repeatable test data scenario, capture p50/p95 latency/DB explain plan, render screenshots at widths 360, 768, 1366, record memory/CPU/worker queue and baseline response payload hashes. After refactoring: compare same fixture, same hardware/DB size and request profiles, document any intentional changes and reviewer-approved budget. New charge/TC/pdf SLOs need approval from observed baseline.

## E. Regression test selection matrix (minimum; full suite still required)

| Affected task numbers | MUST rerun protected baselines |
|---|---|
| 001–002 | BASE-01,04,05,06,07,08,09,10,11,12,13,14,16 |
| 003–006 | BASE-01,02,03,06,07,08,14,15,16 |
| 007–011 | BASE-02,03,04,06,07,08,09,12,13,14,16 |
| 012–021 | BASE-05,06,07,08,09,10,11,12,13,14,16 |
| 022–027 | BASE-03,05,06,07,09,10,11,12,13,14,16 |
| 028–035 | BASE-01,02,05,10,11,12,14,15,16 |

Plus every directly changed user-facing route, all relevant user roles and every new acceptance scenario. This is a **minimum**; more baselines are required when code or schema changes touch additional domains.

## F. Evidence template — save per task, link only in one tracker

```text
Task:
Main baseline SHA / feature SHA:
Baseline fixture and repeatable steps:
Existing FE route & screenshots (BEFORE/AFTER, 360/768/1366):
Legacy API method, request/response/error contract (BEFORE/AFTER):
Affected DB row totals, IDs and financial reconciliation (BEFORE/AFTER):
Targeted API/unit/integration commands:
Browser interaction and accessibility runs:
NFR p50/p95 + workload and DB EXPLAIN (BEFORE/AFTER):
Cross-tenant and role/CSRF negative tests:
Legacy receipt/TC/file checksums unchanged:
Migration up/backfill/rollback test results:
Reviewer decision and notes:
```
