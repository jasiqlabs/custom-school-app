# TASK-015 — Concession reasons and non-destructive adjustments

**Domain:** Students / Fees · **Technical prerequisites:** TASK-013 · **Policy gate:** POLICY_CONFIRMATION · **Review:** **HIGH** · **Only execution tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md)

## 1. Functional requirements and exact use cases
**User story:** The school can concession reasons and non-destructive adjustments.

**Source acceptance examples:** UC1: ₹900 tuition 10% scholarship for merit; reason saved with student and future charge. UC2: concession NONE clears active reason if chosen but old paid charges keep original concession snapshot. UC3: school grants new concession after August paid; August receipt unchanged and September follows rule. UC4: authorized retrospective correction posts a separate signed adjustment event, never rewrites an original receipt.

**Required business policy and constraints:** Client decides required vs optional reason, whether discounts apply tuition only or all fee categories, and whether historical correction permitted. Preserve original type/value and unchanged paid invoice/receipt snapshots; code currently mutates pending due on profile change contrary to approved DLD. Must resolve via PRD/DLD governance, not simply extend mutation.

**Primary golden example:** Paid August receipt must remain byte-identical after September concession edit; future September net fee follows effective version; unauthorized retrospective edit/negative balance rejected. Confirm any school-level policy in [DECISIONS.md](../DECISIONS.md) before implementation; do not treat examples as approval for a new penalty, charge or write-off.

## 2. Detailed database/domain DLD
**Existing files and interfaces to inspect in latest stable main:** `apps/api/src/modules/fees/domain/concession-calculator.ts`<br>`apps/api/src/modules/fees/application/generate-dues.service.ts`<br>`apps/api/src/modules/students/application/update-student-profile.service.ts`<br>`prisma/schema.prisma`

**Proposed schema evolution:** Student.concessionReason nullable text max approved length, concessionPolicyVersion?; snapshot FeeCharge.concessionType,concessionValue,concessionAmount,reason? with private note separation; FeeAdjustment(id,chargeId,schoolId,amountDelta,reason,actorId,kind,state,createdAt) append-only with effective-date. Index student/charge and event audit.

**Precise model and ownership decisions:**
1. Store optional/required concession reason (client decision), configured type/value/effectiveFrom, and audited before/after. Fee adjustments are owned by Fees, student preference by Students.
2. On student change, validate % 0..100 and fixed max, then update prospective rule preference. Do not call legacy syncConcessionDues against PAID lines; choose reviewed adapter for unpaid old FeeDue: freeze original and post authorized FeeAdjustment, or preserve current until full cutover with explicit approval.

**Mandatory data migration:** prepare disposable test DB with two schools, previous school fees, paid/partial/void records, receipt numbers, historical student class and TC snapshots. Apply additive nullable/new-table migration; run deterministic idempotent mapping; verify **zero discrepancy in posted money**, no old ID/receipt/file changes, no invalid cross-school FK, tested resume/rollback. Existing `FeeDue`/single-payment compatibility persists until approved cutover; no new aggregate may accidentally double count old and new shadows. A financial reversal is an audited event rather than dropping already-written new production data.

## 3. Detailed API/DTO and guard DLD
**Task contract proposal:** Student PATCH /operator/students/:id extends concession {type,value,reason?} with explicit NONE rules; GET student profile returns authorized reason; FeePublicFacade.previewConcessionChange returns affected future periods and optional adjustments. Validation of %<=100, discount not exceeding gross, sanitization.

**Validation and response:** Request via Zod typed contracts; server actor determines school; category/rule/charge IDs validated same-school before work. Money `NUMERIC(12,2)`/Decimal (avoid `Number()` for financial posting), business DATE school-local. Mutations require MANAGER plus CSRF/audit, immutable idempotency key with request hash, version or row lock, 409 on stale/overpay/invalid state, 422 malformed money/dates, 403 viewer, 404 foreign tenant, 503 recoverable queue/storage. Preserve legacy route/method/request/response or provide explicit adapter + regression test.

