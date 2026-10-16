# TASK-017 — Books and uniform selection during admission

**Domain:** Admission / Fees · **Technical prerequisites:** TASK-016 · **Policy gate:** SPEC_SYNC_REQUIRED · **Review:** **MEDIUM** · **Only execution tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md)

## 1. Functional requirements and exact use cases
**User story:** The school can books and uniform selection during admission.

**Source acceptance examples:** UC1: selects Books only, preview and created dues show Books charge. UC2: selects Books+Uniform, two independent fees; UC3: deselect both, no charges. UC4: student cannot trigger extra fee by submitting a fake low amount; server recalculates from rule. UC5: correct error without duplicate student after network timeout.

**Required business policy and constraints:** No Books/Uniform inventory, distribution, purchasing, vendor or stock dashboard. Only optional charge selection and posting at admission. Whether items are per-school per-session or one-time and whether amount override allowed must be explicitly decided.

**Primary golden example:** None selected -> no optional charges; Books only, Uniform only, both; retry once; select other-school rule rejected; student still admitted. Confirm any school-level policy in [DECISIONS.md](../DECISIONS.md) before implementation; do not treat examples as approval for a new penalty, charge or write-off.

## 2. Detailed database/domain DLD
**Existing files and interfaces to inspect in latest stable main:** `apps/web/src/app/operator/students/new/ui.tsx`<br>`apps/api/src/modules/students/application/admit-student.service.ts`<br>`packages/validation/src/students/student.schema.ts`

**Proposed schema evolution:** FeeCharge sourceKey school+student+category+admissionEventID; reference `FeeRuleId` and snapshot amount, no product SKU or inventory table. AdmissionSelection snapshot for audit records chosen category codes, not a permanent inventory entitlement.

**Precise model and ownership decisions:**
1. Extend validated Admission request with chosen category rule IDs/typed BOOKS and UNIFORM flags, no supplier SKU/warehouse quantity or inventory table.
2. Server resolves configured active FeeRule/amount from school/class/date; never trust client-submitted price, free-text amount or a rule from another school.

**Mandatory data migration:** prepare disposable test DB with two schools, previous school fees, paid/partial/void records, receipt numbers, historical student class and TC snapshots. Apply additive nullable/new-table migration; run deterministic idempotent mapping; verify **zero discrepancy in posted money**, no old ID/receipt/file changes, no invalid cross-school FK, tested resume/rollback. Existing `FeeDue`/single-payment compatibility persists until approved cutover; no new aggregate may accidentally double count old and new shadows. A financial reversal is an audited event rather than dropping already-written new production data.

## 3. Detailed API/DTO and guard DLD
**Task contract proposal:** Student POST admission accepts optional `chargeSelections: ['BOOKS','UNIFORM']` only (or rule IDs validated school-side); GET /operator/students/admission-fee-options?classId&academicSessionId supplies configured amount and labels; server posts charges via Fees facade.

**Validation and response:** Request via Zod typed contracts; server actor determines school; category/rule/charge IDs validated same-school before work. Money `NUMERIC(12,2)`/Decimal (avoid `Number()` for financial posting), business DATE school-local. Mutations require MANAGER plus CSRF/audit, immutable idempotency key with request hash, version or row lock, 409 on stale/overpay/invalid state, 422 malformed money/dates, 403 viewer, 404 foreign tenant, 503 recoverable queue/storage. Preserve legacy route/method/request/response or provide explicit adapter + regression test.

**Cross-module HTTP and public facade behavior:** Server resolves configured active FeeRule/amount from school/class/date; never trust client-submitted price, free-text amount or a rule from another school. All fees mutations and document clearance use the Fees-owned StudentFeeAccount lock/revision boundary; document issue never queries private fee repositories.

## 4. Service algorithm & frontend UI design
**Implementation and user journey sequence:**
1. Server resolves configured active FeeRule/amount from school/class/date; never trust client-submitted price, free-text amount or a rule from another school.
2. Fees facade posts distinct idempotent FeeCharge using admissionEvent sourceKey, one per chosen category. Selection removal after paid requires approved adjustment, never delete old payment.
3. UI admission step lists Books and Uniform independently with school-configured price and selection. Review shows selections separately from monthly/registration amounts, no stock-management action.
4. None selected -> no optional charges; Books only, Uniform only, both; retry once; select other-school rule rejected; student still admitted.

