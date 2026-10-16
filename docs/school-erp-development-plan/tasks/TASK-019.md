# TASK-019 — Arrears statement and cross-month fee collection

**Engineering owner:** Fees. **Only technical predecessors:** TASK-013, TASK-014 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Show prior unpaid months and current due together with original fee category and month. Support one payment allocated across older/newer charge rows without any extra carry-forward charge.

**Explicitly out of this task:** Do not automatically back-bill unknown historical periods. Opening debts imported in TASK-020 will use same statement port after that feature ships.

**Operator/user story:** At the time of collecting September fees, operator sees unpaid August balance in the same view and may settle both while each liability remains tied to its original billing month.

**Use cases with success/error expectations:** UC1: August ₹700, paid ₹200 -> August ₹500; September ₹700 -> total due ₹1,200. UC2: collect ₹600 under approved oldest-first policy -> August ₹0 and Sept ₹600; new payment allocations total ₹600. UC3: May fee from previous academic year remains outstanding and visible. UC4: void previously collected payment restores correct source month balance. UC5: missing May/June historical due because generation wasn't run shows 'unassessed' vs '0 owed' until controlled generation.

**Domain rules and acceptance:** Never duplicate an old debt as a current-month charge; carry forward is computed presentation. Which months to assess before product go-live is policy-controlled CL-02/03; do not automatically backcharge all past months. Oldest-first suggested but client can choose manual allocation. Ensure one statement source for pending reports, TC clearance and user UI.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** FeeCharge unique sourceKey school/student/category/period/event, originSessionId and assessedAt/dueDate. Outstanding computed from netAmount and non-void allocations (plus FeeAdjustment). Create indexed statement read projection by school/student/dueDate/status. Legacy FeeDue backfill under FE-07 compares ledgers; missing months repair via approval-driven idempotent assessment batch.

**Typed endpoints and cross-domain facade contracts:** GET /operator/fees/students/:studentId/statement?asOfDate&sessionId gives currentCharges, priorMonthArrears, priorSessionArrears, totalDue, unassessedPeriods; POST /operator/fees/payments accepts explicit list of allocation amounts to distinct charges. Pending report adds previousMonthsOutstanding and original periods while old month report stays compatible.

**Detailed service orchestration, server algorithm and frontend states:** Fees domain computes all eligible outstanding charges (including older sessions), sorts by dueDate, server calculates aggregates using Decimal and response with per-line IDs. UI has previous-month arrears grouped by month and current charge list with checkboxes; payment preview cannot allocate more than original balance; after successful post refetch entire statement. TC clearance consumes same service, never separately sums fee_due table.

**Recovery, idempotency, edge/race cases:** Future-dated fee should not be reported already overdue, but may be payable early if policy; arrears as of cutoff defined. Leaving stops new fees, not collections. Credit/concession adjustments never silently erase old balances.

## 3. Specific FE, BE and NFR tests

**FE:** FE01 successful create/view, FE02 error validation, FE03 manual retry, FE04 responsive 360/768/1366 and WCAG keyboard/contrast.

**BE/DB/API/security:** Fees domain computes all eligible outstanding charges (including older sessions), sorts by dueDate, server calculates aggregates using Decimal and response with per-line IDs. UI has previous-month arrears grouped by month and current charge list with checkboxes; payment preview cannot allocate more than original balance; after successful post refetch entire statement. TC clearance consumes same service, never separately sums fee_due table.

**NFR/operations:** NFR01 benchmark p95 for 500/5000 students with 24 months, NFR02 non-destructive backfill and recovery, NFR03 protected PII and reports, NFR04 job/worker restart.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Math verified against client example, no extra charge inserted, all dependent fee screens/certificates use common balance service. An independent reviewer must see proof and update [TASK-TRACKER](../TASK-TRACKER.md) with PR/commit, owner, FE/BE/NFR artifacts and release status before marking DONE. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
