# TASK-018 — Transport, exam, late and miscellaneous fee charges

**Engineering owner:** Fees / Transport. **Only technical predecessors:** TASK-013, TASK-014 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Assess and collect dated transport, exam, late and custom charges from configured effective rules. Transport fee eligibility is based on TransportPublicFacade's assignment dates, never just a UI checkbox.

**Explicitly out of this task:** Exam fee ≠ exam scheduling/results module or Admit Card generator. No automatic late penalty without approved trigger/grace rules; manual charge initially if policy permits.

**Operator/user story:** Operator can record appropriate transport, exam, late and custom other dues with correct cadence and no duplicate assessment.

**Use cases with success/error expectations:** UC1: enrolled transport student charged valid route fee only while service active. UC2: once-per-term exam charge label 'Annual Exam' without full exam result module. UC3: manager manually records permitted late fee with reason, without auto-fine. UC4: Other category with memo/amount. UC5: fee update after transport ends does not delete past charges.

**Domain rules and acceptance:** Automatic transport/exam/late billing rules remain blocked until client approves triggers and coverage. Late fees should default manual (no automatic penalty). Transport assignment ownership belongs Transport, fee assessment Fees. Exam fee does not entail creating whole exam module or admit card.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** FeeRule supports charge basis/servicePeriod, examEventRef? (simple approved label, not grades), transportAssignmentId? as source reference, FeeCharge.originReference and reason, sourceKey unique by applicable school/student/event/month/category. Provide indexes for service validity windows.

**Typed endpoints and cross-domain facade contracts:** Manager POST /operator/fees/charges/manual {studentId,categoryCode,reason,amount,eventLabel?,dueDate}; GET fee rules and eligible transport source summaries via TransportPublicFacade; finance service validates max/min amount and school category, auth and audit.

**Detailed service orchestration, server algorithm and frontend states:** Fees engine batch requests active service eligibility periods from TransportPublicFacade; calculates school-configured amount per approved dates; for Exam and Other show labeled form; Late manual requires extra reason. UI category selector dynamically shows only relevant fields, a preview table and post-confirm updated statement.

**Recovery, idempotency, edge/race cases:** Student exits during charge period; need agreed prorating and future cutoff CL-02. Avoid charging transport to student with 'transportRequired' YES but no assignment if policy says actual service only. Do not issue exam admit card automatically.

## 3. Specific FE, BE and NFR tests

**FE:** TC-FE03-FE01 transport with/without valid assignment; FE02 event fee label; FE03 late manual reason; FE04 duplicate event blocked; FE05 student future charge preview and status.

**BE/DB/API/security:** TC-FE03-BE01 service date window and class; BE02 sourceKey dedupe; BE03 all category permissions; BE04 no auto late charge; BE05 Other free-text sanitize; BE06 void/recharge adjustment audit.

**NFR/operations:** TC-FE03-NFR01 fee generation in batches avoids N+1 transport queries; NFR02 as-of query indexed; NFR03 input injection/XSS test for memo; NFR04 financial exactness and 5k students stress.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
