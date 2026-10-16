# Local Agent / Intern Implementation Handoff Prompt

**Use this prompt only AFTER the documentation PR has been approved and merged into stable `main`.** Implement ONE assigned `TASK-XXX` at a time, not the entire 35-task backlog in one PR.

## Prompt to give the agent

> You are implementing a task in `jasiqlabs/custom-school-app` as a senior-supervised engineer. `main` is the verified stable implementation base. Do not use the repository default branch blindly; fetch latest `origin/main`, inspect `git status` and commit SHA, and create `feature/school-erp-task-XXX-<short-name>`.  
>
> First read repo `AGENTS.md`, the approved JASIQ Harness project PRD/HLD/stories/UIUX/DLD, and ALL of: `docs/school-erp-development-plan/README.md`, `ARCHITECTURE.md`, `TASK-TRACKER.md`, `INTERN-RUNBOOK.md`, `REGRESSION-BASELINE.md`, `TASK-IMPACT-MATRIX.md`, `TESTING-AND-RELEASE.md`, `DECISIONS.md`, and the assigned `tasks/TASK-XXX.md`.  
>
> Validate prerequisite tasks are marked DONE, and resolve only this task's policy/spec decision gate before coding. If blocked, record `BLOCKED` with exact decision and stop. Update **the single TASK-TRACKER.md** with owner, IN_PROGRESS, branch, baseline SHA and timestamp before implementing.  
>
> Inspect **actual main source files** from the TASK-IMPACT-MATRIX. Run/record current supported FE/UI, BE/API/database and NFR behavior as BEFORE evidence using two synthetic isolated school tenants. Include old login, student search/import, monthly fee, part/full collection, same-day void/receipt, transport, dashboard/report and Platform Admin TC where touched.  
>
> Implement the approved business story and proposed detailed DLD using current conventions. You may refactor, rewrite or redesign if it improves architecture/UX, but **MUST NOT BREAK any existing functionality, data, route behavior, accessibility, security or NFR**. Server-derived schoolId, strict role guards, CSRF, append-only audit, encrypted sensitive data, signed private files, BullMQ {jobId}-only and immutable historic payments/TCs remain mandatory. Use typed DTO/Zod and public facades, not sibling Prisma reads. Any data migration must be additive, dry-run/backfilled/reconciled and recoverable with no production reset.  
>
> Implement and **run** all named TASK-XXX-FE, -BE and -NFR cases and applicable BASE-XX existing regression cases. FE must include real browser desktop/tablet/mobile interaction and before/after screenshots; BE must include real DB and API tenant/permission, failure/idempotency/concurrency; NFR must include measured p50/p95, memory/query plans when impacted, security/privacy and worker/recovery where relevant. Static QA/Jest mocks alone do not prove frontend or transactional correctness.  
>
> Keep every task independently deployable (no later TASK dependency), no dead future buttons. Record actual commands/results, change summary, affected old routes/screens, migration SQL/backfill/rollback, financial/document comparison, NFR measurements and remaining risks. Update one tracker through DEV_DONE/QA/READY_FOR_REVIEW.  
>
> **Never self-approve DONE or merge into main.** Request independent senior review with PR URL, screenshots and test evidence. If any old behavior broke, fix it on this task branch and report QA_FAILED until resolved. Paid Admit Card tasks require written commercial approval first.

## Agent's expected final output per task

```text
Task ID / requirement understood:
Main base SHA / implementation branch:
Canonical spec approval/policy:
Existing files/routes identified:
New/changed files and DB migration:
FE tests: test IDs, browser widths, actual PASS/FAIL, before/after evidence:
BE tests: test IDs, real API/DB scenarios and exact results:
NFR tests: test IDs, workload, measured p50/p95, baseline comparison:
Protected BASE-XX scenarios: PASS/FAIL and before/after evidence:
Cross-school/role/CSRF/PII and payment/TC integrity:
Migration/rollback/recovery:
Tracker status and PR link:
Unresolved blockers:
Independent reviewer requested:
```

**User-facing requirement:** Development may completely rewrite implementation internals, but must not disrupt the actual features schools can already use.
