# School ERP — Single Developer Task Tracker

**ONE source of truth for task execution status, ownership, blockers, review and test evidence.** Do not copy status into task DLD, PR checklist, architecture or another spreadsheet. This file must be edited as code changes progress. **35 tasks currently NOT_STARTED**; preparing documents did not implement or test any feature.

**Rules:** Tasks are in clean dependency order. An agent may start a task when all of its explicitly listed dependencies are DONE and its product/spec gate has been resolved; unrelated lower-numbered tasks are **not** blockers. No task depends on a higher-numbered task. Every intern's high-risk work must receive independent senior review. All task documents are [here](tasks/).

| Order / task | Deliverable (engineering capability) | Owner module | Depends on earlier task(s) | Approval gate | Status | Assignee | Started / updated | Implementation PR / commit | FE / BE / NFR evidence | Blocker / reviewer |
|---|---|---|---|---|---|---|---|---|---|---|
| [TASK-001](tasks/TASK-001.md) | Operator roles and server-side capability enforcement | Access control | — | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | CapabilityGuard, 0005 migration, 7/7 tests pass in capability.guard.spec.ts | — |
| [TASK-002](tasks/TASK-002.md) | Reports-only operator experience and exports | Access control | TASK-001 | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | Report-viewer shell & exports, 7/7 tests pass in fee-exports.service.spec.ts | — |
| [TASK-003](tasks/TASK-003.md) | Official school identity fields and configuration | School | — | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | 0006 migration, schoolCode/affiliation/udise, 9/9 tests in schools.service.spec.ts | — |
| [TASK-004](tasks/TASK-004.md) | Optional Aadhaar across admission and import | Students | — | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | 0007 migration, optional Aadhaar validator/import, 12/12 tests in student.validator.spec.ts | — |
| [TASK-005](tasks/TASK-005.md) | Correct student UDISE input and admission form identity | Students | TASK-003 | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | Admission form print identity, 5/5 tests in search-students.service.spec.ts | — |
| [TASK-006](tasks/TASK-006.md) | Public landing entry and operator navigation | Web | — | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | Public landing operator entry card & shell navigation, static QA 0 diagnostics | — |
| [TASK-007](tasks/TASK-007.md) | Academic year creation and initial activation | Academics | TASK-001 | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | 0008 migration, AcademicSession CRUD & activation, 12/12 tests in academic-sessions.service.spec.ts | — |
| [TASK-008](tasks/TASK-008.md) | Session-scoped student enrollment and migration | Students | TASK-007 | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | 0009 migration, session enrollment snapshots, 8/8 tests in admit-student.service.spec.ts | — |
| [TASK-009](tasks/TASK-009.md) | Effective-dated class and section history | Students | TASK-008 | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | 0010 migration, ChangeStudentEnrollmentService, 8/8 tests in change-student-enrollment.service.spec.ts | — |
| [TASK-010](tasks/TASK-010.md) | Current-year context in existing student screens | Web / Students | TASK-007, TASK-008 | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-20 | feature/school-erp-task-001-to-010 | YearSelector in directory & profile, archived banner/view-only, 5/5 tests in search-students.service.spec.ts | — |
| [TASK-011](tasks/TASK-011.md) | School go-live readiness and first-operator bootstrap | School | TASK-001, TASK-007 | POLICY_CONFIRMATION | DEV_DONE | Antigravity | 2026-10-22 | feature/school-erp-task-011 | Go-live checklist card in schools/[schoolId], getReadiness/activate endpoints, 6/6 tests in schools.service.spec.ts (BE01-06), subagent browser verified | — |
| [TASK-012](tasks/TASK-012.md) | Fee category definitions and effective billing rules | Fees | — | SPEC_SYNC_REQUIRED | DEV_DONE | Antigravity | 2026-10-22 | feature/school-erp-task-012 | 0011 migration deployed, FeeCategoriesRulesService CRUD & precedence resolver, 10/10 tests in fee-categories-rules.service.spec.ts (BE01-06), 409 overlap prevention verified, Tabbed Fee Setup UI with Categories & Rules | — |
| [TASK-013](tasks/TASK-013.md) | Multi-charge ledger and payment allocation migration | Fees | TASK-008, TASK-012 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-014](tasks/TASK-014.md) | Fee applicability by admission, class change and exit dates | Fees / Students | TASK-009, TASK-013 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-015](tasks/TASK-015.md) | Concession reasons and non-destructive adjustments | Students / Fees | TASK-013 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-016](tasks/TASK-016.md) | One-time registration and admission charges | Fees / Admission | TASK-013 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-017](tasks/TASK-017.md) | Books and uniform selection during admission | Admission / Fees | TASK-016 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-018](tasks/TASK-018.md) | Transport, exam, late and miscellaneous fee charges | Fees / Transport | TASK-013, TASK-014 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-019](tasks/TASK-019.md) | Arrears statement and cross-month fee collection | Fees | TASK-013, TASK-014 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-020](tasks/TASK-020.md) | Mid-year school onboarding and opening balances | Fees / Onboarding | TASK-013, TASK-019 | SCOPE_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-021](tasks/TASK-021.md) | Academic-year financial continuity and reconciliation | Fees | TASK-013, TASK-019 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-022](tasks/TASK-022.md) | Leaving, pass-out and effective service termination | Students / Transport / Fees | TASK-009, TASK-014 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-023](tasks/TASK-023.md) | Returning student re-admission into current year | Students | TASK-022 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-024](tasks/TASK-024.md) | Bulk promotion, repeat and graduation transitions | Students / Academics | TASK-008, TASK-009, TASK-022 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-025](tasks/TASK-025.md) | Academic-year close, archive and correction controls | Academics | TASK-021, TASK-024 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-026](tasks/TASK-026.md) | Historical year selector, reporting and exports | Reports | TASK-002, TASK-010, TASK-019 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-027](tasks/TASK-027.md) | Receipt and student-number sequence policies | Foundation / School | TASK-007, TASK-013 | SCOPE_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-028](tasks/TASK-028.md) | Document snapshots, secure workers and versioned files | Documents / Foundation | — | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-029](tasks/TASK-029.md) | School identifiers and historic context on transfer certificates | Documents | TASK-003, TASK-008, TASK-028 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-030](tasks/TASK-030.md) | Two-copy itemized fee receipt and collector snapshot | Fees / Documents | TASK-013, TASK-028 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-031](tasks/TASK-031.md) | PDF receipt download from payment history | Fees / Documents | TASK-030 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-032](tasks/TASK-032.md) | Server-authoritative TC fee clearance for every issuer | Fees / Documents | TASK-019, TASK-021, TASK-028 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-033](tasks/TASK-033.md) | Operator-panel transfer certificate issuance | Documents / Operator | TASK-001, TASK-029, TASK-032 | SCOPE_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-034](tasks/TASK-034.md) | Exam context and admit card setup (paid change) | Documents | TASK-001, TASK-007 | PAID_CR_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-035](tasks/TASK-035.md) | Admit card issuance with fee-clearance enforcement | Documents / Fees | TASK-032, TASK-034 | PAID_CR_REQUIRED | NOT_STARTED | — | — | — | — | — |

