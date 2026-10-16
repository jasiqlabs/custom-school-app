# TASK-023 — Returning student re-admission into current year

**Engineering owner:** Students. **Only technical predecessors:** TASK-022 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Reactivate an inactive/left student under same UUID, selecting a valid active year, class, section and effective fee date; preserve previous TC/fee/enrollment history.

**Explicitly out of this task:** No automatic re-issue or cancellation of earlier TC, no new Student identity, no reactivation of old transport route by default.

**Operator/user story:** As school manager, I readmit a student who previously left without losing old student identity, classes, TC, fee or transport history.

**Use cases with success/error expectations:** UC1: child left in 2026-27, returns in 2027-28 to Class 3-B. UC2: return in same session after temporary inactive state, requires explicit effective dates. UC3: old debts remain visible and admission charges behave per one-time policy. UC4: tries to reactivate student currently enrolled in another active class -> conflict. UC5: returning student chooses transport anew, not silently reactivate old route.

**Domain rules and acceptance:** Status ACTIVE toggle alone is insufficient: must specify target session, class, section, reentry date and reason. Do not generate duplicate Student UUID/code; no default re-use of old class or transport assignment. Enforce new-year closure/eligibility and fees start rule CL-02.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** StudentReAdmission(id,schoolId,studentId,targetSessionId,effectiveDate,reason,createdBy,previousExitId?,status,version); new StudentEnrollment with target period and preserved prior rows. If repeated in same target year, enforce no date overlap (SQL unique/constraint or explicit lock + composite business key).

**Typed endpoints and cross-domain facade contracts:** GET /operator/students/:id/reactivation-preview?targetSessionId; POST /operator/students/:id/reactivate {targetSessionId,classId,sectionId,effectiveDate,reason,requestKey,expectedStudentVersion}; GET /operator/students/:id/enrollment-history.

**Detailed service orchestration, server algorithm and frontend states:** Students service fetches existing identity, validates inactive/left and target session ACTIVE via AcademicsPublicFacade, loads class/section and eligibility, locks existing enrollments, creates new enrollment and records re-admission event; fee start event passed to FeesPublicFacade and optional new transport assignment staged through transport owner. UI 'Reactivate Student' multi-step chooses year/class/section, displays previous status and debts, requires confirmation.

**Recovery, idempotency, edge/race cases:** Prior TC still authentic historic issue; new TC may be issued after return per policy. Paid previous registration/admission fees should not repeat unless client explicitly approves re-enrollment policy. Race of two reactivate clicks must create one result.

## 3. Specific FE, BE and NFR tests

**FE:** Students service fetches existing identity, validates inactive/left and target session ACTIVE via AcademicsPublicFacade, loads class/section and eligibility, locks existing enrollments, creates new enrollment and records re-admission event; fee start event passed to FeesPublicFacade and optional new transport assignment staged through transport owner. UI 'Reactivate Student' multi-step chooses year/class/section, displays previous status and debts, requires confirmation.

**BE/DB/API/security:** TC-CL04-BE01 invalid active reactivation 409; BE02 no duplicate student; BE03 no two overlapping enrollments; BE04 safe fee eligibility start; BE05 cross-tenant student/section; BE06 idempotent event and audit.

**NFR/operations:** TC-CL04-NFR01 5k-student search performance; NFR02 transactional latency/locking under double submit; NFR03 no loss of historic documents and backups; NFR04 role permissions and CSRF.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
