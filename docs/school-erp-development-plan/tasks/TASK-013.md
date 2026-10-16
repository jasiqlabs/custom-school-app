# TASK-013 — Multi-charge ledger and payment allocation migration

**Engineering owner:** Fees. **Only technical predecessors:** TASK-008, TASK-012 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Introduce fee charge rows and receipt allocations while preserving every original single-month FeeDue and FeePayment record, even after parallel payment retries.

**Explicitly out of this task:** Do not switch production financial writers until exact legacy ledger reconciliation and rollback proof. Later fee categories are configurable now but optional charge generation is delivered in their own tasks.

**Operator/user story:** School can owe multiple independent amounts in same month, pay several line items under one receipt, void safely, and retain a verifiable history despite billing rule changes.

**Use cases with success/error expectations:** UC1: student owes tuition ₹700, transport ₹150 and exam ₹100 in same month (all distinct charges). UC2: one ₹500 payment applied ₹350 tuition + ₹150 transport; receipt total ₹500 and outstanding ₹450. UC3: replay with same idempotency key yields existing receipt; not a second payment. UC4: void restores each original charge amount and preserves receipt number. UC5: migrate 20 old monthly fees without changing customer balance/receipt IDs.

**Domain rules and acceptance:** Financial authority is FeeCharge+active payment allocations+explicit adjustments. No JS floating-point calculations for posting; Decimal(12,2)/minor units with exact rounding. Every POST school-scoped and atomic with row locks; no arbitrary overpayment or negative charge. Migration dual-reading must never double count old FeeDue and migrated new FeeCharge. Approved old same-day void policy retained.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** FeeCharge(id,schoolId,studentId,academicSessionId?,classId?,categoryId,ruleId?,sourceKey,originRef,periodStart DATE?,periodEnd?,dueDate DATE,baseAmount NUMERIC12,2,concessionAmount,fineAmount,netAmount,paidAmount,balance,status,version,createdAt) UNIQUE(schoolId,sourceKey); CHECK(net>=0,paid>=0,balance>=0,paid+balance=net) validated database/service. FeePaymentAllocation(id,paymentId,chargeId,amount NUMERIC12,2,voidReversedAt?,schoolId) UNIQUE(paymentId,chargeId), nonzero amount. FeePayment current rows retained with legacy dueId during expand; add optional payment-snapshot/collector and mapping table LegacyDueChargeMap(legacyDueId,chargeId) to reconcile; ensure composite same-school relations. The current receipt number allocator is fully retained. Any optional future series-policy extension is separate and not required for this task.

**Typed endpoints and cross-domain facade contracts:** GET /operator/fees/students/:studentId/statement {charges,balances,period,originSession}; POST /operator/fees/payments {studentId,idempotencyKey,paymentDate,mode,allocations:[{chargeId,amount}],reference?}, response PaymentReceiptDto with immutable allocated line snapshots. POST /operator/fees/payments/:id/void replays original allocations atomically. Keep old {dueId,amount} API path behind compatibility adapter during cutover; typed 409 overpay/replay hash mismatch, 422 invalid allocation.

**Detailed service orchestration, server algorithm and frontend states:** Fees service selects target FeeCharge rows by school+student+IDs, sorts IDs and SELECT FOR UPDATE, validates remaining balances and same actor/tenant, locks receipt sequence, writes FeePayment, FeePaymentAllocation, charge balances and audit outbox in ONE SQL transaction. Backfill shadow FeeCharge/allocations from original FeeDue/Payment with original amounts and dates, compare counts/totals/void states per school, cutover with feature flag only when exact reconciled. Read old and new via one unified facade; UI multi-selection summary, payment allocation preview, receipt view composer, refresh statement after post/void. Students/TC only consume FeesPublicFacade, never direct fees persistence.

**Recovery, idempotency, edge/race cases:** Two simultaneous payment requests for same charge cannot overpay; same key different request hash 409, exact same key returns original receipt. Void once under Asia/Kolkata same-day policy, preserve historic number and line item data. Paid source charge must not be modified in place on concession/rule edit; use adjustment or forward billing. Migrated old receipt initially lacks allocation array; projection builds equivalent single line.

## 3. Specific FE, BE and NFR tests

**FE:** TASK-013-FE01 3 independent fees same month; FE02 one payment apportioned to two charges with single receipt; FE03 partial payment and overpay validation; FE04 same-key retry returns same payment; FE05 void restores every source; FE06 old single-due receipt and monthly screen still work.

**BE/DB/API/security:** TASK-013-BE01 per-charge balance/paid/net DB invariant; BE02 20 parallel payments cannot overpay or double allocate; BE03 unique source key/receipt and idempotency hash conflict; BE04 transaction rollback zero partial rows; BE05 void once restores allocations; BE06 old FeeDue/Payment backfill exact per-school sums and prior receipt IDs.

**NFR/operations:** TASK-013-NFR01 seeded 500 and 5000 students ×24 months×9 categories query p95 and plans; NFR02 chunked migration kill+resume then reconcile ₹0 variance; NFR03 DB deadlock/retry behavior; NFR04 financial backup/restore and audit; NFR05 tenant BOLA and PII checks.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Migration rehearsal and per-school reconciliation 0 variance; old payment/void/receipt regression and new multi-line tests pass before enabling writers. Critical architecture reviewer sign-off required. An independent reviewer must see proof and update [TASK-TRACKER](../TASK-TRACKER.md) with PR/commit, owner, FE/BE/NFR artifacts and release status before marking DONE. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
