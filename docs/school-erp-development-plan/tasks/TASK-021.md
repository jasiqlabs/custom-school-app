# TASK-021 — Academic-year financial continuity and reconciliation

**Domain:** Fees · **Technical prerequisites:** TASK-013, TASK-019 · **Policy gate:** SPEC_SYNC_REQUIRED · **Review:** **CRITICAL** · **Only execution tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md)

## 1. Functional requirements and exact use cases
**User story:** The school can academic-year financial continuity and reconciliation.

**Source acceptance examples:** UC1: 2026–27 old ₹400 unpaid and 2027–28 ₹900 tuition -> statement ₹1300 with original origin sessions. UC2: pay ₹400 in 2027–28, old charge closes, new remains. UC3: closed year report still shows as-of-close outstanding vs today's remaining, clearly labelled. UC4: previous paid receipts remain immutable.

**Required business policy and constraints:** Carry genuine previous-session unpaid charges forward into the current collection statement without duplicating them or rewriting the original year. New-year new fee obligations are separate charges.

**Primary golden example:** Old 2026-27 debt ₹400 + 2027-28 tuition ₹900 => outstanding ₹1,300, not ₹1,700; pay ₹400 next year, old charge clears, new remains ₹900. Closed-year 'at close' report is immutable. Confirm any school-level policy in [DECISIONS.md](../DECISIONS.md) before implementation; do not treat examples as approval for a new penalty, charge or write-off.

## 2. Detailed database/domain DLD
**Existing files and interfaces to inspect in latest stable main:** `apps/api/src/modules/fees/facade/fees-public.facade.ts`<br>`apps/api/src/modules/fees/application/query-pending-fees.service.ts`<br>`prisma/schema.prisma`

**Proposed schema evolution:** FeeCharge.originSessionId UUID FK, servicePeriod start/end/date and immutable billed amount. FeePaymentAllocation appliedOn timestamp and optional collectionSessionId as contextual metadata. SessionCloseSnapshot aggregate counts/hash generated from fee facade for frozen as-of reporting, not source of truth for live balances.

**Precise model and ownership decisions:**
1. Make originSessionId on assessed Charge immutable, with service period and due date; collections after school-year close still allocate to ORIGINAL charge.
2. FeesPublicFacade.getStatement accepts student/school, asOf date and includePriorSessions. Query distinguishes 'origin year' and 'collection date', sums unique source balances; old year snapshot at close separate from current live outstanding.

**Mandatory data migration:** prepare disposable test DB with two schools, previous school fees, paid/partial/void records, receipt numbers, historical student class and TC snapshots. Apply additive nullable/new-table migration; run deterministic idempotent mapping; verify **zero discrepancy in posted money**, no old ID/receipt/file changes, no invalid cross-school FK, tested resume/rollback. Existing `FeeDue`/single-payment compatibility persists until approved cutover; no new aggregate may accidentally double count old and new shadows. A financial reversal is an audited event rather than dropping already-written new production data.

## 3. Detailed API/DTO and guard DLD
**Task contract proposal:** FeesPublicFacade.getStatement({schoolId,studentId,asOfDate,includeClosedSessions:true}); GET /operator/fees/statements/:studentId?academicSessionId; GET /operator/academic-sessions/:id/closing-financial-summary. Response splits originSession, chargePeriod, paid/outstanding.

**Validation and response:** Request via Zod typed contracts; server actor determines school; category/rule/charge IDs validated same-school before work. Money `NUMERIC(12,2)`/Decimal (avoid `Number()` for financial posting), business DATE school-local. Mutations require MANAGER plus CSRF/audit, immutable idempotency key with request hash, version or row lock, 409 on stale/overpay/invalid state, 422 malformed money/dates, 403 viewer, 404 foreign tenant, 503 recoverable queue/storage. Preserve legacy route/method/request/response or provide explicit adapter + regression test.

