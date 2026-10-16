# TASK-019 — Arrears statement and cross-month fee collection

**Domain:** Fees · **Technical prerequisites:** TASK-013, TASK-014 · **Policy gate:** POLICY_CONFIRMATION · **Review:** **CRITICAL** · **Only execution tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md)

## 1. Functional requirements and exact use cases
**User story:** The school can arrears statement and cross-month fee collection.

**Source acceptance examples:** UC1: August ₹700, paid ₹200 -> August ₹500; September ₹700 -> total due ₹1,200. UC2: collect ₹600 under approved oldest-first policy -> August ₹0 and Sept ₹600; new payment allocations total ₹600. UC3: May fee from previous academic year remains outstanding and visible. UC4: void previously collected payment restores correct source month balance. UC5: missing May/June historical due because generation wasn't run shows 'unassessed' vs '0 owed' until controlled generation.

**Required business policy and constraints:** Never duplicate an old debt as a current-month charge; carry forward is computed presentation. Which months to assess before product go-live is policy-controlled CL-02/03; do not automatically backcharge all past months. Oldest-first suggested but client can choose manual allocation. Ensure one statement source for pending reports, TC clearance and user UI.

**Primary golden example:** August ₹700 paid ₹200 => ₹500; September ₹700 => statement ₹1,200. Pay ₹600 across old/new source, show exact new totals; void restores original source month balances. Confirm any school-level policy in [DECISIONS.md](../DECISIONS.md) before implementation; do not treat examples as approval for a new penalty, charge or write-off.

## 2. Detailed database/domain DLD
**Existing files and interfaces to inspect in latest stable main:** `apps/api/src/modules/fees/application/query-pending-fees.service.ts`<br>`apps/api/src/modules/fees/application/collect-payment.service.ts`<br>`apps/web/src/app/operator/fees/collect/ui.tsx`

**Proposed schema evolution:** FeeCharge unique sourceKey school/student/category/period/event, originSessionId and assessedAt/dueDate. Outstanding computed from netAmount and non-void allocations (plus FeeAdjustment). Create indexed statement read projection by school/student/dueDate/status. Legacy FeeDue backfill under FE-07 compares ledgers; missing months repair via approval-driven idempotent assessment batch.

**Precise model and ownership decisions:**
1. Statement service queries all source FeeCharge remaining balances by student/school and dueDate, separates overdue previous months, current period and older academic sessions; never INSERT carryforward charge.
2. If some legacy due months were never assessed, return `unassessedPeriods` explicitly based on admission/fee rules instead of saying '₹0 owed'. Do not auto-backfill historic unknown months on a read.

**Mandatory data migration:** prepare disposable test DB with two schools, previous school fees, paid/partial/void records, receipt numbers, historical student class and TC snapshots. Apply additive nullable/new-table migration; run deterministic idempotent mapping; verify **zero discrepancy in posted money**, no old ID/receipt/file changes, no invalid cross-school FK, tested resume/rollback. Existing `FeeDue`/single-payment compatibility persists until approved cutover; no new aggregate may accidentally double count old and new shadows. A financial reversal is an audited event rather than dropping already-written new production data.

## 3. Detailed API/DTO and guard DLD
**Task contract proposal:** GET /operator/fees/students/:studentId/statement?asOfDate&sessionId gives currentCharges, priorMonthArrears, priorSessionArrears, totalDue, unassessedPeriods; POST /operator/fees/payments accepts explicit list of allocation amounts to distinct charges. Pending report adds previousMonthsOutstanding and original periods while old month report stays compatible.

**Validation and response:** Request via Zod typed contracts; server actor determines school; category/rule/charge IDs validated same-school before work. Money `NUMERIC(12,2)`/Decimal (avoid `Number()` for financial posting), business DATE school-local. Mutations require MANAGER plus CSRF/audit, immutable idempotency key with request hash, version or row lock, 409 on stale/overpay/invalid state, 422 malformed money/dates, 403 viewer, 404 foreign tenant, 503 recoverable queue/storage. Preserve legacy route/method/request/response or provide explicit adapter + regression test.

**Cross-module HTTP and public facade behavior:** If some legacy due months were never assessed, return `unassessedPeriods` explicitly based on admission/fee rules instead of saying '₹0 owed'. Do not auto-backfill historic unknown months on a read. All fees mutations and document clearance use the Fees-owned StudentFeeAccount lock/revision boundary; document issue never queries private fee repositories.

