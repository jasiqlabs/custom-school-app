# TASK-016 — One-time registration and admission charges

**Domain:** Fees / Admission · **Technical prerequisites:** TASK-013 · **Policy gate:** POLICY_CONFIRMATION · **Review:** **HIGH** · **Only execution tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md)

## 1. Functional requirements and exact use cases
**User story:** The school can one-time registration and admission charges.

**Source acceptance examples:** UC1: new admission includes registration ₹400 and admission ₹500 on student's statement. UC2: incomplete admission transaction retries, no duplicated ₹900. UC3: repeat/re-admission in next year does not reapply lifetime one-time fees unless client decides otherwise. UC4: school has no admission fee rule, no phantom zero due.

**Required business policy and constraints:** Client must confirm one-time scope: lifetime in school vs each re-entry or session. Idempotent posting based on immutable business key; paid amounts never regenerated. Student admission success cannot silently leave half-created one-time obligations.

**Primary golden example:** New admission has ₹400 registration + ₹500 admission once; duplicate submission returns original charge IDs; existing monthly tuition and student import continue. Confirm any school-level policy in [DECISIONS.md](../DECISIONS.md) before implementation; do not treat examples as approval for a new penalty, charge or write-off.

## 2. Detailed database/domain DLD
**Existing files and interfaces to inspect in latest stable main:** `apps/api/src/modules/students/application/admit-student.service.ts`<br>`apps/api/src/modules/fees/facade/fees-public.facade.ts`<br>`apps/web/src/app/operator/students/new/ui.tsx`

**Proposed schema evolution:** FeeCharge sourceKey composed (schoolId,studentId,category,oneTimePolicyScope) UNIQUE, plus originAdmissionEventId/ref, rules/snapshot; prevent two identical charge keys even across race; fee receipts link through FE-07 allocations.

**Precise model and ownership decisions:**
1. Define FeeCharge sourceKey from school/student/admissionEvent/category/policyScope, never month alone. The policy scope lifetime vs each reentry vs per academic year is client-approved.
2. Admission service validates class, school and active admission date, calls FeesPublicFacade.postInitialCharges with immutable admission eventId; use same outbox/idempotency flow for manual admission and XLSX import.

**Mandatory data migration:** prepare disposable test DB with two schools, previous school fees, paid/partial/void records, receipt numbers, historical student class and TC snapshots. Apply additive nullable/new-table migration; run deterministic idempotent mapping; verify **zero discrepancy in posted money**, no old ID/receipt/file changes, no invalid cross-school FK, tested resume/rollback. Existing `FeeDue`/single-payment compatibility persists until approved cutover; no new aggregate may accidentally double count old and new shadows. A financial reversal is an audited event rather than dropping already-written new production data.

## 3. Detailed API/DTO and guard DLD
**Task contract proposal:** Admission response includes `chargesPreview` and `chargesCreated` from fee facade; GET /operator/students/:id/fees/statement. Fee rule setup already supplies school-approved amount; do not trust UI-supplied total. Reject cross-tenant charge ID.

**Validation and response:** Request via Zod typed contracts; server actor determines school; category/rule/charge IDs validated same-school before work. Money `NUMERIC(12,2)`/Decimal (avoid `Number()` for financial posting), business DATE school-local. Mutations require MANAGER plus CSRF/audit, immutable idempotency key with request hash, version or row lock, 409 on stale/overpay/invalid state, 422 malformed money/dates, 403 viewer, 404 foreign tenant, 503 recoverable queue/storage. Preserve legacy route/method/request/response or provide explicit adapter + regression test.

**Cross-module HTTP and public facade behavior:** Admission service validates class, school and active admission date, calls FeesPublicFacade.postInitialCharges with immutable admission eventId; use same outbox/idempotency flow for manual admission and XLSX import. All fees mutations and document clearance use the Fees-owned StudentFeeAccount lock/revision boundary; document issue never queries private fee repositories.

## 4. Service algorithm & frontend UI design
**Implementation and user journey sequence:**
1. Admission service validates class, school and active admission date, calls FeesPublicFacade.postInitialCharges with immutable admission eventId; use same outbox/idempotency flow for manual admission and XLSX import.
2. Ensure student create and initial charge posting have a recoverable status on failure. Do not create a second Student for a fee-posting retry; persist admission event and resume worker.
3. Fee summary shows separate registration/admission lines and amount before payment; receipt generated only after actual money collection.
4. New admission has ₹400 registration + ₹500 admission once; duplicate submission returns original charge IDs; existing monthly tuition and student import continue.

