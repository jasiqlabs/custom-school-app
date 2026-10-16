# TASK-018 — Transport, exam, late and miscellaneous fee charges

**Domain:** Fees / Transport · **Technical prerequisites:** TASK-013, TASK-014 · **Policy gate:** POLICY_CONFIRMATION · **Review:** **HIGH** · **Only execution tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md)

## 1. Functional requirements and exact use cases
**User story:** The school can transport, exam, late and miscellaneous fee charges.

**Source acceptance examples:** UC1: enrolled transport student charged valid route fee only while service active. UC2: once-per-term exam charge label 'Annual Exam' without full exam result module. UC3: manager manually records permitted late fee with reason, without auto-fine. UC4: Other category with memo/amount. UC5: fee update after transport ends does not delete past charges.

**Required business policy and constraints:** Automatic transport/exam/late billing rules remain blocked until client approves triggers and coverage. Late fees should default manual (no automatic penalty). Transport assignment ownership belongs Transport, fee assessment Fees. Exam fee does not entail creating whole exam module or admit card.

**Primary golden example:** Class has monthly tuition, student uses bus until Nov 15; December transport not due, old October unpaid persists. MANAGER manual exam fee doesn't create admit card. Confirm any school-level policy in [DECISIONS.md](../DECISIONS.md) before implementation; do not treat examples as approval for a new penalty, charge or write-off.

## 2. Detailed database/domain DLD
**Existing files and interfaces to inspect in latest stable main:** `apps/api/src/modules/transports/facade/transports-public.facade.ts`<br>`apps/api/src/modules/fees/application/generate-dues.service.ts`<br>`apps/web/src/app/operator/fees/setup/ui.tsx`

**Proposed schema evolution:** FeeRule supports charge basis/servicePeriod, examEventRef? (simple approved label, not grades), transportAssignmentId? as source reference, FeeCharge.originReference and reason, sourceKey unique by applicable school/student/event/month/category. Provide indexes for service validity windows.

**Precise model and ownership decisions:**
1. Use FeeCategory and FeeRule from TASK-012 and charge/allocations from TASK-013; transport assignment eligibility and effective date from TransportPublicFacade, not Student.transportRequired boolean alone.
2. For TRANSPORT generate due for eligible service period and school-approved proration under TASK-014; unique school/student/route service period key.

**Mandatory data migration:** prepare disposable test DB with two schools, previous school fees, paid/partial/void records, receipt numbers, historical student class and TC snapshots. Apply additive nullable/new-table migration; run deterministic idempotent mapping; verify **zero discrepancy in posted money**, no old ID/receipt/file changes, no invalid cross-school FK, tested resume/rollback. Existing `FeeDue`/single-payment compatibility persists until approved cutover; no new aggregate may accidentally double count old and new shadows. A financial reversal is an audited event rather than dropping already-written new production data.

## 3. Detailed API/DTO and guard DLD
**Task contract proposal:** Manager POST /operator/fees/charges/manual {studentId,categoryCode,reason,amount,eventLabel?,dueDate}; GET fee rules and eligible transport source summaries via TransportPublicFacade; finance service validates max/min amount and school category, auth and audit.

**Validation and response:** Request via Zod typed contracts; server actor determines school; category/rule/charge IDs validated same-school before work. Money `NUMERIC(12,2)`/Decimal (avoid `Number()` for financial posting), business DATE school-local. Mutations require MANAGER plus CSRF/audit, immutable idempotency key with request hash, version or row lock, 409 on stale/overpay/invalid state, 422 malformed money/dates, 403 viewer, 404 foreign tenant, 503 recoverable queue/storage. Preserve legacy route/method/request/response or provide explicit adapter + regression test.

**Cross-module HTTP and public facade behavior:** For TRANSPORT generate due for eligible service period and school-approved proration under TASK-014; unique school/student/route service period key. All fees mutations and document clearance use the Fees-owned StudentFeeAccount lock/revision boundary; document issue never queries private fee repositories.

## 4. Service algorithm & frontend UI design
**Implementation and user journey sequence:**
1. For TRANSPORT generate due for eligible service period and school-approved proration under TASK-014; unique school/student/route service period key.
2. For EXAM create event/term fee charge with approved label and due date only; for LATE default to manual reason until grace/triggers approved; OTHER manually posted with reason, typed negative/missing amount validation.
3. UI Fee Setup enables selected fee types, manually adds exam/late/other to individual student and shows preview; do not build admit-card or grading module.
4. Class has monthly tuition, student uses bus until Nov 15; December transport not due, old October unpaid persists. MANAGER manual exam fee doesn't create admit card.