## 4. Service algorithm & frontend UI design
**Implementation and user journey sequence:**
1. If some legacy due months were never assessed, return `unassessedPeriods` explicitly based on admission/fee rules instead of saying '₹0 owed'. Do not auto-backfill historic unknown months on a read.
2. Payment POST allocations uses ordered row/account locks and exact Decimal; default FIFO allocation priority is a client choice, not a hardcoded guess. Allow user review if manual mode approved.
3. UI Collect Fees displays prior-month rows with month and remaining, current rows, net total, selected allocation, paid/remaining after commit and no duplicated amount in reports.
4. August ₹700 paid ₹200 => ₹500; September ₹700 => statement ₹1,200. Pay ₹600 across old/new source, show exact new totals; void restores original source month balances.

**Existing service flow from the requested requirements:** Fees domain computes all eligible outstanding charges (including older sessions), sorts by dueDate, server calculates aggregates using Decimal and response with per-line IDs. UI has previous-month arrears grouped by month and current charge list with checkboxes; payment preview cannot allocate more than original balance; after successful post refetch entire statement. TC clearance consumes same service, never separately sums fee_due table.

**Failure, retry and race behavior:** Future-dated fee should not be reported already overdue, but may be payable early if policy; arrears as of cutoff defined. Leaving stops new fees, not collections. Credit/concession adjustments never silently erase old balances.

**UI contract:** show school/current year where applicable, selected student/fee type/period and due/paid/outstanding with human-readable source month. On any mutation, show confirmation/preview before writing, loading and duplicate-click prevention, recoverable errors, final server-sourced totals and links to existing payment history. Support 360px mobile, 768px tablet, 1366px desktop, keyboard/labels and A4 print where used. No dead buttons or changes to unrelated navigation.

## 5. Executable FE, BE and NFR validation
**FE tests:** TASK-019-FE01 normal and invalid school scenarios; TASK-019-FE02 tenant/role and legacy regression; TASK-019-FE03 concurrency or load as applicable.
  
**BE/API/DB/tenant tests:** TASK-019-BE01 normal and invalid school scenarios; TASK-019-BE02 tenant/role and legacy regression; TASK-019-BE03 concurrency or load as applicable.
  
**NFR/performance/security tests:** TASK-019-NFR01 normal and invalid school scenarios; TASK-019-NFR02 tenant/role and legacy regression; TASK-019-NFR03 concurrency or load as applicable.

**Mandatory adversarial tests:** school B charge/student UUID via school A; report viewer direct write; valid CSRF but wrong role; simultaneous pay/void on same account; imported duplicate records; timezone March–April boundary; job interruption/replay; zero balance after approved exemption; snapshot immutability after rule/class/name change. Apply tests relevant to this task and record others as N/A with reason. No mock-only green check marks: use isolated Postgres, web browser and queue where changed.

**Protected old journeys:** BASE-05,09,10,11,12; compare before/after using [REGRESSION-BASELINE.md](../REGRESSION-BASELINE.md), retaining all existing fee setup/generation, student admissions/imports, transport, dashboard pending XLSX, payment/void, receipts and platform TC as relevant.

## 6. Migration cutover and Done
Stage `schema expand → compatibility read → shadow backfill → amounts/IDs reconcile → controlled writer enablement → live reconciliation → documented safe roll-forward/recovery`. A rewrite is permitted but old UI/API functionality remains working until any deliberate replacement is reviewed. Record SQL/index EXPLAIN, 500/5000-student baseline p50/p95, real signed TEST outputs, screenshots at 3 widths, paired school fixtures, immutable old receipt/TC hashes, reviewer signoff in the [single tracker](../TASK-TRACKER.md). **Do not mark DONE before reviewed merge.**

## 8. Additional executable golden cases (test IDs & outcomes)

Use synthetic School A and School B, known requestId, stable baseline SHA and recorded before/after outputs. These supplement—not replace—Section 6 named cases:

| ID | Exact test action and assertion |
|---|---|
| TASK-019-FE04 | August ₹700 paid ₹200 + September ₹700 => ₹1,200 shown, with original month labels. |
| TASK-019-FE05 | Pay ₹600 to approved allocation and void: statement/report/dashboard reconcile exactly. |
| TASK-019-BE04 | Legacy pending-month report and history still render correct monthly source. |
| TASK-019-BE05 | Concurrent two payments from different sessions can't exceed original balance. |
| TASK-019-BE06 | School A cannot fetch School B student statement or allocate its charge. |
| TASK-019-NFR04 | Measure multi-month student statement p95 for 24–60 months, 9 categories. |
| TASK-019-NFR05 | Unassessed previous month appears 'not assessed' rather than zero; no GET-side charge generation. |

Reviewer must link actual browser/API/DB/load evidence for every applicable row in the **one tracker**. A screenshot of the UI without checking the underlying DB/HTTP result is not a PASS.
