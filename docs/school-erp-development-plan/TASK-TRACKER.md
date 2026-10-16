# Single Implementation Task Tracker — School ERP Extension

**Authoritative execution status file.** Every developer/agent updates **only this table** and its change log for task status; individual task specifications never contain competing status values. No other file may own independent task statuses. This is a documentation-only branch; **all 35 development tasks currently NOT_STARTED**. `main` remains the stable implementation baseline (verified at `3d5a609f50be88af8366338bc7466316b435bbc1`).

The order is **dependency topological with only functional blocking prerequisites**: tasks may run in parallel as soon as their explicit prerequisite IDs are DONE; **no task depends on any higher-numbered task**. Policy/approval gates are separate from technical dependencies and are not claims that work is contracted.

| Order / task | Deliverable (engineering capability) | Owner module | Depends on earlier task(s) | Approval gate | Status | Assignee | Started / updated | Implementation PR / commit | FE / BE / NFR evidence | Blocker / reviewer |
|---|---|---|---|---|---|---|---|---|---|---|
| [TASK-001](tasks/TASK-001.md) | Operator roles and server-side capability enforcement | Access control | — | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-002](tasks/TASK-002.md) | Reports-only operator experience and exports | Access control | TASK-001 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-003](tasks/TASK-003.md) | Official school identity fields and configuration | School | — | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-004](tasks/TASK-004.md) | Optional Aadhaar across admission and import | Students | — | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-005](tasks/TASK-005.md) | Correct student UDISE input and admission form identity | Students | TASK-003 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-006](tasks/TASK-006.md) | Public landing entry and operator navigation | Web | — | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-007](tasks/TASK-007.md) | Academic year creation and initial activation | Academics | TASK-001 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-008](tasks/TASK-008.md) | Session-scoped student enrollment and migration | Students | TASK-007 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-009](tasks/TASK-009.md) | Effective-dated class and section history | Students | TASK-008 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-010](tasks/TASK-010.md) | Current-year context in existing student screens | Web / Students | TASK-007, TASK-008 | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
| [TASK-011](tasks/TASK-011.md) | School go-live readiness and first-operator bootstrap | School | TASK-001, TASK-007 | POLICY_CONFIRMATION | NOT_STARTED | — | — | — | — | — |
| [TASK-012](tasks/TASK-012.md) | Fee category definitions and effective billing rules | Fees | — | SPEC_SYNC_REQUIRED | NOT_STARTED | — | — | — | — | — |
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

## Defined execution states (not identical to approval)

`NOT_STARTED → IN_PROGRESS → DEV_DONE → QA_IN_PROGRESS → READY_FOR_REVIEW → DONE`. Alternative states `BLOCKED`, `QA_FAILED`, `REOPENED`. `DONE` requires independent review, PR accepted into intended base, and test/rollback evidence. All states and approvals are initially untouched/unapproved. No 'DONE' merely because a design file exists.

## Agent/developer mandatory tracker protocol

1. Read task detail, upstream acceptance links, canonical Harness approvals and current code; **reject task start** when any lower-numbered listed predecessor is not `DONE` or necessary approval absent. An unrelated lower-numbered task is **not** a blocking prerequisite.
2. **Before coding**: edit only this task row with `IN_PROGRESS`, assignee, ISO time, working branch, exact base SHA and accepted policy link; commit the tracker update. For blocked work set `BLOCKED` and explain decision owner; do not code based on assumption.
3. Every implementation PR includes: precise affected files/ports; migration strategy; test matrix identifiers from the task; FE screenshots/video in mobile/tablet/desktop; BE/API/tenant/permission/concurrency evidence; NFR benchmark, security and rollback plan; full regression suite output.
4. Update row to `DEV_DONE`, then `QA_IN_PROGRESS`, or `QA_FAILED` with reproducible failure. Raise `READY_FOR_REVIEW` after FE/BE/NFR evidence is linked.
5. Independent reviewer confirms the stated capability and app-level regression. Only after approved merge and deployment handoff mark `DONE`; include commit SHA, reviewer and verification dates. Do not overwrite another developer's concurrent tracker edit: rebase and resolve row conflict deliberately.
6. Append each state/approval change to change log below; all status info stays in **this one file**, not in task briefs.

## Execution decision gates (separate from status)

- `SPEC_SYNC_REQUIRED` — requested capability and safe default behavior are identifiable. Before coding, the agent reconciles the change with canonical JASIQ Harness PRD/HLD/stories/UIUX/DLD and obtains its normal review; it is **not** a request to renegotiate the already supplied feedback.
- `POLICY_CONFIRMATION` — exact operational rule is unresolved (examples: part-month billing, fee allocation priority, concession scope, year-close blockers, receipt template). Confirm the stated question in [DECISIONS.md](DECISIONS.md) and reconcile canonical specs **before implementing that rule**.
- `SCOPE_CONFIRMATION` — earlier research identified a possible feature but the client has not explicitly selected its detailed scope, or the requested operator capability is ambiguous. Confirm include/defer/omit before work; preserve existing modules meanwhile.
- `PAID_CR_REQUIRED` — Admit Card is separately chargeable. Written commercial and template approval must exist **before** either task begins.

These gates describe open decisions, **not implementation status**. An engineer may work on any other task with no unfinished predecessor and a cleared gate; no global waiting for all 35 tasks. Only [TASK-TRACKER.md](TASK-TRACKER.md) records a task's evolving owner/status.

## Change log

| Timestamp (UTC) | Task | Assignee/reviewer | State transition | PR / evidence / policy decision |
|---|---|---|---|---|
| 2026-10-16 | TASK-001..035 | Specification preparation | CREATED → NOT_STARTED | All are documentation-only; no implementation or tests run; approval gates unresolved. |

## Required per-task sign-off fields (copy into PR)

```text
Task ID and title:
Owner / reviewer:
Canonical requirement decision + approved PRD/HLD/UX/DLD links:
Main base SHA and implementation branch:
Affected services / screens / database objects:
Migration/backfill, rollback and immutable data check:
FE test ID, observed result and screenshot/video:
BE test ID, observed result and command output:
NFR test ID, measured numbers and baseline:
Tenant, role, CSRF, PII and audit cases:
Existing flow regression cases + results:
PR/commit/deployment evidence:
Outstanding issues or approved exceptions:
Independent signoff and date:
```
