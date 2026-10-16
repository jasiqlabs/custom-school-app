# Engineering Review — Intern Development Readiness

**Review type:** static architecture and implementation-readiness review. **Code inspected:** `main@3d5a609f50be88af8366338bc7466316b435bbc1`; approved project Harness context and 35 numbered task briefs. **Date:** 2026-10-16. **Not performed:** running Postgres/Redis, executing builds/tests, browser screenshots, migration rehearsal or measuring production p95. Treat all such proof as outstanding until a developer performs it.

## Executive verdict

**Clear enough to plan and assign, not yet sufficient to mark production implementation as verified.** All 35 tasks are documented and have FE/BE/NFR cases. An intern can implement a **single approved task** using this pack, with independent review; high-risk finance migration, operator authorization, academic rollover/exit concurrency, and TC eligibility must have a senior architecture/DB reviewer **before code merge**. Passing unit tests alone does not justify completion.

## Priority review findings (these are engineering hazards, not missing feature categories)

| ID | Severity | Finding from existing source | Required control / documentation resolution |
|---|---|---|---|
| RV-01 | **P0** | `FeesPublicFacadeImpl.getStudentFeeSummary` performs `ensureDuesForApplicableMonths` (a potential write) as part of reading a student fee summary. | Report/viewer role and year filters must not trigger implicit writes; introduce explicit authorized, idempotent assessment commands or a reviewed projection, with test verifying GET produces **zero DB mutations** under viewer privileges. TASK-001/002, TASK-013/019. |
| RV-02 | **P0** | Current payment model is one `FeeDue` per student/month and one `FeePayment.dueId`, while new categories require multiple charges and allocations. | TASK-013 needs exact per-school before/after financial reconciliation, legacy payment/receipt compatibility, migration shadow rows, concurrent pay/void tests. No new writer cutover with a 1-paisa variance. |
| RV-03 | **P0** | `StudentPrivateProfile.aadhaarLast4` is non-null and validation/import assume Aadhaar. | TASK-004 must update full admission+edit+XLSX+encrypted profile+print flow, with seeded null and old encrypted profiles. No fake Aadhaar, plaintext export/log, or half-null crash. |
| RV-04 | **P0** | `OperatorGuard` only verifies `OPERATOR` authentication; individual `FeesController`/Student APIs have no capabilities. | TASK-001/002 require a complete method-level endpoint matrix and session invalidation after role changes, including **POST XLSX export** and signed report downloads. The new role must not bypass CSRF or platform-admin separation. |
| RV-05 | **P0** | `StudentEnrollment` currently has no academic year; historical class and billing use active enrollment assumptions. | TASK-007/008/009 cannot fabricate historical dates or lose old enrollments. Rollout nullable FK, staged backfill with school confirmation, session-aware query adapters and immutable historical names. |
| RV-06 | **P0** | TC issue is platform-admin only with encrypted snapshot and async worker; no fee-clearance gate. | TASK-028/029/032/033 must reuse frozen snapshot+worker, check dues in shared issuance service under ledger locking, and preserve existing admin issue/list/download/retry. Old issued TCs remain downloadable despite later financial changes. |
| RV-07 | **P0** | `Student` updates currently reach directly into transport assignment persistence and Fees code queries Students tables directly. | Any touched code should move new behavior behind module-owned facade/ports. **Do not casually rewrite the old flow**: before/after golden tests for transport assign/reassign/end, student updates, fee generation, dashboards. |
| RV-08 | **P1** | Root `npm test` delegates to Turborepo; the web/worker test scripts invoke static QA only. | A green `npm test` is **not proof** that React interactions, HTTP integrations, responsive layout, downloads or PDF output work. Require manual/instrumented browser FE verification + DB-backed API integration and actual NFR measurements per task. |
| RV-09 | **P1** | The repository does **not** contain a committed lockfile at the inspected SHA. | Do not tell interns `npm ci` is always available; use the repo-supported dependency install strategy, record npm/Node versions, keep dependency changes reviewed, and use a clean isolation environment. |
| RV-10 | **P1** | Existing `SchoolOperator` provisioning requires `School.status=ACTIVE` before create. | A readiness rule requiring an operator before school activation creates a bootstrap deadlock; TASK-011 must offer an approved first-operator path and cover a new-school-from-zero end-to-end journey. |
| RV-11 | **P1** | Approved fee DLD says prior generated amounts are stable, but concession sync code may update generated pending dues. | TASK-015 must explicitly resolve policy; prefer immutable assessments with adjustments and preserve settled receipts, never silently recalculate historical amounts. |
| RV-12 | **P1** | The 35 task briefs mix **proposed** endpoint/table names with names actually in `main`. | Intern must inspect current code before coding; examples like `/operator/academic-sessions`, `FeeCharge`, `DocumentManifest` are **design proposals**, not already-implemented routes/models. Validate against Nest controller, Zod, DTO and Prisma migration with reviewer. |
| RV-13 | **P1** | Date rules, receipt layout, eligible TC fees, midyear starts, historical imports and Admit Card contract have unresolved policy questions. | Use only applicable tasks' decision gates, not a global stop. Record explicit rule choices before irreversible financial or status writes. Paid Admit Card remains blocked pending written signoff. |
| RV-14 | **P1** | Academic-year rollover/exit may invoke multi-owner effects on fees and transport, and tasks are intentionally split into independently deployable slices. | Treat prepared promotion (TASK-024) distinctly from **actual year transition** (TASK-025). Use idempotent outbox/retry and revalidate under locks; never show a 'Promote now' UI while only staging is deployed. |
| RV-16 | **P0** | Existing SchoolOperator cannot be created before School ACTIVE, yet academic-year activation is managed by an operator in initial design. | TASK-007 needs Platform Admin bootstrap year setup for a DRAFT school; TASK-011 must retain a viable first-operator provisioning path and grandfather legacy ACTIVE schools. |
| RV-15 | **P1** | No documented before/after baselines existed for the 35-task pack. | Added [REGRESSION-BASELINE.md](REGRESSION-BASELINE.md) and [INTERN-RUNBOOK.md](INTERN-RUNBOOK.md): record original UI behavior/API contracts/data invariant/performance *before* editing. |

