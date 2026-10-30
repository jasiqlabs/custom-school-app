# School ERP — Corrective Task Tracker

**Branch:** `fix/school-erp-functional-nfr-audit-20261030` · **Reviewed baseline:** `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0`.  
**PRD:** [PRD.md](PRD.md) · **Task-wise DLD:** [DLD.md](DLD.md).  
**Implementation state:** **0/14 developed or tested on this fix branch.** Existing code in `main` is the *baseline*, not a completed corrective fix.

## 1. Single ordered corrective backlog

Each row delivers **Web + Backend + DB + relevant NFR together**. Separate web-only follow-up phases have been eliminated. Tasks with no listed prerequisite may run in parallel. The final task checks integration; it does **not** postpone each preceding task's own tests.

| ID | Task / linked DLD | Priority | Depends on | Findings | Original task references | Area | Status | Acceptance proof |
|---|---|---|---|---|---|---|---|---|
| FIX-01 | [Secure operator roles, viewer data and Transport](DLD.md#fix-01---secure-operator-roles-viewer-data-and-transport) | P0 | — | SEC-01/02/03/04,WEB-04 | TASK-001/002 | Auth + Web | **NOT_STARTED** | viewer write=403, manager retains actions; school IDOR |
| FIX-02 | [Pure-read and scalable fee reports](DLD.md#fix-02---pure-read-and-scalable-fee-reports) | P0 | FIX-01 | FIN-03/10/14,WEB-05 | TASK-002/013/019/026 | Fees + Web | **NOT_STARTED** | zero DB writes on GET/export, 500/5k p95 |
| FIX-03 | [Concurrent payments, retry and old arrears](DLD.md#fix-03---concurrent-payments-retry-and-old-arrears) | P0 | — | FIN-01/07/08/13,WEB-02/07 | TASK-013/016/019 | Fees + Web | **NOT_STARTED** | 50 concurrent pay attempts, same-key retry one receipt |
| FIX-04 | [Void every allocation and reconcile legacy money](DLD.md#fix-04---void-every-allocation-and-reconcile-legacy-money) | P0 | FIX-03 | FIN-02/09 | TASK-013/030 | Fees + Web | **NOT_STARTED** | 3-charge void, old void, ₹0.00 variance |
| FIX-05 | [Atomic TC and Admit Card fee clearance](DLD.md#fix-05---atomic-tc-and-admit-card-fee-clearance) | P0 | FIX-03, FIX-04 | FIN-04/05 | TASK-032/035 | Fees + TC + Exam | **NOT_STARTED** | 20 simultaneous due/pay/void/issue; no bad issue |
| FIX-06 | [Effective fee eligibility and audited adjustments](DLD.md#fix-06---effective-fee-eligibility-and-audited-adjustments) | P1 | FIX-03, FIX-04 | FIN-06/08/11/12/15,WEB-04 | TASK-012/014/015/016/017/018/021 | Fees + Student + Web | **NOT_STARTED** | correct dates, no charge deletes, tuition disabled respected |
| FIX-07 | [Admission, exit, pass-out and re-admission](DLD.md#fix-07---admission-exit-pass-out-and-re-admission) | P1 | FIX-06 | ACAD-02,WEB-01/04 | TASK-004/008/009/022/023 | Student + Web | **NOT_STARTED** | DRAFT blocked; exit stops future; same UUID returning |
| FIX-08 | [Promotion, year close and crash recovery](DLD.md#fix-08---promotion-year-close-and-crash-recovery) | P1 | FIX-07 | ACAD-01/03 | TASK-007/008/009/024/025 | Academic + Web | **NOT_STARTED** | stage first; 5k batch resume; one ACTIVE year |
| FIX-09 | [Historical-year reports, exports and year UI](DLD.md#fix-09---historical-year-reports-exports-and-year-ui) | P1 | FIX-02, FIX-04, FIX-08 | ACAD-03,WEB-05 | TASK-010/019/021/026 | Reports + Web | **NOT_STARTED** | old class/debt correct; school/year/cache isolation |
| FIX-10 | [Opening balances and resumable import](DLD.md#fix-10---opening-balances-and-resumable-import) | P1 | FIX-04, FIX-06 | FIN-12,WEB-06 | TASK-020 | Fees + Import + Web | **NOT_STARTED** | 300/5k rows, provenance, no fake receipt |
| FIX-11 | [Receipt numbering, two copies and PDF download](DLD.md#fix-11---receipt-numbering-two-copies-and-pdf-download) | P1 | FIX-04, FIX-06 | DOC-01/02,WEB-05 | TASK-027/030/031 | Fees + School + Web | **NOT_STARTED** | old receipt unchanged; A4 copies and secure PDF |
| FIX-12 | [Versioned TC and operator issue workflow](DLD.md#fix-12---versioned-tc-and-operator-issue-workflow) | P1 | FIX-05, FIX-07, FIX-08 | DOC-01 | TASK-028/029/033 | TC + Web | **NOT_STARTED** | existing v1 SHA; v2 school codes; viewer denied |
| FIX-13 | [Scalable admit card issuance and truthful UI](DLD.md#fix-13---scalable-admit-card-issuance-and-truthful-ui) | P1 | FIX-05 | EXAM-01/02,WEB-03 | TASK-034/035 | Exam + Worker + Web | **NOT_STARTED** | 500/5k bounded, queued ≠ ready, clearance races |
| FIX-14 | [Integrated regression, migration and NFR sign-off](DLD.md#fix-14---integrated-regression-migration-and-nfr-sign-off) | P1 | FIX-01..13 | OPS-01/02/03,WEB-04/06,SEC-03 | TASK-001..035 | QA + Infra | **NOT_STARTED** | all BASE-01..16, 35 original tasks, restore, perf |

**Scope:** 14 tasks, including **5 P0** and 9 P1. The original 35 requirements remain covered in their own tracker and are **not being replaced**. Each of the **36 static review findings** is mapped above; a finding may belong to more than one task when the web/API or ledger/permission boundaries meet.

## 2. How a task is developed and accepted

1. Read its DLD section and applicable original task spec; inspect actual current `main` source. Confirm owner-approved policies/paid change request where required. Do **not** silently expand scope.
2. Set `IN_PROGRESS`, record developer, feature branch and base SHA. Use small commits; application code must be implemented in a separate task branch from stable `main`, not directly in this documentation branch.
3. Before editing, capture old supported workflow: FE screenshots and URL at 360/768/1366, backend HTTP/DB behavior, school A/B records, balances and old receipt/TC checksums. Compare after implementation.
4. Run task's `FIX-XX-FE01` **real browser** case, `FIX-XX-BE01` **real API/Postgres** case, `FIX-XX-NFR01` measured security/concurrency/performance/recovery case, plus impacted [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and original task tests. Existing web/worker static QA alone does not prove UI or async correctness.
5. Update row to `DEV_DONE → QA_IN_PROGRESS → READY_FOR_REVIEW`; if a test fails, set `QA_FAILED` with reproduction and fix it on the same branch. Senior review required for money, tenant roles, migration, year close, TC/private files. Only after reviewed integration can state become `DONE`.
6. Update the original 35-task tracker *only for original task acceptance evidence* after confirmation. **Do not create another tracker** or change another task's completion state by assumption.

Allowed states: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DEV_DONE`, `QA_IN_PROGRESS`, `QA_FAILED`, `READY_FOR_REVIEW`, `DONE`.

## 3. Actual test evidence / developer log

Fill this table progressively, with commands, URLs and results linked in PR rather than writing unexplained “PASS”.

| FIX | Developer / PR / SHA | FE case and before/after screenshots | BE API/Postgres + tenant negative | NFR numbers / race / recovery | Old-flow regression + reviewer |
|---|---|---|---|---|---|
| FIX-01 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-02 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-03 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-04 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-05 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-06 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-07 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-08 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-09 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-10 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-11 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-12 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-13 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |
| FIX-14 | — | NOT_TESTED | NOT_TESTED | NOT_TESTED | NOT_REVIEWED |

**Evidence required per FIX:** base commit, exact changed files, old/new API contract, schema/migration/rollback, FE screenshots at 3 widths, API/status/DB logs using synthetic data, financial reconciliation or file SHA as relevant, p50/p95 and load conditions where relevant, security role/cross-school/CSRF negative cases, tests actually run and independent reviewer.

## 4. Newly discovered runtime defects

| ID | Reproduction (route, school/role, actual vs expected) | Severity | Owner FIX | State |
|---|---|---|---|---|
| — | No live runtime audit executed for this document revision | — | — | NOT_TESTED |

Add new findings to an existing owning FIX when possible; create a new task only if it is a **genuinely distinct** work package. A source hypothesis is not a runtime PASS or FAIL.

## 5. Release gate — FIX-14

- [ ] All P0 security/finance issues resolved; no existing working function lost.
- [ ] 36 findings disposed (fixed, test disproved, or owner-approved deferred) with evidence.
- [ ] All 35 original requirement flows mapped and actually checked; policy/paid-CR blockers documented.
- [ ] Payment balances, allocations, voids, receipt numbers, old TC hashes reconcile exactly (₹0.00 discrepancy).
- [ ] Admission/exit/re-admission, dates, staged year transition, reporting, TC/Admit and import work on real DB.
- [ ] Live FE browser test at 360/768/1366 for touched screens, old paths, role restrictions, downloads and PDFs.
- [ ] 2-tenant security/permission testing; 300–500 and 5k-student workloads; measured p50/p95, queue/job and resource results.
- [ ] Database migration rehearsal on sanitized prior-data clone, backup/restore and safe roll-forward proof.
- [ ] Independent senior sign-off. No merge into `main` or production release merely because the tracker exists.
