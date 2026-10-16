# TASK-013 — Multi-charge ledger and payment allocation migration

**Owner:** Fees · **Requires:** TASK-008, TASK-012 · **Policy gate:** SPEC_SYNC_REQUIRED · **Review risk:** **CRITICAL** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can multi-charge ledger and payment allocation migration.

**Cases to demonstrate:** UC1: student owes tuition ₹700, transport ₹150 and exam ₹100 in same month (all distinct charges). UC2: one ₹500 payment applied ₹350 tuition + ₹150 transport; receipt total ₹500 and outstanding ₹450. UC3: replay with same idempotency key yields existing receipt; not a second payment. UC4: void restores each original charge amount and preserves receipt number. UC5: migrate 20 old monthly fees without changing customer balance/receipt IDs.

**Policy/eligibility:** Financial authority is FeeCharge+active payment allocations+explicit adjustments. No JS floating-point calculations for posting; Decimal(12,2)/minor units with exact rounding. Every POST school-scoped and atomic with row locks; no arbitrary overpayment or negative charge. Migration dual-reading must never double count old FeeDue and migrated new FeeCharge. Approved old same-day void policy retained.

**Concrete golden scenario:** Zero duplicate charges across 20 parallel payment attempts; refund/void reopens exactly original balances. Old receipt and school dashboard amounts byte/paise-equivalent before and after. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `apps/api/src/modules/fees/application/collect-payment.service.ts`<br>`apps/api/src/modules/fees/application/void-payment.service.ts`<br>`apps/api/src/modules/fees/repository/fees.repository.ts`<br>`prisma/schema.prisma`

**Schema and migration contract from requirement:** FeeCharge(id,schoolId,studentId,academicSessionId?,classId?,categoryId,ruleId?,sourceKey,originRef,periodStart DATE?,periodEnd?,dueDate DATE,baseAmount NUMERIC12,2,concessionAmount,fineAmount,netAmount,paidAmount,balance,status,version,createdAt) UNIQUE(schoolId,sourceKey); CHECK(net>=0,paid>=0,balance>=0,paid+balance=net) validated database/service. FeePaymentAllocation(id,paymentId,chargeId,amount NUMERIC12,2,voidReversedAt?,schoolId) UNIQUE(paymentId,chargeId), nonzero amount. FeePayment current rows retained with legacy dueId during expand; add optional payment-snapshot/collector and mapping table LegacyDueChargeMap(legacyDueId,chargeId) to reconcile; ensure composite same-school relations. The current receipt number allocator is fully retained. Any optional future series-policy extension is separate and not required for this task.

**Detailed new DB behavior:** Add FeeCharge (unique sourceKey) and FeePaymentAllocation (paymentId,chargeId,Decimal amount), FeeAdjustment and LegacyDueChargeMap. Store originSession, category/period, immutable assessed amounts, rule snapshot and school/student composite FK. Preserve old FeeDue/FeePayment IDs, dueId and receipt series.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** GET /operator/fees/students/:studentId/statement {charges,balances,period,originSession}; POST /operator/fees/payments {studentId,idempotencyKey,paymentDate,mode,allocations:[{chargeId,amount}],reference?}, response PaymentReceiptDto with immutable allocated line snapshots. POST /operator/fees/payments/:id/void replays original allocations atomically. Keep old {dueId,amount} API path behind compatibility adapter during cutover; typed 409 overpay/replay hash mismatch, 422 invalid allocation.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Design **one** authoritative projection that prefers mapped FeeCharge/allocations but does not sum shadow legacy FeeDue a second time. Existing GET fee, dashboard, pending export, print receipt and void are compatibility-adapted until every school reconciles.

## 4. Service/repository algorithm — implement in this order
1. Design **one** authoritative projection that prefers mapped FeeCharge/allocations but does not sum shadow legacy FeeDue a second time. Existing GET fee, dashboard, pending export, print receipt and void are compatibility-adapted until every school reconciles.
2. Payment POST new body allocations[] while legacy `{dueId,amount,mode,...}` maps to a single allocation. Lock StudentFeeAccount → ordered charge rows → receipt allocator → payment/allocations/audit in one transaction. Same idempotency key + different payload yields 409; exact replay returns existing receipt.
3. Introduce per-tenant cutover feature flag, shadow backfill of old rows, checksum and Decimal zero-variance reconcile (charge/paid/balance, void, receipt IDs) before write switch. Do not dual-write without idempotent causal mapping.
4. Zero duplicate charges across 20 parallel payment attempts; refund/void reopens exactly original balances. Old receipt and school dashboard amounts byte/paise-equivalent before and after.

**Inter-module integration currently proposed:** Fees service selects target FeeCharge rows by school+student+IDs, sorts IDs and SELECT FOR UPDATE, validates remaining balances and same actor/tenant, locks receipt sequence, writes FeePayment, FeePaymentAllocation, charge balances and audit outbox in ONE SQL transaction. Backfill shadow FeeCharge/allocations from original FeeDue/Payment with original amounts and dates, compare counts/totals/void states per school, cutover with feature flag only when exact reconciled. Read old and new via one unified facade; UI multi-selection summary, payment allocation preview, receipt view composer, refresh statement after post/void. Students/TC only consume FeesPublicFacade, never direct fees persistence.

**Failure handling:** Two simultaneous payment requests for same charge cannot overpay; same key different request hash 409, exact same key returns original receipt. Void once under Asia/Kolkata same-day policy, preserve historic number and line item data. Paid source charge must not be modified in place on concession/rule edit; use adjustment or forward billing. Migrated old receipt initially lacks allocation array; projection builds equivalent single line. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** Zero duplicate charges across 20 parallel payment attempts; refund/void reopens exactly original balances. Old receipt and school dashboard amounts byte/paise-equivalent before and after.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-013-FE01 user journey on 360/768/1366; TASK-013-FE02 invalid form; TASK-013-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-013-BE01 service API; TASK-013-BE02 tenant isolation; TASK-013-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-013-NFR01 load target; TASK-013-NFR02 privacy; TASK-013-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-05,09,10,11,12,14. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.