**Cross-module HTTP and public facade behavior:** FeesPublicFacade.getStatement accepts student/school, asOf date and includePriorSessions. Query distinguishes 'origin year' and 'collection date', sums unique source balances; old year snapshot at close separate from current live outstanding. All fees mutations and document clearance use the Fees-owned StudentFeeAccount lock/revision boundary; document issue never queries private fee repositories.

## 4. Service algorithm & frontend UI design
**Implementation and user journey sequence:**
1. FeesPublicFacade.getStatement accepts student/school, asOf date and includePriorSessions. Query distinguishes 'origin year' and 'collection date', sums unique source balances; old year snapshot at close separate from current live outstanding.
2. Rollover does not create a carrying-forward charge or settle/write off past debts. Add indexed school/student/originSession/period projections; original receipt snapshots and school totals stay stable.
3. UI statement shows previous-session arrears separately from current month and the exact original fee period. Refresh when new-year charges posted.
4. Old 2026-27 debt ₹400 + 2027-28 tuition ₹900 => outstanding ₹1,300, not ₹1,700; pay ₹400 next year, old charge clears, new remains ₹900. Closed-year 'at close' report is immutable.

**Existing service flow from the requested requirements:** Fees owner builds SQL over ledger with session filter, allocations, and cutoffs. Academics close-preview calls fees facade only, never fee tables. Web statement groups older-session arrears separately, total remains sum of source charge balances. Receipts always use payment-time source allocation snapshots.

**Failure, retry and race behavior:** What happens when prior balances legally written off or conceded requires explicit adjustment with actor/reason, not direct status PAID. Financial-year numbering is a separate CL-06 policy.

**UI contract:** show school/current year where applicable, selected student/fee type/period and due/paid/outstanding with human-readable source month. On any mutation, show confirmation/preview before writing, loading and duplicate-click prevention, recoverable errors, final server-sourced totals and links to existing payment history. Support 360px mobile, 768px tablet, 1366px desktop, keyboard/labels and A4 print where used. No dead buttons or changes to unrelated navigation.

## 5. Executable FE, BE and NFR validation
**FE tests:** TASK-021-FE01 normal and invalid school scenarios; TASK-021-FE02 tenant/role and legacy regression; TASK-021-FE03 concurrency or load as applicable.
  
**BE/API/DB/tenant tests:** TASK-021-BE01 normal and invalid school scenarios; TASK-021-BE02 tenant/role and legacy regression; TASK-021-BE03 concurrency or load as applicable.
  
**NFR/performance/security tests:** TASK-021-NFR01 normal and invalid school scenarios; TASK-021-NFR02 tenant/role and legacy regression; TASK-021-NFR03 concurrency or load as applicable.

**Mandatory adversarial tests:** school B charge/student UUID via school A; report viewer direct write; valid CSRF but wrong role; simultaneous pay/void on same account; imported duplicate records; timezone March–April boundary; job interruption/replay; zero balance after approved exemption; snapshot immutability after rule/class/name change. Apply tests relevant to this task and record others as N/A with reason. No mock-only green check marks: use isolated Postgres, web browser and queue where changed.

**Protected old journeys:** BASE-05,07,09,10,11,12; compare before/after using [REGRESSION-BASELINE.md](../REGRESSION-BASELINE.md), retaining all existing fee setup/generation, student admissions/imports, transport, dashboard pending XLSX, payment/void, receipts and platform TC as relevant.

## 6. Migration cutover and Done
Stage `schema expand → compatibility read → shadow backfill → amounts/IDs reconcile → controlled writer enablement → live reconciliation → documented safe roll-forward/recovery`. A rewrite is permitted but old UI/API functionality remains working until any deliberate replacement is reviewed. Record SQL/index EXPLAIN, 500/5000-student baseline p50/p95, real signed TEST outputs, screenshots at 3 widths, paired school fixtures, immutable old receipt/TC hashes, reviewer signoff in the [single tracker](../TASK-TRACKER.md). **Do not mark DONE before reviewed merge.**
