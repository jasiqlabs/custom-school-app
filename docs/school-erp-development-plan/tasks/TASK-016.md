# TASK-016 — One-time registration and admission charges

**Engineering owner:** Fees / Admission. **Only technical predecessors:** TASK-013 (all lower numbers). **Single execution status:** [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Post configured one-time registration and admission obligations exactly once during the existing admission workflow and student import, with school-approved re-admission scope.

**Explicitly out of this task:** Do not rely on books/uniform checkbox feature TASK-017 or historic opening balances TASK-020; both are optional later uses of the same fee public port.

**Operator/user story:** When school registers a pupil, it records configured one-time registration/admission charges exactly once for the approved policy scope.

**Use cases with success/error expectations:** UC1: new admission includes registration ₹400 and admission ₹500 on student's statement. UC2: incomplete admission transaction retries, no duplicated ₹900. UC3: repeat/re-admission in next year does not reapply lifetime one-time fees unless client decides otherwise. UC4: school has no admission fee rule, no phantom zero due.

**Domain rules and acceptance:** Client must confirm one-time scope: lifetime in school vs each re-entry or session. Idempotent posting based on immutable business key; paid amounts never regenerated. Student admission success cannot silently leave half-created one-time obligations.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** FeeCharge sourceKey composed (schoolId,studentId,category,oneTimePolicyScope) UNIQUE, plus originAdmissionEventId/ref, rules/snapshot; prevent two identical charge keys even across race; fee receipts link through FE-07 allocations.

**Typed endpoints and cross-domain facade contracts:** Admission response includes `chargesPreview` and `chargesCreated` from fee facade; GET /operator/students/:id/fees/statement. Fee rule setup already supplies school-approved amount; do not trust UI-supplied total. Reject cross-tenant charge ID.

**Detailed service orchestration, server algorithm and frontend states:** Students admission service calls FeesPublicFacade.postInitialCharges via transaction coordinator or post-commit transactional outbox; choose architecture ensuring eventual consistency with explicit PendingFinancialSetup status and safe retries; not direct fees repository write. Web admission confirmation shows one-time charges & next steps. Retry returns identical source IDs.

**Recovery, idempotency, edge/race cases:** Student reactivation via CL-04, unique Student Code changes, and bulk import call same billing code path. Failure halfway in fee posting must be observable/replayed without duplicate student/admission fee.

## 3. Specific FE, BE and NFR tests

**FE:** TASK-016-FE01 admission preview 0/1/2 fees; FE02 confirmed statement matches; FE03 retry/refresh same due lines; FE04 old import initial fee policy; FE05 clear error if fee posting pending.

**BE/DB/API/security:** TASK-016-BE01 unique sourceKey under 20 concurrent admission attempts; BE02 idempotent retry; BE03 rule effective date; BE04 old school lacks fee config; BE05 no new fee if student already paid; BE06 batch imported students same pricing logic.

**NFR/operations:** TASK-016-NFR01 admission p95 measured, background retries bounded; NFR02 outbox failure injection; NFR03 zero orphan or double-billed financial row; NFR04 private audit.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