**Existing service flow from the requested requirements:** Fees engine batch requests active service eligibility periods from TransportPublicFacade; calculates school-configured amount per approved dates; for Exam and Other show labeled form; Late manual requires extra reason. UI category selector dynamically shows only relevant fields, a preview table and post-confirm updated statement.

**Failure, retry and race behavior:** Student exits during charge period; need agreed prorating and future cutoff CL-02. Avoid charging transport to student with 'transportRequired' YES but no assignment if policy says actual service only. Do not issue exam admit card automatically.

**UI contract:** show school/current year where applicable, selected student/fee type/period and due/paid/outstanding with human-readable source month. On any mutation, show confirmation/preview before writing, loading and duplicate-click prevention, recoverable errors, final server-sourced totals and links to existing payment history. Support 360px mobile, 768px tablet, 1366px desktop, keyboard/labels and A4 print where used. No dead buttons or changes to unrelated navigation.

## 5. Executable FE, BE and NFR validation
**FE tests:** TASK-018-FE01 normal and invalid school scenarios; TASK-018-FE02 tenant/role and legacy regression; TASK-018-FE03 concurrency or load as applicable.
  
**BE/API/DB/tenant tests:** TASK-018-BE01 normal and invalid school scenarios; TASK-018-BE02 tenant/role and legacy regression; TASK-018-BE03 concurrency or load as applicable.
  
**NFR/performance/security tests:** TASK-018-NFR01 normal and invalid school scenarios; TASK-018-NFR02 tenant/role and legacy regression; TASK-018-NFR03 concurrency or load as applicable.

**Mandatory adversarial tests:** school B charge/student UUID via school A; report viewer direct write; valid CSRF but wrong role; simultaneous pay/void on same account; imported duplicate records; timezone March–April boundary; job interruption/replay; zero balance after approved exemption; snapshot immutability after rule/class/name change. Apply tests relevant to this task and record others as N/A with reason. No mock-only green check marks: use isolated Postgres, web browser and queue where changed.

**Protected old journeys:** BASE-09,10,11,12,13; compare before/after using [REGRESSION-BASELINE.md](../REGRESSION-BASELINE.md), retaining all existing fee setup/generation, student admissions/imports, transport, dashboard pending XLSX, payment/void, receipts and platform TC as relevant.

## 6. Migration cutover and Done
Stage `schema expand → compatibility read → shadow backfill → amounts/IDs reconcile → controlled writer enablement → live reconciliation → documented safe roll-forward/recovery`. A rewrite is permitted but old UI/API functionality remains working until any deliberate replacement is reviewed. Record SQL/index EXPLAIN, 500/5000-student baseline p50/p95, real signed TEST outputs, screenshots at 3 widths, paired school fixtures, immutable old receipt/TC hashes, reviewer signoff in the [single tracker](../TASK-TRACKER.md). **Do not mark DONE before reviewed merge.**

## 8. Additional executable golden cases (test IDs & outcomes)

Use synthetic School A and School B, known requestId, stable baseline SHA and recorded before/after outputs. These supplement—not replace—Section 6 named cases:

| ID | Exact test action and assertion |
|---|---|
| TASK-018-FE04 | Transport month charged while valid assignment exists; exam/other manual fees show label and period. |
| TASK-018-FE05 | Transport ended November: December fee absent; old October unpaid still owed. |
| TASK-018-BE04 | Existing Transport assignment/reassign and monthly tuition unchanged. |
| TASK-018-BE05 | Duplicate manual event/sourceKey rejected under parallel POST. |
| TASK-018-BE06 | Late fee without approved policy does not auto-create; report viewer cannot manual post. |
| TASK-018-NFR04 | Batch 5k students+transport service dates within measured query budget. |
| TASK-018-NFR05 | Interrupt fee generator then replay with same source keys: zero duplicate transport/exam charges. |

Reviewer must link actual browser/API/DB/load evidence for every applicable row in the **one tracker**. A screenshot of the UI without checking the underlying DB/HTTP result is not a PASS.
