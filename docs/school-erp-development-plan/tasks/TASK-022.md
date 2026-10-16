# TASK-022 — Leaving, pass-out and effective service termination

**Engineering owner:** Students / Transport / Fees. **Only technical predecessors:** TASK-009, TASK-014, TASK-021 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Provide explicit LEAVE/TRANSFER/PASS_OUT workflow with effective date, end current enrollment, stop new fees and transport via owned public commands, retaining historical debt and issued TC records.

**Explicitly out of this task:** Do not depend on future operator TC issuing TASK-033. Existing platform-admin TC stays independent; 'exit automatically on TC' must remain disabled unless the client explicitly approves it; later TC operator UI can integrate via the published Exit facade.

**Operator/user story:** As a school manager, I record when a student leaves or passes out, with an effective date, so current roster and future service charges stop while historical dues and documents remain intact.

**Use cases with success/error expectations:** UC1: student leaves with TC after fees clear; recorded leaving effective 2027-02-15, no March recurring tuition or transport. UC2: student leaves without TC, exit recorded with reason. UC3: student passes out, last enrollment closes and no new charge. UC4: TC issued for historic context without automatic exit unless approved. UC5: interrupted fee-stop step retries safely.

**Domain rules and acceptance:** Provide explicit LEAVE/TRANSFER/PASS_OUT workflow with effective date, end current enrollment, stop new fees and transport via owned public commands, retaining historical debt and issued TC records.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** Add StudentExitEvent(id,schoolId,studentId,sessionId,effectiveDate,reason,exitType LEFT|TRANSFERRED|PASSED_OUT,tcId?,state PENDING|APPLIED|FAILED,createdBy,version) and durable workflow state/outbox; record StudentEnrollment.endedReason,endedAt effective; transport's serviceEndDate updated by its owner; fee accrual stop policy stored as domain eligibility event, no direct fee table update by Students.

**Typed endpoints and cross-domain facade contracts:** POST /operator/students/:id/exit/preview {effectiveDate,reason,type,issueTc?:boolean}; POST /operator/students/:id/exit {reviewToken,idempotencyKey}; GET /operator/students/:id/exit-history. Optional 'Issue TC' invokes DC-01/02 via document facade only after clearance and policy; returns 409 when blocked.

**Detailed service orchestration, server algorithm and frontend states:** Explicit coordinator owned by student lifecycle (not TC controller) requests preview from transport and fees facades, validates session and clearance policy, persists ExitWorkflow, calls individually idempotent domain commands via outbox; finalize student only after future billing/transport closure acknowledged; errors visible as retryable, no cross-module repo writes. UI guided review shows stopping future services and retaining unpaid balances.

**Recovery, idempotency, edge/race cases:** Partial month if student leaves mid-month unresolved (CL-02). TC issued to alumnus does not imply an unapproved status transition. Older existing TC unaffected. Avoid deadlocks via stable per-student lock order and outbox if multi-service commit can't be atomic.

## 3. Specific FE, BE and NFR tests

**FE:** TC-CL01-FE01 leave-without-TC, leave-with-TC, pass-out previews; FE02 unpaid TC rejected yet allowed exit without TC if approved; FE03 exit history and reversals visible; FE04 failure repair CTA; FE05 stopped transport banner.

**BE/DB/API/security:** TC-CL01-BE01 overlapping exits idempotent; BE02 TC clearance cannot be bypassed; BE03 no fee generated after effective stop; BE04 already assessed arrears preserved; BE05 transport end effective; BE06 404 foreign-school student; BE07 same student return uses CL-04.

**NFR/operations:** TC-CL01-NFR01 kill worker at each outbox step and recover; NFR02 auditor trail without PII; NFR03 no long cross-domain DB transaction; NFR04 replays zero extra charged months and stale cache invalidation.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
