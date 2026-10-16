# School ERP — Implementation Blueprint & Intern Handoff

**The clean, single engineering plan for extending the existing school product.** It is deliberately organized by technical task/dependency, **not by feedback source or module implementation wave**. UI redesign, backend refactoring and domain architecture corrections are allowed; breaking existing approved functionality is **not**.

**Repo:** `jasiqlabs/custom-school-app` · **Stable code base:** `main` at reviewed SHA `3d5a609f50be88af8366338bc7466316b435bbc1` · **Planning branch:** `feature/academic-session-school-feedback-specs-20261016`. If `main` advances after documentation merge, re-audit affected source files before coding. **No application code or tests changed by this document rewrite.**

## 1. Exactly where to start

**[TASK-TRACKER.md](TASK-TRACKER.md)** is the single source for all **35 ordered tasks**, dependencies, approval gates, assignee, PR, execution and FE/BE/NFR evidence. **All 35 are NOT_STARTED**. Open `tasks/TASK-XXX.md` for the assigned deliverable; it contains business story/use cases, schema+data DLD, API+DTO/role/error DLD, service state algorithm, UI steps, migration, FE/BE/NFR cases and non-regression DoD.

**Mandatory before coding:** read `AGENTS.md`, the latest authoritative approved JASIQ Harness PRD/HLD/stories/UIUX/DLD and the current stable `main` code. These task DLDs are reviewable engineering proposals, **not a claim that conflicting canonical documents are already revised or approved**.

## 2. Other documents, one purpose each

| Document | Why it exists |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | One coherent domain architecture, tenant/role guards, academic lifecycle, ledger/account locking, history and migration patterns |
| [INTERN-RUNBOOK.md](INTERN-RUNBOOK.md) | Intern's exact local start → baseline → FE/BE implementation → QA → reviewer workflow with usable commands |
| [TESTING-AND-RELEASE.md](TESTING-AND-RELEASE.md) | Real FE browser, BE API/DB, NFR/security/load and canary rollout gates |
| [REGRESSION-BASELINE.md](REGRESSION-BASELINE.md) | BASE-01..16 original UI/API/financial/transport/TC workflows that **must not break** |
| [TASK-IMPACT-MATRIX.md](TASK-IMPACT-MATRIX.md) | All 35 tasks mapped to exact current source paths, old-function tests and risk tier |
| [ENGINEERING-REVIEW.md](ENGINEERING-REVIEW.md) | Findings from senior static review: original code risks and mandatory reviewer controls |
| [DECISIONS.md](DECISIONS.md) | Exact product questions still needing approval; no silent guessed fee/session rules |
| [TRACEABILITY.md](TRACEABILITY.md) | Coverage proof for earlier school-year research and received requirements, **not** a second task register |
| [HANDOFF-AGENT.md](HANDOFF-AGENT.md) | Ready-to-use implementation instruction for a local agent/intern after docs merge |

## 3. Rules every task must satisfy

1. **Only explicit predecessors:** task IDs are in dependency order, but lower tasks without a listed dependency can run in parallel. A task is deployable without future functionality, future service or dead button.
2. **Keep old supported behavior:** existing operator/admin login, school/class setup, student admission/import/profile, fee setup/generation/partial payment/void/history, dashboards/exports, transport, TC issue/retry/download and private storage continue after each increment.
3. **Before/after proof:** developer records old screen/API/DB results first, then implements. A changed UI layout is fine; a missing working action, broken contract, wrong money, leaked private data or degraded performance is not.
4. **One domain owner:** School, AcademicSession, Students, Fees, Transport, Documents and Foundation have distinct persistence. Use public ports/facades, not another module's Prisma models. Preserve Student UUID and immutable payment/TC evidence.
5. **Safe migrations:** additive expand → legacy adapter → repeatable shadow backfill → reconcile exactly → tenant-cutover → rollback/roll-forward rehearsal. No production DB reset. Past-year arrears are not duplicate charges.
6. **Actual tests:** task-specific FE on 360/768/1366, BE real database/API/tenant/auth/CSRF/concurrency, and NFR performance/privacy/reliability. The existing web/worker test scripts primarily run static QA, so `npm test` alone is insufficient.
7. **Independent review:** a senior developer reviews all tasks; architect/financial reviewer must sign off on authorization, encryption, academic transitions, ledger/payments/void, sensitive migrations, private documents and fee-clearance concurrency.
8. **Scope:** Books and Uniform are admission fee options only—no separate inventory module. Admit Card Generator is a separately paid CR; no coding until written approval. Don't accidentally build full exam/marks/attendance module.

## 4. Current status and release boundary

**Ready:** Clean per-task engineering documentation and local-agent handoff. **Not ready to claim:** canonical spec amendments fully signed, product-policy answers all resolved, implemented code, run-time FE/BE/NFR tests or verified production rollout. Each task resolves its own specific gate, not a global 35-task freeze.

**Merge boundary:** This is a **documentation-only feature branch**. After the product/architecture owner reviews it, merge only these docs into stable `main`; the merge **does not** change application behavior. Then assign developer TASK-XXX in the tracker and start implementation in a new task-specific branch. Do **not** merge documents automatically before explicit instruction.