## Can an intern safely rewrite or redesign code?

**Yes, with evidence.** Internal refactors, schema expansion, shared component extraction, architectural redesign and visual UX improvements are allowed, but a refactor must preserve **externally observable supported behavior** until a reviewed intentional contract change is approved. This includes route names/request semantics or a compatibility adapter, account/session behavior, monetary totals and receipt references, tuition effective dates, student IDs, school isolation, transport assignments, TC snapshots, upload/storage, report exports and keyboard/mobile accessibility.

**Redesign is not the same as regression.** A different UI layout is acceptable if equivalent functions are discoverable and perform the same expected business workflow at 360/768/1366 px. Conversely a visually identical screen with incorrect backend actions is a failure.

### Enforced review process

Before a task PR: establish baselines and add failing tests for new acceptance criteria. During coding: use feature toggles for risky schema/permission/fee switching; guard existing routes and stable DB rows. After coding: run static/type/build, targeted and full suites, cross-tenant API integration, browser journeys and NFR. A separate reviewer checks both new behavior and protected existing behavior.

**Evidence rule:** Link actual commands, output, screenshots, DB balance audits, measured latency, and migration dry-run/rollback in the **single tracker**. Do not mark DONE because docs exist or because Jest mocks passed.

## Special architectural signoffs

- **Required senior review** for TASK-001/002 (RBAC and sessions), TASK-004 (encrypted PII), TASK-007/008/009/022/024/025 (year/enrollment lifecycle), TASK-013/014/015/016/018/019/020/021/027 (money, migration, dates), TASK-028/029/030/031/032/033/034/035 (private document/TC/paid generator), and any significant cross-module refactor.
- **Intern-sized tasks** such as TASK-003/005/006 and UI-focused aspects of others are suitable for supervised implementation with focused tests.
- Reviewer must reject: missing negative tests, `any`-based auth bypass, stubbed business operations, temporary console logs with PII, in-place historical financial edits, uncontrolled migration, or dropping a legacy endpoint solely to satisfy a new UI.

## What is still pending after this documentation review?

Nothing has been implemented or tested against a runtime in this branch. Exact policies, canonical Harness changes and concrete FE/BE/NFR evidence remain future work per the task tracker. Do not claim production readiness prematurely.