**Existing service flow from the requested requirements:** Admission wizard section toggles with labeled configured prices; live review shows tuition + initial charges and any transport selection separately. On confirm, Students service validates school/class/session and requests FeesPublicFacade.postInitialCharges with source event; creates independent charges as configured; show receipt only after actual payment.

**Failure, retry and race behavior:** Changing selection after paid billing needs adjustment/refund business rule, not deleting historical fee. Do not infer books delivered from fee paid. More than one admission in different year obeys approved one-time policy.

**UI contract:** show school/current year where applicable, selected student/fee type/period and due/paid/outstanding with human-readable source month. On any mutation, show confirmation/preview before writing, loading and duplicate-click prevention, recoverable errors, final server-sourced totals and links to existing payment history. Support 360px mobile, 768px tablet, 1366px desktop, keyboard/labels and A4 print where used. No dead buttons or changes to unrelated navigation.

## 5. Executable FE, BE and NFR validation
**FE tests:** TASK-017-FE01 normal and invalid school scenarios; TASK-017-FE02 tenant/role and legacy regression; TASK-017-FE03 concurrency or load as applicable.
  
**BE/API/DB/tenant tests:** TASK-017-BE01 normal and invalid school scenarios; TASK-017-BE02 tenant/role and legacy regression; TASK-017-BE03 concurrency or load as applicable.
  
**NFR/performance/security tests:** TASK-017-NFR01 normal and invalid school scenarios; TASK-017-NFR02 tenant/role and legacy regression; TASK-017-NFR03 concurrency or load as applicable.

**Mandatory adversarial tests:** school B charge/student UUID via school A; report viewer direct write; valid CSRF but wrong role; simultaneous pay/void on same account; imported duplicate records; timezone March–April boundary; job interruption/replay; zero balance after approved exemption; snapshot immutability after rule/class/name change. Apply tests relevant to this task and record others as N/A with reason. No mock-only green check marks: use isolated Postgres, web browser and queue where changed.

**Protected old journeys:** BASE-06,09,10,11; compare before/after using [REGRESSION-BASELINE.md](../REGRESSION-BASELINE.md), retaining all existing fee setup/generation, student admissions/imports, transport, dashboard pending XLSX, payment/void, receipts and platform TC as relevant.

## 6. Migration cutover and Done
Stage `schema expand → compatibility read → shadow backfill → amounts/IDs reconcile → controlled writer enablement → live reconciliation → documented safe roll-forward/recovery`. A rewrite is permitted but old UI/API functionality remains working until any deliberate replacement is reviewed. Record SQL/index EXPLAIN, 500/5000-student baseline p50/p95, real signed TEST outputs, screenshots at 3 widths, paired school fixtures, immutable old receipt/TC hashes, reviewer signoff in the [single tracker](../TASK-TRACKER.md). **Do not mark DONE before reviewed merge.**

## 8. Additional executable golden cases (test IDs & outcomes)

Use synthetic School A and School B, known requestId, stable baseline SHA and recorded before/after outputs. These supplement—not replace—Section 6 named cases:

| ID | Exact test action and assertion |
|---|---|
| TASK-017-FE04 | During admission tick Books only, Uniform only, both, none; verify server-priced statement. |
| TASK-017-FE05 | Tamper submitted Books amount to ₹1 or other-school rule: server rejects/overrides safely. |
| TASK-017-BE04 | Existing admission without optional fee selection remains fully operational. |
| TASK-017-BE05 | Double-submit selection creates at most one charge per category/event. |
| TASK-017-BE06 | Viewer cannot post optional charges using direct API; stale rule ID 409. |
| TASK-017-NFR04 | Compare admission p95 and memory with/without both categories at 500 students. |
| TASK-017-NFR05 | No SKU/inventory/stock entity or activity is created by optional fee payment. |

Reviewer must link actual browser/API/DB/load evidence for every applicable row in the **one tracker**. A screenshot of the UI without checking the underlying DB/HTTP result is not a PASS.
