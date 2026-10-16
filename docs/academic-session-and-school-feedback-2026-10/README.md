# Custom School App — Client Feedback + Academic Session Lifecycle Design Pack

**Status:** DESIGN PREPARATION COMPLETE (not feature implementation / not approved canonical DLD).  
**Target repository:** `jasiqlabs/custom-school-app`. **Working branch:** `feature/academic-session-school-feedback-specs-20261016`.  
**Reviewed stable base:** `main@3d5a609f50be88af8366338bc7466316b435bbc1`. **Date:** 2026-10-16.

## Start here

1. **[TASK-TRACKER.md](TASK-TRACKER.md)** — the **ONE execution tracker** agents/developers MUST update whenever they claim, start, test, review or finish a task. 32 unique tracked tasks. All initially `NOT_STARTED`; paid CR and unconfirmed requirements need approval before code.
2. **[RESEARCH-PDF-ALIGNMENT.md](RESEARCH-PDF-ALIGNMENT.md)** — cross-check of **all 10 earlier academic-session research clarifications**, exact source questions, 6 previously missed task areas, and DOCX/Chat feedback.
3. **[ARCHITECTURE-DECISIONS.md](ARCHITECTURE-DECISIONS.md)** — architectural boundaries, approved-Harness conflicts, migration design, finance immutability, concurrency, security and release gates.
4. **[tasks/](tasks/)** — **32 separate detailed task briefs**. Each includes business problem, real use cases, acceptance boundaries, proposed exact models/APIs/service flow, FE/BE/NFR test cases, rollback/regression and DoD.
5. **[01-current-state-audit.md](01-current-state-audit.md)** — evidence-based review of the actual `main` code, not just feature branch names.
6. **[07-open-decisions.md](07-open-decisions.md)** — commercial/business policy questions; read alongside the prior PDF (its page 6 contains **no client selections**).
7. **[06-cross-cutting-tests-and-release.md](06-cross-cutting-tests-and-release.md)** — shared end-to-end, negative, security, NFR and release verification.

## Task inventory (32)

| Prefix | Count | Purpose |
|---|---:|---|
| AS-01..AS-06 | 6 | Academic year dates, activation/closure, enrollment, promotion, fee continuity, year-aware UI |
| CL-01..CL-06 | 6 | **New from earlier PDF**: leaving/TC lifecycle, mid-year fee start/stop, onboarding opening balances, re-admission, go-live readiness, numbering policy |
| FB-01..FB-08 | 8 | DOCX: welcome, school identity, optional Aadhaar, receipt and role feedback |
| FE-01..FE-07 | 7 | Chat: expanded fee categories, books/uniform as fees, arrears, concession and multi-charge ledger |
| DC-01..DC-05 | 5 | Operator TC, fee clearance, paid admit-card CR and versioned documents |

**Previous summary documents** `02-academic-session.md`, `03-client-feedback.md`, `04-fees.md` and `05-documents.md` are retained as **non-authoritative initial high-level drafts** for background. For task execution, **individual `tasks/ID.md` + `ARCHITECTURE-DECISIONS.md` + latest approved JASIQ Harness artifacts take precedence**. Do not update any execution status in these summaries.

## A source-approval warning (critical)

The approved `jasiqlabs/jasiq-harness` PRD v2.0.0 explicitly says **Aadhaar required**, **Platform Admin owns TC issuance**, **monthly class fees**, and **automatic academic-year rollover and exams out of MVP scope**. The new feedback proposes changes. The academic PDF is a clarification/decision document and **its page 6 matrix has no selections**; it cannot automatically override the PRD. Admit Card Generator is a separately chargeable request.

Before coding: obtain scope decisions, update canonical PRD/HLD in Harness by governed revision, run `/jasiq-planning` revision + `/jasiq-stories` + `/jasiq-uiux` + `/jasiq-dld`, receive independent approval, and record links in tracker. **These per-task engineering drafts are NOT falsely presented as approved Harness DLDs.**

## Agent workflow (mandatory, concise)

- Pull current stable **`main`**; verify diff and fresh README/AGENTS.md, approved PRD/HLD/stories/UIUX/DLD; do **not** rely on GitHub default branch (currently points to `feature/mod-001-platform-admin-school-onboarding`).
- Read one `tasks/<ID>.md`, dependencies, open decisions and architecture; check source decision+approval status. If blocked, **do not code**.
- Claim task in **`TASK-TRACKER.md`**: owner, state `IN_PROGRESS`, start date, task PR branch, blocker notes. Commit tracker update.
- Implement smallest compatible surface with module public facades, additive DB migration, two-school isolation, audit, security and old-feature smoke tests.
- Run recorded FE (web mobile/tablet/desktop), BE (unit, integration, API, concurrency) and NFR (performance, privacy, backfill, reliability) plan. Attach evidence, not just 'PASS'.
- Complete PR review & production release checklist, then mark `DONE` on tracker only when approved and merged.
- Never add Books/Uniform inventory or full exam/attendance module; never implement paid Admit Card Generator without written approval.

## Current implementation claim

**All 32 task specifications and tracker have been committed; zero user-facing application changes were made in this documentation branch.** No application tests were executed as part of preparing this pack; **the task verification cases are planned, not passed**.

## Archive-style initial drafts

- `02-academic-session.md`: initial 6 academic tasks.
- `03-client-feedback.md`: initial 8 DOCX tasks.
- `04-fees.md`: initial 7 fee tasks.
- `05-documents.md`: initial 5 certificate tasks.

Use task-specific docs first; this index resolves the earlier misleading 26-task-only summary.

**Shared technical appendix:** [DLD-SHARED-CONTRACTS.md](DLD-SHARED-CONTRACTS.md) explains per-student fee ledger locking, facade contracts, recommended SQL constraints, financial migrations and safe document-issuance concurrency.