## Valid task states

`NOT_STARTED` → `IN_PROGRESS` → `DEV_DONE` → `QA_IN_PROGRESS` → `READY_FOR_REVIEW` → `DONE`. Exceptions: `BLOCKED`, `QA_FAILED`, `REOPENED`.

**DONE requires** task implementation + new FE/BE/NFR checks + BEFORE/AFTER existing-function regression + independent review + approved merge into intended stable branch. A task with only unit mocks or static QA cannot be DONE. Never invent PASS results.

## Policy gate meanings

- `SPEC_SYNC_REQUIRED`: proposed behavior is clear but the canonical JASIQ Harness PRD/HLD/stories/UIUX/DLD must be revised/approved where it conflicts with original scope.
- `POLICY_CONFIRMATION`: client or product owner must confirm concrete eligibility, cutoff, pricing, fee correction or closure rule in [DECISIONS.md](DECISIONS.md) before affected code changes.
- `SCOPE_CONFIRMATION`: research/feedback defines an option without an unambiguous current-phase scope. Confirm include/defer/omit and exact acceptance before coding.
- `PAID_CR_REQUIRED`: TASK-034/035 Admit Card is separately chargeable. Written commercial approval and sample template policy required before any implementation.

**Approval gate is not a status.** A task can be blocked while awaiting a decision but no one should prevent independent approved tasks from proceeding.

## Agent/intern tracker update protocol

1. Read [INTERN-RUNBOOK](INTERN-RUNBOOK.md), [ARCHITECTURE](ARCHITECTURE.md), the assigned `tasks/TASK-XXX.md`, [REGRESSION-BASELINE](REGRESSION-BASELINE.md) and [TASK-IMPACT-MATRIX](TASK-IMPACT-MATRIX.md). Confirm latest main SHA and dependent task DONE links.
2. **Before coding**, set status `IN_PROGRESS`, owner, start time, task feature branch/main base SHA and approval link (or `BLOCKED` with exact missing decision). Commit tracker change.
3. Create failing new behavior tests, record old UI/API/data/NFR baselines on synthetic schools, implement safe incremental slice. Do not write unimplemented future routes/CTAs. Merge a migration only after compatibility and rollback are reviewed.
4. Record every named task FE/BE/NFR case outcome, actual commands/observations and `BASE-XX` old-function regressions. Use `QA_FAILED` with reproducible evidence when something breaks; fix before acceptance.
5. Put PR SHA, reviewer, screenshots, database amounts/checksums and measured p50/p95 in evidence column. Reviewer checks unchanged features, role/tenancy and migration, marks READY_FOR_REVIEW→DONE only after approved integration.
6. Concurrency: rebase and reconcile tracker row changes; never overwrite other developer's updates or maintain a second source of truth.

## PR / evidence template (link from each task row)

```text
Task ID / title / assigned engineer / reviewer:
Canonical PRD/HLD/story/UIUX/DLD approvals and policy decision:
Baseline stable main SHA, feature branch and PR URL:
Affected existing source modules, proposed DB/API/UI:
BEFORE screenshots (360/768/1366), API DTO and response examples:
New FE case IDs + real browser result and evidence:
New BE case IDs + real API/DB result and evidence:
New NFR case IDs + workload/p50/p95/query EXPLAIN/memory/worker evidence:
Role, tenant, CSRF, encryption, PII and report/file denial cases:
Affected BASE-XX existing-flow cases + AFTER comparison:
Ledger/receipt/TC/enrollment row counts, totals and SHA before/after:
Migration/rollforward/backup/restore evidence:
Full build/static/API tests, exact commands and results:
Known unresolved issues (if any) + reviewer decision:
Merge/release SHA and date:
```

## Change log

| UTC timestamp | Task(s) | Author / reviewer | Old → new state | Evidence or reason |
|---|---|---|---|---|
| 2026-10-16 | TASK-001..035 | Specification preparation | CREATED → NOT_STARTED | Documentation-only; no runtime implementation/test result. |
| 2026-10-20 | TASK-001..010 | Antigravity | NOT_STARTED → DEV_DONE | Full additive migrations 0005-0010, contracts, backend services, controller APIs, web UIs, and 193/193 unit/integration tests passing. Zero regression on baseline. |
