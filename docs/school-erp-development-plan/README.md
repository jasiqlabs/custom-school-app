# School ERP — Ordered Development Implementation Plan

**Purpose:** One engineering-oriented delivery plan for safely adding new functionality on top of a working multi-tenant school ERP. Requirements are **not categorized by who requested them**; every deliverable is a concrete engineering task with a lower-ID-only dependency graph. The approved `main` application is the stable functional baseline.

**Repo:** `jasiqlabs/custom-school-app`; **planning branch:** `feature/academic-session-school-feedback-specs-20261016`; **initial base SHA:** `3d5a609f50be88af8366338bc7466316b435bbc1`.

## How to use this package

1. **[TASK-TRACKER.md](TASK-TRACKER.md)** — the **only** authoritative live execution tracker: 35 ordered tasks, predecessor IDs, owners, approvals, status, developer, PR/test evidence.
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — target ownership, domain facades, schema design, financial ledger correctness, workflow and failure/recovery patterns.
3. **[tasks/](tasks/)** — 35 task-specific briefs, one ID per task, with detailed user story, real-world use cases, design/DTO/API/persistence/UX, safety constraints and **FE+BE+NFR** test plan.
4. **[TESTING-AND-RELEASE.md](TESTING-AND-RELEASE.md)** — matrix for dependency-gated QA, financial reconciliation, historical migration, concurrency, privacy and release.
5. **[TRACEABILITY.md](TRACEABILITY.md)** — source coverage; maps every earlier academic research question and prior task to the new engineering task(s), solely for traceability (not a workstream/group).
6. **[DECISIONS.md](DECISIONS.md)** — unanswered policies and original approved-spec conflicts that must be cleared independently of technical dependencies.

## Architectural delivery principles

- **One flat sequence.** IDs TASK-001..TASK-035 are ordered so every task depends **only on earlier** numbers. No task may require a future task to compile, deploy safely or preserve original features.
- **Prerequisite-driven, not serial-by-default.** A task can start after its explicit predecessors are DONE and policy/approval gate cleared, even if unrelated earlier IDs are still in progress.
- **Deployable increments.** Schema expand, adapters, shadow reads, controlled backfill, reconciliation, feature-toggle cutover, and eventual cleanup. Every task must leave old functional paths working independently.
- **Single source of truth by aggregate.** School owns school profile, Academics owns year, Students owns enrollment/exit, Fees owns charges/payments, Transport owns assignments, Documents owns issue snapshots. Use public ports/facades, not another module's Prisma models.
- **Audited financial facts.** Arrears are statements, not duplicated bills. Closed-year collections append a payment against old obligations; never rewrite historical snapshots. One receipt can allocate to several charges exactly once.
- **Tenant and capability safety.** School scoped from auth context; role checked server-side including reports/downloads/jobs; protect Aadhaar and private files.
- **No hidden scope expansion.** Books/uniform only billed as fees, no inventory. Admit Cards are a separately approved paid change, not a full exam/marks module.

## Critical approval limitation

The prior academic-session PDF is a **10-item clarification note**; its last-page choices are **not checked**. The currently approved JASIQ Harness PRD v2.0.0 treats Aadhaar as mandatory, TC as a platform-admin capability, monthly-only fees, and automatic academic-year rollover / exams as outside original MVP. These proposed additions require human decisions, canonical PRD/HLD revision and `/jasiq-planning` revision → `/jasiq-stories` → `/jasiq-uiux` → `/jasiq-dld` approval. This working plan is **not an automatically approved canonical DLD**.

**Current status:** Documentation preparation only; no code modifications, QA execution or merges into `main`.