**Cross-module HTTP and public facade behavior:** On student change, validate % 0..100 and fixed max, then update prospective rule preference. Do not call legacy syncConcessionDues against PAID lines; choose reviewed adapter for unpaid old FeeDue: freeze original and post authorized FeeAdjustment, or preserve current until full cutover with explicit approval. All fees mutations and document clearance use the Fees-owned StudentFeeAccount lock/revision boundary; document issue never queries private fee repositories.

## 4. Service algorithm & frontend UI design
**Implementation and user journey sequence:**
1. On student change, validate % 0..100 and fixed max, then update prospective rule preference. Do not call legacy syncConcessionDues against PAID lines; choose reviewed adapter for unpaid old FeeDue: freeze original and post authorized FeeAdjustment, or preserve current until full cutover with explicit approval.
2. Fee calculator snapshots original base/discount/reason on each new Charge, and adjustment carries actor, date, reason, signed delta and source issue link. No sensitive reason on receipt unless approved.
3. Profile UI shows concession selector, value, reason and 'Applies from' preview, with a warning if prior dues exist. Keep existing Student GET/PATCH contract compatible.
4. Paid August receipt must remain byte-identical after September concession edit; future September net fee follows effective version; unauthorized retrospective edit/negative balance rejected.

**Existing service flow from the requested requirements:** Manager edits concession in student profile, state shows current/forward effect; Students owns student-level preference via facade, Fees owns assessment/adjustment and recalculation where approved. Fees calculator uses exact decimal round-half-up, category applicability from approved policy, writes frozen reason snapshot on assessed charge. UI labels Description/Reason with helper.

**Failure, retry and race behavior:** Old data has null reason; do not force migration fill. Private free text may contain protected data; restrict display to authorized manager and audit reason edits; never auto-print sensitive reason on public receipt unless agreed.

**UI contract:** show school/current year where applicable, selected student/fee type/period and due/paid/outstanding with human-readable source month. On any mutation, show confirmation/preview before writing, loading and duplicate-click prevention, recoverable errors, final server-sourced totals and links to existing payment history. Support 360px mobile, 768px tablet, 1366px desktop, keyboard/labels and A4 print where used. No dead buttons or changes to unrelated navigation.

## 5. Executable FE, BE and NFR validation
**FE tests:** TASK-015-FE01 normal and invalid school scenarios; TASK-015-FE02 tenant/role and legacy regression; TASK-015-FE03 concurrency or load as applicable.
  
**BE/API/DB/tenant tests:** TASK-015-BE01 normal and invalid school scenarios; TASK-015-BE02 tenant/role and legacy regression; TASK-015-BE03 concurrency or load as applicable.
  
**NFR/performance/security tests:** TASK-015-NFR01 normal and invalid school scenarios; TASK-015-NFR02 tenant/role and legacy regression; TASK-015-NFR03 concurrency or load as applicable.

**Mandatory adversarial tests:** school B charge/student UUID via school A; report viewer direct write; valid CSRF but wrong role; simultaneous pay/void on same account; imported duplicate records; timezone March–April boundary; job interruption/replay; zero balance after approved exemption; snapshot immutability after rule/class/name change. Apply tests relevant to this task and record others as N/A with reason. No mock-only green check marks: use isolated Postgres, web browser and queue where changed.

**Protected old journeys:** BASE-06,07,09,10,11,12; compare before/after using [REGRESSION-BASELINE.md](../REGRESSION-BASELINE.md), retaining all existing fee setup/generation, student admissions/imports, transport, dashboard pending XLSX, payment/void, receipts and platform TC as relevant.

## 6. Migration cutover and Done
Stage `schema expand → compatibility read → shadow backfill → amounts/IDs reconcile → controlled writer enablement → live reconciliation → documented safe roll-forward/recovery`. A rewrite is permitted but old UI/API functionality remains working until any deliberate replacement is reviewed. Record SQL/index EXPLAIN, 500/5000-student baseline p50/p95, real signed TEST outputs, screenshots at 3 widths, paired school fixtures, immutable old receipt/TC hashes, reviewer signoff in the [single tracker](../TASK-TRACKER.md). **Do not mark DONE before reviewed merge.**