**Existing service flow from the requested requirements:** Students admission service calls FeesPublicFacade.postInitialCharges via transaction coordinator or post-commit transactional outbox; choose architecture ensuring eventual consistency with explicit PendingFinancialSetup status and safe retries; not direct fees repository write. Web admission confirmation shows one-time charges & next steps. Retry returns identical source IDs.

**Failure, retry and race behavior:** Student reactivation via CL-04, unique Student Code changes, and bulk import call same billing code path. Failure halfway in fee posting must be observable/replayed without duplicate student/admission fee.

**UI contract:** show school/current year where applicable, selected student/fee type/period and due/paid/outstanding with human-readable source month. On any mutation, show confirmation/preview before writing, loading and duplicate-click prevention, recoverable errors, final server-sourced totals and links to existing payment history. Support 360px mobile, 768px tablet, 1366px desktop, keyboard/labels and A4 print where used. No dead buttons or changes to unrelated navigation.

## 5. Executable FE, BE and NFR validation
**FE tests:** TASK-016-FE01 normal and invalid school scenarios; TASK-016-FE02 tenant/role and legacy regression; TASK-016-FE03 concurrency or load as applicable.
  
**BE/API/DB/tenant tests:** TASK-016-BE01 normal and invalid school scenarios; TASK-016-BE02 tenant/role and legacy regression; TASK-016-BE03 concurrency or load as applicable.
  
**NFR/performance/security tests:** TASK-016-NFR01 normal and invalid school scenarios; TASK-016-NFR02 tenant/role and legacy regression; TASK-016-NFR03 concurrency or load as applicable.

**Mandatory adversarial tests:** school B charge/student UUID via school A; report viewer direct write; valid CSRF but wrong role; simultaneous pay/void on same account; imported duplicate records; timezone March–April boundary; job interruption/replay; zero balance after approved exemption; snapshot immutability after rule/class/name change. Apply tests relevant to this task and record others as N/A with reason. No mock-only green check marks: use isolated Postgres, web browser and queue where changed.

**Protected old journeys:** BASE-06,08,09,10,11; compare before/after using [REGRESSION-BASELINE.md](../REGRESSION-BASELINE.md), retaining all existing fee setup/generation, student admissions/imports, transport, dashboard pending XLSX, payment/void, receipts and platform TC as relevant.

## 6. Migration cutover and Done
Stage `schema expand → compatibility read → shadow backfill → amounts/IDs reconcile → controlled writer enablement → live reconciliation → documented safe roll-forward/recovery`. A rewrite is permitted but old UI/API functionality remains working until any deliberate replacement is reviewed. Record SQL/index EXPLAIN, 500/5000-student baseline p50/p95, real signed TEST outputs, screenshots at 3 widths, paired school fixtures, immutable old receipt/TC hashes, reviewer signoff in the [single tracker](../TASK-TRACKER.md). **Do not mark DONE before reviewed merge.**

## 8. Additional executable golden cases (test IDs & outcomes)

Use synthetic School A and School B, known requestId, stable baseline SHA and recorded before/after outputs. These supplement—not replace—Section 6 named cases:

| ID | Exact test action and assertion |
|---|---|
| TASK-016-FE04 | New student with ₹400 registration + ₹500 admission fees sees two dues exactly once. |
| TASK-016-FE05 | After network timeout click Confirm again: same Student UUID and charge IDs. |
| TASK-016-BE03 | Old import/admission flow with only monthly config still succeeds. |
| TASK-016-BE04 | Concurrent identical admission event posts one charge for each category. |
| TASK-016-BE05 | Other-school fee rule/category can't be bound to student. |
| TASK-016-NFR04 | Bulk 500/5k admissions memory/worker retries recorded with fee invariants. |
| TASK-016-NFR05 | Failure after student persist but before fee outbox publish resumes same event, no duplicate student. |

Reviewer must link actual browser/API/DB/load evidence for every applicable row in the **one tracker**. A screenshot of the UI without checking the underlying DB/HTTP result is not a PASS.
