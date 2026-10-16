# School ERP — Unified Development Plan

**Purpose:** Safely extend the already working school application with 35 implementation deliverables. The tasks are ordered by **technical prerequisites and deployable outcomes**, not by whether the idea came from feedback, research, or an earlier specification.

**Repository:** `jasiqlabs/custom-school-app` · **Stable implementation branch:** `main` · **Documentation branch:** `feature/academic-session-school-feedback-specs-20261016` · **Reviewed baseline:** `3d5a609f50be88af8366338bc7466316b435bbc1` (2026-10-16).

**Current implementation status:** **0/35 DONE**. The branch contains engineering documents only; it does not change application behavior or represent FE/BE/NFR test execution.

## The one place to start

**[TASK-TRACKER.md](TASK-TRACKER.md)** is the single execution tracker. It contains the final TASK-001…TASK-035 development order, minimal blocking dependencies, approval/policy gate, assignee, dates, PR links, FE/BE/NFR verification results and independent sign-off. **Agents/developers must update this file before starting and after every meaningful state transition.**

For any tracker row, open `tasks/TASK-XXX.md`. The individual file has the real-world business problem, explicit use cases, acceptance boundaries, domain ownership, proposed API/DTO, persistence and migration plan, service/UX behavior, error/concurrency design and named FE/BE/NFR tests. The task brief is not a second tracker.

## Mandatory before/after non-regression checklist

**Refactoring and UI redesign are allowed.** The developer must preserve all still-approved functionality while adding the task. Inspect the actual working code before changing it, record before-state UI/API/DB/NFR evidence, implement with backward-compatible contracts, rerun the same working journeys, and attach after-state proof. `npm test` currently does **not** run browser interaction tests; a developer must separately verify web behavior on mobile/tablet/desktop and test API/DB workflows. Any failing existing journey blocks acceptance until fixed or an intentional replacement is explicitly approved.

**[INTERN-RUNBOOK.md](INTERN-RUNBOOK.md)** — exact local agent/intern start → code → test → review steps, commands, failure handling and PR template. **[REGRESSION-BASELINE.md](REGRESSION-BASELINE.md)** — 16 preserved working-product journeys, actual current API routes, financial/data invariants and performance baseline capture. **[TASK-IMPACT-MATRIX.md](TASK-IMPACT-MATRIX.md)** — links **every one of the 35 tasks** to exact current source files, the old journeys to rerun and a specific high-risk invariant. **[ENGINEERING-REVIEW.md](ENGINEERING-REVIEW.md)** — P0/P1 issues found and mandatory senior reviewer gates.

## Supporting engineering references

| File | Purpose |
|---|---|
| [INTERN-RUNBOOK.md](INTERN-RUNBOOK.md) | Intern's implementation, refactor, QA and review workflow |
| [REGRESSION-BASELINE.md](REGRESSION-BASELINE.md) | Existing UI/API/data/financial/NFR behavior that must still work after each task |
| [TASK-IMPACT-MATRIX.md](TASK-IMPACT-MATRIX.md) | Task-by-task existing file references, mandatory regression journeys and review risk |
| [ENGINEERING-REVIEW.md](ENGINEERING-REVIEW.md) | Expert audit findings and senior review blockers |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain ownership, facade contracts, fee ledger/clearance transaction design, academic data life cycle, safe migration patterns |
| [TESTING-AND-RELEASE.md](TESTING-AND-RELEASE.md) | Shared security, NFR, regression, migration, end-to-end acceptance and release gates |
| [DECISIONS.md](DECISIONS.md) | Only unanswered business rules and exact questions for the product owner |
| [TRACEABILITY.md](TRACEABILITY.md) | Coverage matrix proving the earlier research and all supplied requirements map to numbered engineering tasks (not a workstream/task taxonomy) |

## Execution rules for a safe, fast build

1. **Start from stable `main` and read AGENTS.md**, then open a small implementation branch per task. Always refresh `main` before implementation; never assume the repository's default branch is the current stable branch.
2. **Only explicit predecessors block work.** The tracker is a topological order; each task's dependencies have smaller IDs. Tasks without common dependencies can be assigned to different developers in parallel.
3. **Each task must be independently deployable.** Never call a service/route owned by a later task. Expose a stable backward-compatible facade now; connect later without breaking the earlier feature. Keep incomplete future UI actions hidden.
4. **Maintain one domain owner per aggregate.** School owns identity/branding, Academics the academic year, Students enrollment, Fees money/ledger, Transport assignments, and document issuers their immutable snapshots. Modules communicate through public ports/facades, not another module's Prisma models.
5. **No destructive finance/history migrations.** Expand schema → backfill/compatibility → reconcile old/new totals → enable new path → rollback verification. No duplicate arrears, student identities or issued receipt/TC numbers.
6. **Protect every surface.** School ID derives from auth session; capability checks apply on API, exports, files and jobs; preserve CSRF, audit, encryption, privacy, accessibility and responsive web.
7. **Require FE, BE and NFR proof, plus actual before/after non-regression verification** for every PR and keep `main` working. The tracker records actual test results, not planned case lists.
8. **Keep original scope boundaries.** Books and uniform are charge types during admission; no stock/inventory module. Admit Card issuance is a **separately approved paid CR**, not a complete examination/grading module.

## Business and specification gates

The product owner has asked to add these capabilities to the ongoing product. Some specific operational policies remain unknown (mid-month billing, old-data mapping, allocation priority, year-close/TC links, etc.); resolve only those before relevant implementation. The 10-point academic research PDF is a clarification note with unselected decision boxes, so this plan does **not** invent answers.

The original approved JASIQ Harness PRD/HLD/DLD uses older scope (mandatory Aadhaar, platform-admin-only TC, monthly fee-only model and no automatic rollover/exams). The assigned agent must revise/reconcile the appropriate canonical artifacts through the existing `/jasiq-planning` revision → `/jasiq-stories` → `/jasiq-uiux` → `/jasiq-dld` approvals as part of preparing each affected feature. Do not treat these planning DLD proposals as already approved canonical designs.

## Agent handoff checklist

First read [INTERN-RUNBOOK](INTERN-RUNBOOK.md) and [TASK-IMPACT-MATRIX](TASK-IMPACT-MATRIX.md). Claim a task and set `IN_PROGRESS` with an owner/branch/time in the **one tracker** → confirm open decisions and upstream status → implement FE/BE/migration in a task branch → run task-specific tests and existing-feature regression → attach concrete evidence and rollback details → request independent review → mark `DONE` only after approved integration into stable `main`.

**Implementation remains NOT_STARTED.** No merge to `main` is part of this documentation work.
