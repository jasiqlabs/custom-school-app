# School ERP — Single Corrective Development & QA Tracker

**Branch:** `fix/school-erp-functional-nfr-audit-20261030` · **Baseline:** `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0` (2026-10-30).  
**PRD:** [PRD.md](PRD.md) · **Detailed DLD:** [DLD.md](DLD.md).  
**Status:** All corrective tasks **NOT_STARTED**; code in baseline `main` is not proof of accepted behavior. Source findings have been reviewed, **live FE/BE/NFR tests are not executed**.

**Scope clarity:** This is the **only issue/fix tracker for the corrective branch**. The pre-existing `docs/school-erp-development-plan/TASK-TRACKER.md` retains the 35 original business tasks' execution/history; update its original task completion evidence **only after** a corrective fix and independent verification. Do not open more competing trackers for each web/backend defect.

## 1. Task status and issue register

Status progression: `NOT_STARTED → IN_PROGRESS → DEV_DONE → QA_IN_PROGRESS → READY_FOR_REVIEW → DONE`; exceptional `BLOCKED`, `QA_FAILED`, `REOPENED`. **DONE is reserved for approved implementation PR, real frontend/backend/NFR evidence, legacy regression and independent reviewer.** P0 must be fixed before production-readiness approval.

| Fix | Priority | Meaningful work package | Source issues | Original tasks | Requires | Work area | Status | Required proof |
|---|---|---|---|---|---|---|---|---|
| [FIX-01](DLD.md#fix-01-authorization-viewer-pii-transport-writes) | **P0** | Authorization, viewer PII, transport writes | SEC-01,SEC-02,SEC-03 | TASK-001/002 | — | API + Web | **NOT_STARTED** | Capability matrix, IDOR/403, old manager paths |
| [FIX-02](DLD.md#fix-02-pure-read-fee-reports-and-batched-assessment) | **P0** | Pure-read fee reports and batched assessment | FIN-03,FIN-10 | TASK-002/013/019/026 | FIX-01 | API + Web | **NOT_STARTED** | DB no-write GET; 500/5k reports |
| [FIX-03](DLD.md#fix-03-locked-fee-posting-and-idempotent-payments) | **P0** | Locked fee posting and idempotent payments | FIN-01,FIN-07,FIN-08 | TASK-013/016/019 | — | API + DB + Web | **NOT_STARTED** | 20/50 pay races; same-key replay + hash |
| [FIX-04](DLD.md#fix-04-multi-charge-payment-void-and-receipt-immutability) | **P0** | Multi-charge payment void and receipt immutability | FIN-02,FIN-09 | TASK-013/030 | FIX-03 | API + DB + Web | **NOT_STARTED** | 3-category void, legacy void, repeated void |
| [FIX-05](DLD.md#fix-05-atomic-fee-clearance-for-tc-and-admit-cards) | **P0** | Atomic fee clearance for TC and Admit Cards | FIN-04,FIN-05 | TASK-032/035 | FIX-03, FIX-04 | API + DB + Worker | **NOT_STARTED** | Concurrent pay/void/charge/issue; no blocked job |
| [FIX-06](DLD.md#fix-06-unified-ledger-reconciliation-and-audited-adjustments) | **P1** | Unified ledger reconciliation and audited adjustments | FIN-06,FIN-08,FIN-09,FIN-12 | TASK-013/015/017/019/021 | FIX-03, FIX-04 | API + DB + Web | **NOT_STARTED** | Books/Uniform revert; ₹0 migration discrepancy |
| [FIX-07](DLD.md#fix-07-admission-class-transport-effective-date-fee-eligibility) | **P1** | Admission/class/transport effective-date fee eligibility | FIN-11,FIN-12 | TASK-014/016/017/018/022 | FIX-03, FIX-06 | API + DB + Web | **NOT_STARTED** | Aug admit, Oct class, Nov bus end, no future due |
| [FIX-08](DLD.md#fix-08-exit-pass-out-and-returning-student-lifecycle) | **P1** | Exit, pass-out and returning student lifecycle | ACAD-02 | TASK-022/023 | FIX-07 | API + DB + Web | **NOT_STARTED** | One student UUID; saga crash/restart |
| [FIX-09](DLD.md#fix-09-staged-promotion-and-safe-year-end-transition) | **P1** | Staged promotion and safe year-end transition | ACAD-01,ACAD-03 | TASK-008/009/024/025 | FIX-08 | API + DB + Web | **NOT_STARTED** | 500/5k staged, chunk crash recovery |
| [FIX-10](DLD.md#fix-10-historical-year-reporting-and-export-consistency) | **P1** | Historical year reporting and export consistency | ACAD-03,WEB-05 | TASK-010/021/026 | FIX-06, FIX-09 | API + Web | **NOT_STARTED** | Origin-year vs collected-as-of totals; exports |
| [FIX-11](DLD.md#fix-11-historical-opening-balance-import-with-provenance) | **P1** | Historical opening balance import with provenance | FIN-12 | TASK-020 | FIX-06 | API + DB + Web | **NOT_STARTED** | 300/5k XLSX; duplicate and resume |
| [FIX-12](DLD.md#fix-12-receipt-and-student-numbering-settings) | **P1** | Receipt and student numbering settings | DOC-02 | TASK-027 | FIX-03 | API + DB + Web | **NOT_STARTED** | 100 parallel series allocations March/April |
| [FIX-13](DLD.md#fix-13-two-copy-immutable-receipts-and-secure-pdf-downloads) | **P1** | Two-copy immutable receipts and secure PDF downloads | DOC-01,WEB-05 | TASK-030/031 | FIX-04, FIX-06 | API + Web + Worker | **NOT_STARTED** | Office+Student A4, old/voided PDF, SHA |
| [FIX-14](DLD.md#fix-14-versioned-tc-and-authorized-operator-issuance) | **P1** | Versioned TC and authorized operator issuance | DOC-01 | TASK-028/029/033 | FIX-05 | API + Web + Worker | **NOT_STARTED** | TC v1 SHA, v2 school codes, role 403 |
| [FIX-15](DLD.md#fix-15-bounded-exam-clearance-and-bulk-admit-card-issuance) | **P1** | Bounded exam clearance and bulk admit card issuance | EXAM-01,EXAM-02 | TASK-034/035 | FIX-05 | API + DB + Worker | **NOT_STARTED** | 5k candidates, worker kill, clearance race |
| [FIX-16](DLD.md#fix-16-school-academic-student-web-flow-corrections) | **P1** | School/academic/student web flow corrections | WEB-01,WEB-04,ACAD-01,ACAD-02 | TASK-003..011/022..025 | FIX-07, FIX-08, FIX-09 | Web + API parity | **NOT_STARTED** | ACTIVE-only admission, new lifecycle, 3 widths |
| [FIX-17](DLD.md#fix-17-fee-setup-collection-report-history-web-parity) | **P1** | Fee setup/collection/report/history web parity | WEB-02,WEB-04,WEB-05,FIN-03 | TASK-012..021/030..031 | FIX-02, FIX-03, FIX-04, FIX-06, FIX-13 | Web + API parity | **NOT_STARTED** | Lost response retry→one receipt; print/history |
| [FIX-18](DLD.md#fix-18-report-viewer-transport-and-import-web-parity) | **P1** | Report-viewer, transport and import web parity | WEB-04,WEB-06,SEC-01,SEC-02 | TASK-001/002/004/018/026 | FIX-01, FIX-02, FIX-10 | Web + API parity | **NOT_STARTED** | Viewer 403, report links, real XLSX download |
| [FIX-19](DLD.md#fix-19-exam-tc-receipt-web-status-and-recovery-states) | **P1** | Exam/TC/receipt web status and recovery states | WEB-03,WEB-04,EXAM-02,DOC-01 | TASK-029..035 | FIX-14, FIX-15 | Web + Worker | **NOT_STARTED** | Queued is not Ready, retry/permission/TTL |
| [FIX-20](DLD.md#fix-20-migration-worker-performance-and-observability-hardening) | **P1** | Migration, worker, performance and observability hardening | OPS-01,OPS-02,OPS-03,EXAM-01,FIN-10 | TASK-007..035 | FIX-02, FIX-03, FIX-06, FIX-09, FIX-15 | Infra + DB + API + Web | **NOT_STARTED** | Staging migration, 5k load, p95, queue, restore |
| [FIX-21](DLD.md#fix-21-full-35-task-regression-and-fe-be-nfr-release-gate) | **P1** | Full 35-task regression and FE/BE/NFR release gate | ALL | TASK-001..035 | FIX-01..20 | All | **NOT_STARTED** | BASE-01..16 and 35 task proofs; signoff |

## 2. Issue accounting and completeness

- **31 first-pass source-identified issues** in PRD: SEC 3, FIN 12, ACAD 3, WEB 6, DOC 2, EXAM 2, OPS 3.
- **21 corrective work packages:** 5 P0 and 16 P1. Each work package deliberately groups closely coupled FE/BE/DB/NFR defects, not one ticket per tiny screenshot or code line.
- Every referenced issue in the [PRD evidence table](PRD.md) must map to at least one row above. Every original TASK-001..035 is covered by the original-task ranges and integrated FIX-21 test gate.
- The DLD task section is authoritative for model, port/API, page flow, retries, migration and task-specific tests. This tracker is authoritative only for execution state/evidence.
- This is a **source audit, not an exhaustive dynamic bug discovery guarantee**. If local runtime testing uncovers a new issue, add a concise `ISS-NEW-XX` line below with reproducible steps and owner FIX ID. Use a new FIX task ID only for truly separate major architectural work; keep 21 meaningful tasks unless approved to change scope.

## 3. Mandatory intern workflow per corrective FIX

1. `git fetch origin && git switch main && git pull --ff-only origin main`; verify main commit and clean worktree. Create implementation branch `fix/school-erp-fix-XX-short-name` (don't commit application source directly on main or the documentation branch).
2. Read [PRD](PRD.md), the assigned detailed [DLD](DLD.md), the relevant [original TASK specification](../school-erp-development-plan/tasks/) and [BASE regression cases](../school-erp-development-plan/REGRESSION-BASELINE.md). Confirm predecessor FIX tasks **DONE**, and resolved original policy/paid-CR gates as applicable. If blocked, record exact decision, not invented defaults.
3. Inspect the exact existing source listed in DLD (not assumed), record baseline UI screenshots at 360/768/1366, old API responses and DB counts/₹ totals using School A & B sanitized fixtures. Capture before-state for all affected existing functionality.
4. Make a small, reviewed implementation plan, including changed contracts, tenant/role guard, additive Prisma migration, outbox/transaction ordering, idempotency and rollback. Early commits after meaningful source + focused tests. No forward-FIX dependencies.
5. Run **FIX-XX-FE01** in actual browser, **FIX-XX-BE01** through real Nest/Postgres and tenant negative cases, **FIX-XX-NFR01** with measured workload/time/SQL/memory/queue, and the original impacted BASE-XX and TASK tests. Unit mocks and `npm test` alone do not count as browser/integration evidence.
6. On failure mark `QA_FAILED` with reproduction and fix in same branch. Do not delete old tests, bypass guards, reset DB, weaken money validation or hide broken functionality.
7. Add result log in Section 4 (or PR-linked evidence) and change row state. Independent senior/architecture reviewer required for auth, ledger, TC, exam clearance, academic rollover, migration and private files. Only reviewer marks DONE after approved integration into intended stable base.

## 4. Task execution evidence log (fill as development progresses)

| Fix | Owner | Started / branch | Source commit / PR | FE real-browser result | BE real DB/API result | NFR p50/p95/security/recovery | BASE + 35-task regressions | Review / disposition |
|---|---|---|---|---|---|---|---|---|
| FIX-01 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-02 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-03 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-04 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-05 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-06 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-07 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-08 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-09 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-10 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-11 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-12 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-13 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-14 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-15 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-16 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-17 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-18 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-19 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-20 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-21 | — | — | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |

For every completed task, link actual artifacts rather than write 'all passed'. Capture:
```text
FIX ID + issue IDs + original TASK IDs + named reviewer:
Approved policy/canonical spec/paid-CR scope:
Baseline main SHA / work branch / PR + incremental commit SHAs:
Existing UI/API/DB source inspected and before-state:
Exact fixes, DTO/Prisma migration/feature flag/old-client adapter:
FIX-XX-FE01: steps, viewport, screenshot, observed vs expected, PASS/FAIL:
FIX-XX-BE01: real API/Postgres + wrong-role/cross-school/CSRF cases:
FIX-XX-NFR01: fixture, machine, p50/p95, SQL EXPLAIN, memory, queue/worker:
BASE-XX unchanged working flows, before/after money/receipt/TC checksum:
Deployment/migration history, backup/restore, safe roll-forward evidence:
Unresolved P0/P1 / reviewer outcome / approved merge SHA:
```

## 5. New runtime defect intake

| Defect ID | Affected UI/API/DB | Reproduction (user + tenant + request + actual/expected) | Severity | Assigned FIX | Status |
|---|---|---|---|---|---|
| — | No runtime findings logged yet | Tests not yet run; do not substitute theoretical findings for execution | — | — | NOT_TESTED |

## 6. Release checklist (FIX-21)

- [ ] All applicable policies in original `DECISIONS.md` approved and paid Admit Card CR decision explicitly recorded.
- [ ] All P0 source defects fixed and tested with negative/concurrency cases; no P0 unresolved.
- [ ] Every P1 requirement completed or explicitly deferred/accepted by product owner with user-impact note; no silent omissions.
- [ ] Every screen in PRD route matrix tested as manager/viewer/Platform Admin where applicable at mobile/tablet/desktop; flows actually work.
- [ ] Real database accounting reconciliation ₹0.00 discrepancy, same-day void, stale/duplicate payment/clearance race tests pass.
- [ ] Academic transition, return, historic mapping and external opening-balance import verified on sizable datasets.
- [ ] Past issued payment receipts and TC v1 SHA untouched; new PDFs secured and worker resumption succeeds.
- [ ] 10–12 schools 300–500 students normal, 5k stress, p95 and load numbers attached; indexes/locks/queue documented.
- [ ] PostgreSQL migrations against clone, rollback/roll-forward/backup restore evidence; no drift or production reset.
- [ ] Reviewer explicitly signs off original 35-task coverage matrix and determines whether corrective PR can merge to main.

**Handoff to developer:** Pull latest main, read only these three files plus the original task specs and regression baseline. Start FIX-01 and FIX-03 on independent branches, then proceed by listed prerequisites. Do **not** claim these fixes were implemented by creating this tracker.
