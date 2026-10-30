# School ERP — Corrective Engineering DLD
**Status:** Proposed implementation design; source-reviewed at `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0` on 2026-10-30. No runtime verification performed.  
**Scope:** Web, NestJS API, Prisma/Postgres, BullMQ worker, typed contracts, regressions and NFR.  
**Single corrective tracker:** [TASK-TRACKER.md](TASK-TRACKER.md). **Business requirements/evidence:** [PRD.md](PRD.md).

## 1. Architecture and implementation invariants

**Codebase:** `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ), `prisma/schema.prisma`, `packages/contracts`, `packages/validation`, `packages/storage`. Existing FeeDue/FeePayment legacy records coexist with FeeCharge/FeePaymentAllocation. StudentEnrollment academicSessionId and date fields are nullable/legacy; old school + TC + money data must remain accessible.

**Ownership map:** Auth/Capabilities = Platform; School + Academics = Platform Admin/Academics; Student lifecycle/class = Students; FeeCharge/Payment/Adjustment/Clearance = Fees; service period/assignment = Transport; TC = existing TC domain; Admit Cards = Examination; Jobs/private files = Platform Foundation. Inter-domain calls through typed facades/ports: `StudentsPublicFacade`, `FeesPublicFacade`, `TransportsPublicFacade`, `SchoolInfoPublicFacade`. No new sibling-table Prisma queries; retire unsafe existing ones incrementally with regression proof.

**Deployment approach:** (1) capture old school/app baseline on two sanitized tenants, (2) additive schema + compatibility adapter, (3) source refactor and focused tests, (4) web consumer updated without old route removal, (5) shadow or canary verification/reconcile, (6) independent review, (7) later approved merge. One task branch/change per corrective ID or small PRs referencing SAME tracker row. Never alter a previously applied migration; test on disposable DB with backups. No CI requirement; local test outputs recorded.

**Security:** Operator session's `schoolId` trusted; platform routes separate; `REPORT_VIEWER` must not mutate even if HTTP method has class-level read permission or valid CSRF token. Every state-changing controller method has an explicit write capability; finance read never writes. Private records/file links reauthorize actor+school+role. If school/role/year changes, clear client and server caches and reject stale responses.

**Financial posting/ledger:** All mutations on one student must acquire FeeAccount row lock before assessing, paying, adjusting or voiding; signed amounts in Decimal/paise. SourceKey is idempotent per school+student+charge+period+origin event, payment requestKey with canonical hash. `Payment.amount == SUM(active allocations)` and `netAssessed = paid + outstanding`. Legacy mirrored FeeDue and FeeCharge are **one obligation**, not two. Paid original receipt never recomputed from current rule/name/concession.

**Fee-account transaction reference design:**
```ts
await prisma.$transaction(async tx => {
  // Upsert student-scoped FeeAccount before reads; guard with unique(schoolId,studentId).
  await tx.$queryRaw`SELECT school_id, student_id, ledger_revision
      FROM fee_accounts WHERE school_id=${schoolId}::uuid
      AND student_id=${studentId}::uuid FOR UPDATE`;
  const decision = await feesOwnProjection(tx, schoolId, studentId, asOfDate);
  // Mutate all affected charge/allocation/payment rows in ordered lock order.
  // Bind receipt/TC/admit-card issue and outbox to this guarded decision.
  // Increment ledgerRevision only after successful mutation; audit/outbox in tx.
}, { maxWait: reviewedMaxWait, timeout: reviewedTxTimeout });
```
**Important:** This is interface/pseudocode, **not code to paste verbatim**; resolve Prisma SQL field names, UUID/transaction typing and bounded request behavior before committing. Deadlock/serialization retry is bounded with metrics. For a multi-student exam batch, lock each account in its own short transaction, not all student accounts in one giant transaction.

**Safe release change isolation:** Migration introduces `FeeAccount` plus unique school/student, `FeeAdjustment` and `LegacyDueChargeMap` only as required, with same-school composite FK/index where available. Maintain `FeePayment.dueId` nullable for multi-charge and preserve old due rows/allocations. Any school whose legacy mappings are uncertain stays behind a feature flag until human-reconciled. For a truly posted financial event, rollback is safe roll-forward with corrective event, **not dropping new payment rows**.

## 2. Shared HTTP error and UI-state contract

- `401` expired/no login; `403` wrong permission; `404` foreign school/private record; `409` stale version, already issued, outstanding financial debt, conflicting payment idempotency; `422` invalid business date/amount/field; `503` transient worker/storage dependency. Do not expose internal code traces to client.
- REST method+body backward compatibility across old web modules; add route alias/adapter rather than change in place without migration. Contract Zod under `packages/validation`, DTO in `packages/contracts`.
- Web uses server-authoritative snapshot, loading/empty/preview/queued/failed/completed states, preserves edits after 422/409 and lets the user refresh; no success until write actually committed, no PDF-ready until file verified. All forms responsive, accessible, have clear disabled/permission and back behavior.
- Worker queue payload only `{jobId}`, actor/tenant validated at issue and retrieval, immutable encrypted snapshot, bounded retry, status and progress query with reauthorization.
- Audit immutable issue/payment events within transaction/outbox, log requestId/actor and status without student PII/payment credentials. Views may present safe labels but must not leak raw Aadhaar.

## 3. Task implementation DLDs — dependency ordered, no forward prerequisites

<a id="fix-01"></a>

### FIX-01 — Deny unauthorized writes and restrict report-viewer PII

**Priority:** P0 | **Predecessors:** None | **Original tasks:** TASK-001,002 | **Issues:** SEC-01/02/03/04

**Existing source to review:** common/security/capability.guard.ts; modules/transports/controllers/transports.controller.ts; modules/students/controllers/students.controller.ts; modules/operator-auth/operator-me.controller.ts; apps/web/src/components/shell.tsx

**Models, invariants and migration:** No new role needed. Preserve MANAGER and REPORT_VIEWER; define explicit method-level capability map for every operator route and private-file action. Viewer sees only approved safe report projections, not decrypted profile data or direct registration/transport details.

**API/service algorithm and protection:** Annotate every Transport POST/PUT/PATCH with @RequiresCapability('transports.write') alongside CsrfGuard. Change CapabilityGuard so no class-level '.read' permission authorizes state-changing HTTP verbs. Audit all controllers; use deny-by-default on missing explicit write capability. Separate students.report-summary from students.read-private-profile; deny profile/private fields for viewers unless owner explicitly approves a safe read projection.

**Web UI behavior:** Render only capability-authorized nav/actions; show Access Restricted for deep link rather than silent failure. Session invalidation on role downgrade and file/download reauthorization; retain existing manager actions.

**Must-execute FE/BE/NFR cases (use IDs `FIX-01-FE01`, `FIX-01-BE01`, `FIX-01-NFR01`):** REPORT_VIEWER with valid cookie+CSRF direct POST transport assign/reassign/end/create/reorder/status ->403 and no DB change; viewer direct Student GET private returns safe projection or 403; MANAGER same endpoints succeed. All-school B IDs 404. Finance composite school-FK strengthening is implemented in FIX-03, not silently within RBAC changes. Enumerate every controller method in a test table.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-02"></a>

### FIX-02 — Make fee reports and summary GETs pure read; batch projections

**Priority:** P0 | **Predecessors:** FIX-01 | **Original tasks:** TASK-002,013,019,026 | **Issues:** FIN-03/10/14

**Existing source to review:** modules/fees/application/query-pending-fees.service.ts; modules/fees/facade/fees-public.facade.ts; modules/fees/application/collect-payment.service.ts; modules/fees/controllers/fees.controller.ts; modules/fees/application/fee-exports.service.ts

**Models, invariants and migration:** FeeCharge/FeeDue writer remains command-side only; shared read-only FeeStatementProjection operates on already-assessed charges and flags UNASSESSED_LEGACY periods explicitly. Do not create/update Category, FeeDue, FeeCharge during a report, student profile GET, history or export.

**API/service algorithm and protection:** Move ensureDuesForApplicableMonths/assessChargesForStudent into an explicit idempotent MANAGER-only POST /operator/fees/assess (or existing /dues/generate); GET pending, GET student dues/summary and POST read-only export query projections only. Audit and contain other read-through writes, preserve old response shape using no-side-effect adapter. Batch school/student/period query with paging; no per-enrollment sequential assessment loop.

**Web UI behavior:** Pending report and student profile show 'Not yet assessed' when appropriate with manager-only 'Generate dues' explicit action and viewer read-only explanation; keep export controls. Never display unpaid=0 for unknown historic assessment.

**Must-execute FE/BE/NFR cases (use IDs `FIX-02-FE01`, `FIX-02-BE01`, `FIX-02-NFR01`):** Record fee/charge/payment/audit counts before/after GET+export under viewer and manager; zero mutation. 500/5000 students compare p50/p95 and SQL plan; no 10000 per-student writer calls. Existing pending report sums and export rows match.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-03"></a>

### FIX-03 — Serialize all fee writes and make payment retries safe

**Priority:** P0 | **Predecessors:** None | **Original tasks:** TASK-013,016,019 | **Issues:** FIN-01/07/08/13, SEC-04

**Existing source to review:** modules/fees/application/collect-payment.service.ts; modules/fees/application/generate-dues.service.ts; modules/fees/repository/fees.repository.ts; prisma/schema.prisma; packages/validation/src/fees/fee.schema.ts; apps/web/src/app/operator/fees/collect/ui.tsx

**Models, invariants and migration:** Add FeeAccount(studentId,schoolId,ledgerRevision) with composite unique and same-school FK where possible. Lock this single row on every fee assessment, adjustment, legacy bridge, collect, void and opening import; tx lock account first, then charges sorted UUID and receipt sequence. Also enforce charge/allocation same-school/student/payment integrity through application validation and reviewed composite FKs where models allow. Permit old overdue payment collection for INACTIVE students, but never open new future dues on them. Use Prisma.Decimal for ALL financial posting (integer paise or Decimal), never JS Number to compute stored sums.

**API/service algorithm and protection:** Canonically hash student, allocation charge IDs/amounts, mode, payment date, reference (server-normalized) and school. Check existing idempotency key+requestHash inside account lock: identical replay returns original receipt; conflicting payload 409. Create FeePayment with allocations, update FeeCharge and legacy FeeDue in one transaction. DB uniqueness sourceKey and allocations; ensure sum allocations==payment amount exactly. On serialization/conflict re-fetch under lock, bounded retry for deadlock.

**Web UI behavior:** Transport idempotency key through retryable payment attempt, not per click; if timeout fetch outcome by key and show existing receipt. Prevent all duplicate submissions while reconciliation pending.

**Must-execute FE/BE/NFR cases (use IDs `FIX-03-FE01`, `FIX-03-BE01`, `FIX-03-NFR01`):** Two clients each try paying ₹800 on ₹1000 balance; total successful <=₹1000 and no lost updates. 20/50 parallel same-key & distinct-key requests; different payload same key 409, exact replay returns same receipt, zero partial rows on rollback. Paise exact against original legacy records.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-04"></a>

### FIX-04 — Void multi-charge payments and preserve receipt history

**Priority:** P0 | **Predecessors:** FIX-03 | **Original tasks:** TASK-013,030 | **Issues:** FIN-02/09

**Existing source to review:** modules/fees/application/void-payment.service.ts; modules/fees/application/query-payments.service.ts; modules/fees/application/collect-payment.service.ts; apps/web/src/app/operator/fees/history/ui.tsx

**Models, invariants and migration:** VoidEvent/reversal marker persists on each FeePaymentAllocation (existing voidReversedAt) and FeePayment VOIDED; never remove original payment/receipt. No required FeeDue for multi-charge payment. All replayed voids idempotent under account/payment lock; original school business-day policy unchanged unless separately approved.

**API/service algorithm and protection:** Lock FeeAccount then payment+all allocation charge rows in consistent ordering. Check original payment business day + status. For each active allocation subtract amount from paidAmount, add to balance, update status/version, mark voidReversedAt; if mirrored legacy TUITION due, reverse exactly once. Update payment VOIDED with actor/reason/audit atomically; VOIDED replay returns original void outcome. Old dueId-only legacy pay/void retains adapter.

**Web UI behavior:** Show per-line reversed amounts and original receipt VOIDED, total outstanding refresh and exact reason, disable invalid void after business-day cutoff; differentiate network failure from success already committed.

**Must-execute FE/BE/NFR cases (use IDs `FIX-04-FE01`, `FIX-04-BE01`, `FIX-04-NFR01`):** Pay one receipt ₹650 across tuition/books/transport; void on same Kolkata day restores all three charge balances exactly; legacy-only payment still voids. Second void no extra reversal; race pay vs void yields one serialized outcome; old receipt number and printable snapshot unchanged.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-05"></a>

### FIX-05 — Enforce atomic fee clearance for existing TC and admit-card issuance

**Priority:** P0 | **Predecessors:** FIX-03, FIX-04 | **Original tasks:** TASK-032,035 | **Issues:** FIN-04/05

**Existing source to review:** modules/platform-admin/tc/tc.service.ts; modules/fees/facade/fees-public.facade.ts; modules/examination/application/admit-cards.service.ts; modules/fees/application/generate-dues.service.ts

**Models, invariants and migration:** FeeClearanceDecision(purpose, school/student, asOf/cutoff, covered sources, ledgerRevision, policyVersion) returned within locked fee account transaction. Must consider **both de-duplicated legacy and new charges**, including unassessed eligible periods per approved rule; never accept a stale preflight/preview as issuer authority.

**API/service algorithm and protection:** Provide typed FeesPublicFacade.withLockedClearance(tx, input) or transaction coordinator to lock FeeAccount, read single finance projection, enforce purpose policy and create issuer snapshot/job/audit in same guarded transaction. Old Platform Admin TC issue MUST call this path; later Operator TC delegates same issuer. Admit card bulk issues per-student lock/decision+issue, safe 409 for blocked, no job created. Existing completed certificates remain downloadable after new debts; no unreviewed override flag.

**Web UI behavior:** Preview is informational only and rechecked at confirm. When blocked show safe due breakdown and route to permitted fee collection; no misleading queued issue. Preserve old platform TC route and old snapshots.

**Must-execute FE/BE/NFR cases (use IDs `FIX-05-FE01`, `FIX-05-BE01`, `FIX-05-NFR01`):** 20 parallel charge creation/payment void/TC issue/admit-card issue, no issue committed with outstanding eligible dues; blocked produces no row/file/job. Future exam-month fees excluded only under approved cutoff; school B/role forbidden. Test fail-injected transaction and worker outbox retry.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-06"></a>

### FIX-06 — Reconcile ledger, implement adjustments and immutable finance history

**Priority:** P1 | **Predecessors:** FIX-03, FIX-04 | **Original tasks:** TASK-013,015,017,019,021 | **Issues:** FIN-06/08/09/12

**Existing source to review:** modules/students/application/update-student-profile.service.ts; modules/fees/application/generate-dues.service.ts; modules/fees/application/query-pending-fees.service.ts; modules/fees/repository/fees.repository.ts; prisma/schema.prisma

**Models, invariants and migration:** Introduce auditable FeeAdjustment(chargeId,schoolId,delta,kind/reason,effectiveDate,actor,idempotency,createdAt) and deterministic LegacyDueChargeMap if missing. One authoritative ChargeProjection, no double counting mirrored legacy FeeDue/TUITION. Historical snapshots and completed receipts immutable; optional Books/Uniform unset creates CANCEL/adjustment rather than deleteMany. Use Decimal-only totals.

**API/service algorithm and protection:** Use Fees facade command for selections and concessions; eliminate direct Students→FeeCharge deleteMany and Transport Prisma reach-through over time. Validate adjustment never makes net < paid unless approved credit account exists. Stream deterministic per-school shadow reconcile: original due+paid/void and allocated active amounts -> exact zero variance. Backfill never rewrites old payment rows.

**Web UI behavior:** Student profile Books/Uniform change shows charge impact preview with reason; paid charge change needs explicit adjustment/credit path, not silent disappearance. Due/receipt/history reports use same projection.

**Must-execute FE/BE/NFR cases (use IDs `FIX-06-FE01`, `FIX-06-BE01`, `FIX-06-NFR01`):** Toggle unpaid Books then re-enable: auditable cancellation and no duplicate active charge. Paid receipt unchanged on concession edit. Legacy payments/void and new allocations reconcile ₹0.00 across 24–60 months and School A/B. Test imported shadow mappings and restart.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-07"></a>

### FIX-07 — Correct effective-dated admission, class, transport and fee applicability

**Priority:** P1 | **Predecessors:** FIX-03, FIX-06 | **Original tasks:** TASK-014,016,017,018,022 | **Issues:** FIN-11/12/15

**Existing source to review:** modules/fees/application/generate-dues.service.ts; modules/students/application/admit-student.service.ts; modules/students/application/change-student-enrollment.service.ts; modules/transports/facade/transports-public.facade.ts; prisma/schema.prisma

**Models, invariants and migration:** FeeEligibilityPolicy: school-local date month basis, mid-month/admission cutoff, class-change effective rate, exit cutoff, transport assignment validFrom/validUntil. Snapshot rule version and source event on original charge. Must not infer historical unverified months as currently owed, and no automatic pre-onboarding backbill.

**API/service algorithm and protection:** At assessment use StudentsPublicFacade.getEnrollmentAtDate and TransportPublicFacade.assignmentAtDate, no latest ACTIVE fallback for historical period. Rule precedence class+session, class, session, school as approved. Reject admission to DRAFT/CLOSING/CLOSED year server-side (ACTIVE-only). One-time charge key includes admissionEvent. Idempotent charge source key under fee account lock; old paid lines stay unchanged when class changes. A disabled school FeeCategory (including TUITION) must NOT be automatically re-enabled by assessment; return configured/unconfigured state to manager instead.

**Web UI behavior:** Admission only offers ACTIVE school year, prevents submitting DRAFT; class change shows effective date and fee impact preview; transport assignment start/end and periods clearly indicated.

**Must-execute FE/BE/NFR cases (use IDs `FIX-07-FE01`, `FIX-07-BE01`, `FIX-07-NFR01`):** Admit Aug, no April-July fees; class 2→3 Oct 15, correct rate under signed rule, transport ends Nov 15 so no December charge, 2027 closure doesn't create future fees. 500/5k batch p95 and same-school role/tenant tests.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-08"></a>

### FIX-08 — Complete student exit, pass-out and re-admission lifecycle

**Priority:** P1 | **Predecessors:** FIX-07 | **Original tasks:** TASK-022,023 | **Issues:** ACAD-02

**Existing source to review:** modules/students/application/change-student-status.service.ts; modules/students/application/change-student-enrollment.service.ts; modules/transports/application/end-transport.service.ts; modules/fees/facade/fees-public.facade.ts; apps/web/src/app/operator/students/[id]/ui.tsx

**Models, invariants and migration:** StudentLifecycleEvent(EXIT|PASS_OUT|RETURN, effectiveDate, source/target enrollment ID, reason, progress, actor, idempotency). Student UUID remains stable. Durable per-school/student saga/state journal for ending transport and future fee accrual without losing past dues; TC not auto-issued on exit unless policy signed.

**API/service algorithm and protection:** POST exit preview and command; step idempotent under student/version lock, effective-dated enrollment closure + transport end + fee future assessment stop via public facades; recovery of partial success. Return command creates new session enrollment on old Student UUID with no duplicate one-time fee unless policy. Preserve existing status endpoint via adapter.

**Web UI behavior:** Profile wizard Leave/Pass-out/Transfer > effective date/reason > impact review > confirm > progress; Re-admit action for eligible inactive record with current class/section/year and old history. Viewer read-only.

**Must-execute FE/BE/NFR cases (use IDs `FIX-08-FE01`, `FIX-08-BE01`, `FIX-08-NFR01`):** Failure after transport ends before student state update resumes to consistent final state. Re-admission same UUID, no duplicate person/payment; prior year TC/fees accessible; cross-school and concurrent returns 409/404. Verify old basic ACTIVE/INACTIVE functionality.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-09"></a>

### FIX-09 — Prepare and finalize safe academic-year promotion and closure

**Priority:** P1 | **Predecessors:** FIX-08 | **Original tasks:** TASK-008,009,024,025 | **Issues:** ACAD-01/03

**Existing source to review:** modules/platform-admin/academics/academic-sessions.service.ts; modules/students/application/change-student-enrollment.service.ts; apps/web/src/features/academics/components/academic-sessions-view.tsx; prisma/schema.prisma

**Models, invariants and migration:** TransitionBatch(source ACTIVE,target DRAFT,status PREPARING|PREPARED|CLOSING|COMPLETED|FAILED,version) + TransitionItem(student,sourceVersion,targetClass/section,decision,step,status) unique source/target/student. One ACTIVE/CLOSING session per school DB constraint. Audit old source immutable; retain all original-year debts.

**API/service algorithm and protection:** Separate preview/stage/confirm/resume endpoints. Stage decisions PROMOTE|REPEAT|PASS_OUT|LEAVE without modifying current ACTIVE enrollment. Confirm locks school transition coordinator, sets CLOSING, finalizes bounded idempotent chunks with durable journal and blocks ordinary class/fee writes during transition; publish target ACTIVE and old CLOSED in ONE final short transaction after reconciliation. Failed student keeps switch blocked. Existing POST /close must not circumvent safe reviewed transition.

**Web UI behavior:** Academic Sessions shows Prepare Year-End wizard, candidate table, conflict resolution, reviewed counts and explicit 'Finalize' after readiness; no dangerous single-click Close without staged transition. Expose real progress/failed rows and recovery.

**Must-execute FE/BE/NFR cases (use IDs `FIX-09-FE01`, `FIX-09-BE01`, `FIX-09-NFR01`):** 500/5000 students including repeats/pass-outs, kill after chunk 17/20 and resume exactly once; no two ACTIVE years, no duplicate new-year fees and no temporary half-promoted display. Existing year creation/activation stays operational.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-10"></a>

### FIX-10 — Make year-history reports, filters and exports consistent

**Priority:** P1 | **Predecessors:** FIX-06, FIX-09 | **Original tasks:** TASK-010,021,026 | **Issues:** ACAD-03/WEB-05

**Existing source to review:** modules/operator-dashboard/application/dashboard.service.ts; modules/fees/application/query-pending-fees.service.ts; modules/fees/application/fee-exports.service.ts; modules/students/application/search-students.service.ts; apps/web/src/app/operator/fees/pending/ui.tsx

**Models, invariants and migration:** HistoricalReportContext(schoolId,academicSessionId,asOfMode=AT_CLOSE|TODAY, effectiveDate, role) on every query/export. An old fee debt retains origin session even when collected in new session. No guessing historic enrollment from current class.

**API/service algorithm and protection:** Extend relevant typed query/export filters to validate year+school. Use read-only projections, all report aggregates align with original charges/payments. Explicit AT_CLOSE snapshot vs TODAY remaining; report-viewer only approved PII-safe fields. Stream exports, include year/as-of labels and immutable download authorization.

**Web UI behavior:** Year selector consistent across student directory/profile/dashboard/pending/fee history; URL/deep-link preserves selected year, switching invalidates stale in-flight requests/caches. Print and XLSX display year and monetary basis.

**Must-execute FE/BE/NFR cases (use IDs `FIX-10-FE01`, `FIX-10-BE01`, `FIX-10-NFR01`):** Student changes class across years, old year report still shows old class; debt origin and collection date distinct, no double charge. Concurrent filter changes cannot show wrong school's year. Export amount equals screen/DB.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-11"></a>

### FIX-11 — Implement provenance-safe historical opening balance import

**Priority:** P1 | **Predecessors:** FIX-06 | **Original tasks:** TASK-020 | **Issues:** FIN-12

**Existing source to review:** modules/fees/facade/fees-public.facade.ts; modules/students/application/student-import.service.ts; apps/web/src/app/operator/students/import/ui.tsx; prisma/schema.prisma

**Models, invariants and migration:** OpeningBalanceBatch(school,asOf,sourceFilename/checksum,status,counts,reviewer,requestKey) + rows(student/source match,prior period,amount,type ORIGINAL_DUE|EXTERNAL_PAID|CREDIT,validation). External payments are NOT new FeePayments/receipts; immutable provenance link.

**API/service algorithm and protection:** Upload via private file, validate XLSX/CSV in bounded chunks (formula protection, 5k rows), preview all row errors, compare previous balances by student, explicit sign-off; enqueue durable import job and idempotent Fees account posts with sourceKey; status/progress/error download. Unknown student match requires human resolution.

**Web UI behavior:** One wizard Upload > Match > Preview Totals > Confirm > Progress > Download Errors; reentrant status page after refresh. No ambiguous 'fully imported' when errors remain.

**Must-execute FE/BE/NFR cases (use IDs `FIX-11-FE01`, `FIX-11-BE01`, `FIX-11-NFR01`):** 300/5000 rows with duplicates, wrong-school IDs and external receipts; rerun same checksum zero extra obligations; kill worker halfway then resume; reconciliation ₹0 and no new receipt for old external payment.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-12"></a>

### FIX-12 — Implement configurable receipt and student numbering

**Priority:** P1 | **Predecessors:** FIX-03 | **Original tasks:** TASK-027 | **Issues:** DOC-02

**Existing source to review:** modules/fees/domain/receipt-number-allocator.ts; modules/students/domain/student-identifier-allocator.ts; prisma/schema.prisma; apps/web/src/app/admin/(protected)/schools/[schoolId]/ui.tsx

**Models, invariants and migration:** SchoolNumberPolicy(school,type RECEIPT|STUDENT,series CONTINUOUS|ACADEMIC_YEAR|FINANCIAL_YEAR,prefix/width,version,effectiveFrom) and SchoolSequence(school,type,seriesKey,nextNo) with school-wide formatted-number uniqueness. Preserve all old printed numbers.

**API/service algorithm and protection:** Atomic allocate within payment/admission transaction; prevalidate any reset prefix collision across old+new series; after migration legacy counter continues. Fiscal year Asia/Kolkata Apr→Mar; academic year uses validated active session (not current calendar string).

**Web UI behavior:** Admin configure and preview example numbers across year boundary, warning on old series, disable retroactive edits. School manager reads selected series but never changes past receipts.

**Must-execute FE/BE/NFR cases (use IDs `FIX-12-FE01`, `FIX-12-BE01`, `FIX-12-NFR01`):** 100 parallel admissions/receipts around Mar 31–Apr 1, no duplicate formatted value. Idempotent retry doesn't consume another receipt for same payment. Old numbers unchanged.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-13"></a>

### FIX-13 — Issue immutable two-copy receipt with history PDF

**Priority:** P1 | **Predecessors:** FIX-04, FIX-06 | **Original tasks:** TASK-030,031 | **Issues:** DOC-01/WEB-05

**Existing source to review:** modules/fees/application/collect-payment.service.ts; modules/fees/controllers/fees.controller.ts; apps/web/src/app/operator/fees/collect/ui.tsx; apps/web/src/app/operator/fees/history/ui.tsx; apps/worker/src/main.ts

**Models, invariants and migration:** ReceiptSnapshot on successful payment includes frozen school/year/student/class, collectorName, receiptNo, category allocations, pay date, mode and totals; templateVersion. Render source snapshot for HTML print, Office Copy+Student Copy and PDF; old legacy receipt adapter supported, VOIDED overlay without overwriting originals.

**API/service algorithm and protection:** GET /operator/fees/payments/:id/receipt.pdf (authenticated school/role/no-store) or secured private worker output based on immutable snapshot. Do not create second receiptNo when generating PDF. PDF download and print share one itemized DTO; A4 page breaks, Unicode ₹, long names and 25 lines.

**Web UI behavior:** History adds Download PDF alongside View/Print, disable inaccessible action, show render status and retry if queued. Two copies unmistakably labeled; modal back/close no lost list filters.

**Must-execute FE/BE/NFR cases (use IDs `FIX-13-FE01`, `FIX-13-BE01`, `FIX-13-NFR01`):** ₹650 split tuition/books/transport, exact 2 copies same receipt ID and totals; old receipt and voided receipt render; signed links unauthorized after downgrade; 50 concurrent PDF jobs within measured memory/time.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-14"></a>

### FIX-14 — Complete versioned TC and secure operator issuance

**Priority:** P1 | **Predecessors:** FIX-05 | **Original tasks:** TASK-028,029,033 | **Issues:** DOC-01

**Existing source to review:** modules/platform-admin/tc/tc.service.ts; modules/platform-admin/tc/tc.controller.ts; modules/platform-admin/students-port/students.port.ts; apps/worker/src/tc-pdf-builder.ts; apps/web/src/app/admin/(protected)/schools/[schoolId]/transfer-certificate/ui.tsx

**Models, invariants and migration:** TC v2 frozen school official identifiers, class+section as-of issue/exit date, template version and branding SHA; old TC v1 bytes/snapshot remain unchanged. Operator issuing authority manager only and school derived from session; shared TC issue service from FIX-05.

**API/service algorithm and protection:** Add operator TC list/preview/issue/job-status/download/retry protected endpoints delegating existing TcService, NOT new duplicated TC model. Check clearance under lock; issue+job+audit outbox transaction; auth at signed retrieval. Renderer dispatch v1 vs v2 and audit actor.

**Web UI behavior:** Student Profile > TC Preview > outstanding fee readiness > issue > QUEUED/PROCESSING/FAILED/COMPLETED > secure Download. Existing Platform Admin TC screen unchanged. Warn absent principal/signature/logo.

**Must-execute FE/BE/NFR cases (use IDs `FIX-14-FE01`, `FIX-14-BE01`, `FIX-14-NFR01`):** Manager own school pass, viewer 403, School B ID 404, outstanding ₹1 blocks without job. Old v1 SHA unchanged and new v2 contains leading-zero UDISE/class. Failed render retries same snapshot.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-15"></a>

### FIX-15 — Make exam/admit-card clearance and bulk issue scalable

**Priority:** P1 | **Predecessors:** FIX-05 | **Original tasks:** TASK-034,035 | **Issues:** EXAM-01/02

**Existing source to review:** modules/examination/application/exam-contexts.service.ts; modules/examination/application/admit-cards.service.ts; modules/examination/controllers/operator-admit-cards.controller.ts; apps/worker/src/main.ts

**Models, invariants and migration:** Exam Context remains existing. BulkIssueJob per exam/school with snapshot of eligible students/cutoff and per-student progress/journal, clear queued/ready/failed states, limited batch concurrency and exact issue-per-student uniqueness. CR scope gate remains; don't expand exam grading.

**API/service algorithm and protection:** Replace unbounded Promise.all with chunked batch clearance projection or bounded worker concurrency and SQL indexes. Each issuance performs locked fee decision (FIX-05), opaque idempotent requestKey and job creation; no preflight-only authorization. Two simultaneous bulk calls dedupe student card; worker retries same frozen snapshot. Avoid loading/retaining all PDFs in API memory.

**Web UI behavior:** Expose bulk status/progress, accurate issued/queued/blocked/failed counts and refresh; secure PDF download only when COMPLETED. Don't show future-month fees as unpaid when outside approved exam cutoff.

**Must-execute FE/BE/NFR cases (use IDs `FIX-15-FE01`, `FIX-15-BE01`, `FIX-15-NFR01`):** 500–5000 candidates, 20 simultaneous fee writes and issue calls, worker crash after 17, bounded DB connections/p95, old already-issued cards no duplicate, same-school file auth and private PII.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-16"></a>

### FIX-16 — Correct school, academic-year and student web journeys

**Priority:** P1 | **Predecessors:** FIX-07, FIX-08, FIX-09 | **Original tasks:** TASK-003..011,022..025 | **Issues:** WEB-01/04/ACAD-01/02

**Existing source to review:** apps/web/src/app/operator/students/new/ui.tsx; apps/web/src/app/operator/students/[id]/ui.tsx; apps/web/src/app/operator/students/ui.tsx; apps/web/src/features/academics/components/academic-sessions-view.tsx; apps/web/src/app/admin/(protected)/schools/[schoolId]/ui.tsx

**Models, invariants and migration:** UI state is server authoritative and tenant/year scoped. Break StudentProfile 5k-line component into bounded sections ONLY as needed while preserving every old action. No DRAFT enrollments or direct Close bypass.

**API/service algorithm and protection:** Web invokes validated APIs from FIX-07..09; uses server ACTIVE academic session, session-version conflict reload, creation status and year transition workflow. Async requests cancellation/generation token prevents stale directory/profile response. Old links retained.

**Web UI behavior:** Admission ACTIVE-only selector with clear setup guidance; profile effective-date history, exit/re-admit flows, school readiness, promotion wizard and year switch; 360/768/1366, accessible labels/tap targets and focus/empty/error states.

**Must-execute FE/BE/NFR cases (use IDs `FIX-16-FE01`, `FIX-16-BE01`, `FIX-16-NFR01`):** Draft admission blocked client+server, existing student history unchanged, back/forward/year switch no stale data, school readiness/go-live works, all original student profile edit/status/photo/fees/transport/print actions pass.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-17"></a>

### FIX-17 — Correct fee setup, payment, report and receipt web flows

**Priority:** P1 | **Predecessors:** FIX-02, FIX-03, FIX-04, FIX-06, FIX-13 | **Original tasks:** TASK-012..021,030..031 | **Issues:** WEB-02/04/05/07/FIN-03

**Existing source to review:** apps/web/src/app/operator/fees/collect/ui.tsx; apps/web/src/app/operator/fees/history/ui.tsx; apps/web/src/app/operator/fees/pending/ui.tsx; apps/web/src/app/operator/fees/setup/ui.tsx; apps/web/src/features/fees/api/fees-api-client.ts

**Models, invariants and migration:** Persist idempotencyKey for a pending payment attempt until confirmed/reconciled, including timeout/reload; new attempt only after previous known outcome or payload changed. Render exact Decimal/paise value from server; no optimistic fake 'paid' state.

**API/service algorithm and protection:** Use read-only GET projection, explicit assessment command. API client typed DTO/errors; cancellation and stale response suppression. Handle 409 balance changed by refetch+show delta, timeout by lookup existing idempotent payment. Same statement data source for collection, pending and history and receipts.

**Web UI behavior:** Fee setup category/rule/date previews, collection multi-charge partial and arrears, duplicate prevention, one click retry, history search/pagination, void status (same day) and download PDF, viewer reports-only. No silent 'no dues' on error.

**Must-execute FE/BE/NFR cases (use IDs `FIX-17-FE01`, `FIX-17-BE01`, `FIX-17-NFR01`):** Simulate network response lost after payment committed: retry returns single receipt, no double charge. 2 students, 3 categories, 2 months, void restores totals; filters stable after modal. Mobile/tablet/desktop and A4 print.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-18"></a>

### FIX-18 — Correct web report-viewer, transport and student-import flows

**Priority:** P1 | **Predecessors:** FIX-01, FIX-02, FIX-10 | **Original tasks:** TASK-001,002,004,018,026 | **Issues:** WEB-04/06/SEC-01/02

**Existing source to review:** apps/web/src/components/shell.tsx; apps/web/src/app/operator/transports/ui.tsx; apps/web/src/app/operator/transports/assignments/ui.tsx; apps/web/src/app/operator/students/import/ui.tsx; apps/web/src/app/operator/ui.tsx

**Models, invariants and migration:** Role and current school are derived from current session capabilities; never authorize based on frontend hide alone. File downloads use authenticated request/blob or properly scoped same-origin proxy with content/error validation.

**API/service algorithm and protection:** Integrate GET allowed reports/tenant scope, enforce role on all transport actions. Import errors download must preserve session and proper Content-Disposition, 401/403/404 handling, not blindly link to API_BASE. Keep existing import template/backward compatibility.

**Web UI behavior:** Viewer sees clear report-only navigation with no hidden mutation path; Transport route/assignment filters, direct link to report exports; Import staged status/progress with error workbook and retry; no stale School A private data after logout or role switch.

**Must-execute FE/BE/NFR cases (use IDs `FIX-18-FE01`, `FIX-18-BE01`, `FIX-18-NFR01`):** Viewer direct transport POST 403 and UI controls absent, manager works; imported mixed 500/5k rows with actual browser file download across deployed host; School A→B scope/cached data no leak; 360/768/1366.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-19"></a>

### FIX-19 — Correct exam and document web statuses and recovery UX

**Priority:** P1 | **Predecessors:** FIX-14, FIX-15 | **Original tasks:** TASK-029..035 | **Issues:** WEB-03/04/EXAM-02/DOC-01

**Existing source to review:** apps/web/src/app/operator/exams/[id]/admit-cards/ui.tsx; apps/web/src/app/operator/exams/ui.tsx; apps/web/src/features/examination/api/examination-api-client.ts; apps/web/src/app/admin/(protected)/schools/[schoolId]/transfer-certificate/ui.tsx

**Models, invariants and migration:** Issue response status QUEUED/PROCESSING is not 'PDF ready'. Job status fetched by idempotent poll (bounded/backoff) or refresh; COMPLETED only after file stored. Card/TC page and candidate fee preview must use same server-authoritative clearance status.

**API/service algorithm and protection:** Web API client distinguishes issue accepted, already issued, queued, failed, completed; signed-file URL refresh/check; use server returned API URL, not guessed fallback to unrelated path. Avoid repeated bulk issue for QUEUED/PROCESSING.

**Web UI behavior:** Accurate per-student counts, failed retry, progress/failure rows, blocked dues and secure PDF. Manager vs viewer copy differs ('View Admit Cards' not 'Issue' for viewer). TC and receipt download statuses consistent.

**Must-execute FE/BE/NFR cases (use IDs `FIX-19-FE01`, `FIX-19-BE01`, `FIX-19-NFR01`):** Force queued 10s then completed; UI never says ready prematurely; simulate worker failure, retry and page reload; direct PDF 404/401 after expired role; duplicate bulk click no extra issue; 5k candidates responsive with paging.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-20"></a>

### FIX-20 — Harden migrations, async workers, caching, memory and observability

**Priority:** P1 | **Predecessors:** FIX-02, FIX-03, FIX-06, FIX-09, FIX-15 | **Original tasks:** TASK-007..035 NFR | **Issues:** OPS-01/02/03/EXAM-01/FIN-10

**Existing source to review:** prisma/migrations/0008..0014; scripts/deploy-migrations.mjs; apps/worker/src/main.ts; modules/operator-dashboard/infrastructure/dashboard-cache.service.ts; apps/api/src/platform/jobs/job.service.ts; apps/web/package.json

**Models, invariants and migration:** Keep historic migration checksums unchanged; add new migrations only. Bounded queue concurrency, job lease/retry/recovery, per-tenant/year/role cache invalidation, structured metrics without sensitive PII, DB transaction timeout and index analysis.

**API/service algorithm and protection:** Rehearse on sanitized production-like clone including existing wrong-type 0008 recoverability; compare migration ledger, pre/post rows, no reset, backup+restore rehearsal. Add real database integration, browser tests and worker crash tests separate from static QA. Instrument p50/p95, SQL scans, DB pool use and queue depth.

**Web UI behavior:** Ensure pages recover from 429/503/timeout, old+new routes behave after rolling deployment, no missing assets/cache-role leaks; measure web render/hydration and responsive performance.

**Must-execute FE/BE/NFR cases (use IDs `FIX-20-FE01`, `FIX-20-BE01`, `FIX-20-NFR01`):** 10–12 schools ×300–500; stress 5k ×60 months, 5k import/promotion, 20–50 concurrent payments/doc checks, 100 doc queue. p95 compared against approved SLO and baseline, memory bounded; SQL EXPLAIN and security checks captured.

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

<a id="fix-21"></a>

### FIX-21 — Execute integrated FE/BE/NFR regression and release signoff

**Priority:** P1 | **Predecessors:** FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09, FIX-10, FIX-11, FIX-12, FIX-13, FIX-14, FIX-15, FIX-16, FIX-17, FIX-18, FIX-19, FIX-20 | **Original tasks:** TASK-001..035 | **Issues:** ALL

**Existing source to review:** docs/school-erp-development-plan/REGRESSION-BASELINE.md; TESTING-AND-RELEASE.md; tasks/TASK-001..035.md; corrective tracker

**Models, invariants and migration:** This is an execution gate, not a license to defer basic task tests: each earlier task must have its own FE/BE/NFR regression passes. Record observed results only; no static QA-only signoff.

**API/service algorithm and protection:** Run all 35 requirement flows with two-school DB fixtures, isolated Redis/storage, API session/CSRF/BOLA tests and old data migration. Reconcile per-school/month/receipt/TC exactly and performance benchmark reproducibly.

**Web UI behavior:** Run actual browser tests at 360/768/1366 for every affected screen, registration, fees, transport, academic rollover, reports, exam and downloads; verify real keyboard/A4/Arabic ₹ glyph where appropriate.

**Must-execute FE/BE/NFR cases (use IDs `FIX-21-FE01`, `FIX-21-BE01`, `FIX-21-NFR01`):** Zero P0, zero unexpected old functionality regressions, signed review of accepted P1 exceptions only, all required policy/paid CR approvals recorded; original 35-task tracker reconciled and correction branch PR ready for review (no automatic merge).

**Definition of done:** Added/updated real source and typed contracts; reviewed additive migration if applicable; focused FE browser test at mobile/tablet/desktop, real DB/API and security-negative cases, measured applicable NFR, impacted BASE-XX old journeys, reviewer evidence/PR recorded in the single corrective tracker. No later FIX ID may be required for the task's own acceptance; where an old consumer cannot yet use new behavior, keep it on a compatible adapter/flag.

## 4. Coverage and test route matrix (mandatory review, not a claim that no further issues exist)

| Module | Web screens | Backend entry points | Existing tests / negative checks |
|---|---|---|---|
| Public + auth + school | `/`, admin login/dashboard/schools/new/[schoolId]/operators/academics; operator login/reset | platform/auth, schools, operators, academic-sessions-platform & -operator, operator-auth | school bootstrap, principal/logo/UDISE, password/session/CSRF, role downgrade, legacy ACTIVE school, mis-scoped school |
| Student | directory/new/[id]/import/admission-form | students controller, import controller, Students services | blank Aadhaar, school code, code rename, past class, archived year, exit/readmit, 500/5000 rows, viewer PII deny |
| Fees | setup, pending, collect, history | fees controller, generation/rules/pending/collect/void/exports | due on DATE eligibility, read-only GET, old FeeDue/Charge one projection, 20 pay/void races, concession/book/uniform adjustment, receipt/PDF |
| Transport | route/stoppage, assignments, counts | transports controller and domain services | every write method authorization, reassign/end effective date, cross-school stoppage, legacy student transport selection, viewer UI |
| Dashboard/reports | operator home, widget cards, report filters/export | dashboard controller/facades, pending/export services | cache school/role/year isolation, number reconciles, no side effect, paging, 5k query plan |
| Year lifecycle | admin/operator academics, student year selector, transition wizard | AcademicSessionsService, enrollment history, transition/exit commands | single ACTIVE year, stage not mutate, killed worker resume, old-year dues at close, no ambiguous forced backfill |
| TC | admin TC, new operator TC | tc.controller/TcService, worker TC renderer | both issuers same fee lock, v1 SHA preserved, v2 data, private file and worker retry |
| Exam/admit | exams list/new/edit/admit-cards | exam contexts/admit cards controller & worker | paid CR, fee cutoff, blocked/no issued, 5k bounded list/bulk, queued vs ready, signer and private download |
| Infrastructure | all affected layouts, mobile/tablet/desktop | migrations/recovery, SessionService, Jobs/Files, worker | staging migration, backup restore, p50/p95, 100 jobs, PII, URL TTL, browser integration and A4 |

**All 35 original requirements** remain the acceptance inventory. For original `TASK-001..035`, trace evidence through the corrective refs in each FIX task and rerun applicable `docs/school-erp-development-plan/REGRESSION-BASELINE.md`. Missing runtime evidence is marked NOT_TESTED, not PASS. During source implementation, any newly discovered bug enters the matching corrective task's defect log or becomes a new reviewed row only if truly separate architecture work.

## 5. Cross-task integration, safety gates and developer handoff

1. Start with **P0 tasks FIX-01..05**; independent FIX-01 and FIX-03 can proceed in parallel; FIX-02 requires FIX-01, FIX-04 requires FIX-03, FIX-05 requires FIX-03/04. Review exact payment lock/clearance interfaces before implementation. Do not expose new issue/download endpoints until server guard passes.
2. Then deliver original business scope completeness FIX-06..15 in dependency order. If a policy remains unsigned, mark only that FIX task BLOCKED and work on independent tasks. Never implement extra paid exam scope silently.
3. Implement web corrections FIX-16..19 when their corresponding safe APIs exist. For every touched UI verify old user journey and new browser behavior. FIX-20 executes real migration, worker/performance hardening and FIX-21 integrated release gate.
4. Small early commits; update one corrective tracker row each checkpoint with issue IDs, touched web/API/DB files, test IDs and actual PASS/FAIL plus screenshot/log links, reviewer and merge SHA. **No DONE based on code present in main**.
5. No background work is represented by these documents. Actual development and local FE/BE/NFR testing follow in task branches. No automatic merge to stable main; require authorized approval.

**Structural QA:** this document deliberately includes a complete first-pass static review but cannot establish an exhaustive runtime bug count without executing the matrix. The developer must perform runtime discovery across ALL route families rather than presume all remaining defects already catalogued.
