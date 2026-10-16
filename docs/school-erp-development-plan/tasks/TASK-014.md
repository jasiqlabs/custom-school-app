# TASK-014 — Fee applicability by admission, class change and exit dates

**Engineering owner:** Fees / Students. **Only technical predecessors:** TASK-009, TASK-013 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Make charge eligibility derive from effective-dated enrollment and admission date. Define monthly charge start/end and mid-month class-change pricing via approved per-school policy and data snapshots.

**Explicitly out of this task:** Do not depend on the future user-facing exit workflow (TASK-022): the eligibility engine must already honor an ended/inactive enrollment and its effective end date, exposing a public stop-accrual command that TASK-022 will consume.

**Operator/user story:** As a school manager, I charge a child only for school attendance/service-eligible months, including mid-year admission, intra-year class change and leaving.

**Use cases with success/error expectations:** UC1: admitted August: fees for August onward under confirmed charging convention, not April–July. UC2: leaves in November: December tuition/transport not generated, but October unpaid remains. UC3: changes Class 2 to Class 3 mid-October: October charged according to approved boundary rule, November at new class rate. UC4: late backdated changes require preview adjustments, not silently recalculating receipts.

**Domain rules and acceptance:** Make charge eligibility derive from effective-dated enrollment and admission date. Define monthly charge start/end and mid-month class-change pricing via approved per-school policy and data snapshots.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** Enrollment with validFrom/validTo DATE and reason. FeeEligibilityPolicy(schoolId,policyVersion,startConvention,endConvention,changeConvention,prorationRule?) with approved enum values; FeeCharge records ruleVersion, classSnapshot, enrolledPeriod, category, originSession and dueDate. For mid-year class change use an enrollment segment per effective change.

**Typed endpoints and cross-domain facade contracts:** GET /operator/students/:id/fees/eligibility-preview?from&to; manager POST /operator/students/:id/enrollments/change-class {effectiveDate,newClassId,newSectionId,expectedVersion}; charge generator consumes StudentEnrollmentEligibilityPort by bounded period batches; updates display estimated old/new month impact.

**Detailed service orchestration, server algorithm and frontend states:** Admission writes start eligibility; class-change workflow validates effective date against session and prevents overlapping enrollment segments; fee generator requests eligible class-at-period from Students public port, selects corresponding FeeRule, charges idempotent sourceKey. Exit workflow publishes stop-effective event. Backdated corrections use diff preview and FeeAdjustment, not delete.

**Recovery, idempotency, edge/race cases:** Transport fee may need different start/stop policy than tuition; one-time admission and registration do not repeat monthly; opening-balance items are pre-existing obligations. No assumption that August admission owes earlier months even when fee config effective April.

## 3. Specific FE, BE and NFR tests

**FE:** TC-CL02-FE01 admit Aug shows months Aug+ only; FE02 exit Nov preview tells future fee stop; FE03 class change Oct shows policy; FE04 date validation and double submit; FE05 wrong session/closed-year warning.

**BE/DB/API/security:** TC-CL02-BE01 all 12 calendar boundaries, leap February, March-April session boundaries; BE02 class effective segment join; BE03 no charges pre-admission/post-exit; BE04 retries no duplicates; BE05 changing already paid month creates adjustment only.

**NFR/operations:** TC-CL02-NFR01 5k students x 24 months batch efficiently with batched port; NFR02 deterministic timezone/rounding; NFR03 charge-reconciliation complete; NFR04 query explain and outbox restart recovery.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
