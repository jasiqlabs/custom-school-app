# School ERP — Corrective Task Tracker

**Branch:** `fix/school-erp-functional-nfr-audit-20261030` · **Reviewed baseline:** `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0`.  
**PRD:** [PRD.md](PRD.md) · **Task-wise DLD:** [DLD.md](DLD.md).  
**Source review update (2026-10-31):** 13 feature workstreams have source changes; FIX-11 now has a Unicode source implementation (DEV_DONE), and the other 12 remain DEV_DONE (source only). FIX-14 is NOT_STARTED (integrated regression and NFR execution). **0/14 have passed real FE/BE/Postgres/worker/NFR QA**. `DEV_DONE` means source changes are committed, **not** that they compile or behave correctly. The developer must fix any issues found during local build/manual verification before review/merge. `main` remains the stable baseline.

**Client defect intake (2026-11-02):** Four additional screenshot-supported issues ERR-01..04 have **source patches committed but no runtime verification**. They map to existing FIX-01, FIX-03 and FIX-06; no separate work packages. Named manual tests and source provenance are in §4. All earlier 14-task statuses and QA evidence remain unchanged.


**Additional main-compatibility fix (fee collection):** In main, viewing a student's dues implicitly assessed current charges. The feature branch correctly removed GET-side writes, but initially left the collector without equivalent in-screen preparation. The Collect Fees student selector and direct student link now use a CSRF-protected, manager-only `POST /operator/fees/dues/student/:studentId/ensure` followed by the unchanged pure-read GET. Inactive students never receive new assessments, existing dues remain accessible if preparation fails, and stale responses cannot replace another student's balances. Source assertions added; FE/BE/DB not tested. **Run newly admitted student → collect fee; historical arrears; no fee config; inactive student; report viewer 403 POST/200 GET; two fast student selections; concurrent assess+collect.**

### Main-branch preservation review — 2026-11-02

**Compared:** `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0` vs this feature branch (branch was 0 commits behind at review). **Three source regressions identified and fixed, source-level only:** (1) REPORT_VIEWER regained the exact read capabilities of main (students, fees, transport, academics, reports, TC and exams) without regaining write permissions; (2) original report-viewer Students/Transport/Exams sidebar links restored; (3) post-payment student profile now retains its successful receipt while financial panels refresh, rather than switching to a full-page loader. **Additional finance-integrity correction:** FEE_PAYMENT_RECORDED audit now writes inside the payment/receipt database transaction, preventing a committed payment followed by a failed audit from returning a misleading failure. Cross-branch review focused on auth/role, web navigation, fee collect/void/report, student lifecycle, transport, year transitions, legacy receipt and TC/admit-card paths, migrations and workers. Source assertions have been added; **no compile, real DB, worker, browser, p95 or external regression suites were executed** in this review. FIX-14 remains NOT_STARTED; main must not be merged until actual BASE-01..16 and test matrix pass.

### Full-stack second-pass source review — 2026-11-02

**Baseline:** latest compared `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0`, feature branch remains ahead/0 behind at time of review. Reviewed touched backend routes/modules, FE state/API contracts, fee transactions, row-lock ordering, year-transition/state machines, import validation, worker/job outbox, Unicode PDFs, API error presentation and additive migrations. **Additional source issues fixed on this same branch:**

- **Routing:** Static Platform Admin `GET /academic-sessions/transitions` was shadowed by `GET /:id`; static route moved first.
- **Academic integrity:** Admission, status, exit, re-admission, class changes and relevant profile edits now obtain a school lock before per-student changes and reject PREPARED/CLOSING year plans. Finalization refuses a count mismatch for newly introduced unplanned source-year students; re-admission refuses historical date overlap.
- **Document jobs:** TC/admit-card issuance + audit + durable job creation now commit together. Outbox background dispatch handles rejected promises without leaking raw errors or crashing the request.
- **Historical money import:** Invalid over-limit `Decimal` values are stored as zero in **ERROR-only preview rows**, never passed to the numeric(12,2) database field; no import is permitted while preview errors exist.
- **Web/NFR:** First-party validation remains actionable instead of becoming generic; protected binary downloads use shared authenticated/timeout-safe errors; India-local date defaults are used for the new import/lifecycle screens. API and worker direct builds now prepare the verified offline fonts.
- **Commit-aftercare:** An already-saved admission, enrollment or profile edit no longer returns a false failure if follow-up fee assessment fails. A safe warning and `feeAssessmentPending` indicator are provided; admission/profile UI tells staff to refresh fees through Collect Fees.

**Static source regression assertions and a focused academic guard Jest spec were added. No actual build, Jest, node static suite, migration, running browser, worker, PDF or integration test was executed in this source review.** This remains **FIX-01..13 DEV_DONE / FIX-14 NOT_STARTED**, not a runtime certification, and there is **no approval to merge `main`** until the local developer records and passes the negative/positive test matrix.

## 1. Single ordered corrective backlog

Each row delivers **Web + Backend + DB + relevant NFR together**. Separate web-only follow-up phases have been eliminated. Tasks with no listed prerequisite may run in parallel. The final task checks integration; it does **not** postpone each preceding task's own tests.

| ID | Task / linked DLD | Priority | Depends on | Findings | Original task references | Area | Status | Acceptance proof |
|---|---|---|---|---|---|---|---|---|
| FIX-01 | [Secure operator roles, viewer data and Transport](DLD.md#fix-01) | P0 | — | SEC-01, SEC-02, SEC-03, SEC-04,WEB-04 | TASK-001/002 | Auth + Web | **DEV_DONE** | viewer write=403, manager retains actions; school IDOR |
| FIX-02 | [Pure-read and scalable fee reports](DLD.md#fix-02) | P0 | FIX-01 | FIN-03, FIN-10, FIN-14,WEB-05 | TASK-002/013/019/026 | Fees + Web | **DEV_DONE** | zero DB writes on GET/export, 500/5k p95 |
| FIX-03 | [Concurrent payments, retry and old arrears](DLD.md#fix-03) | P0 | — | FIN-01, FIN-07, FIN-08, FIN-13,WEB-02, WEB-07 | TASK-013/016/019 | Fees + Web | **DEV_DONE** | 50 concurrent pay attempts, same-key retry one receipt |
| FIX-04 | [Void every allocation and reconcile legacy money](DLD.md#fix-04) | P0 | FIX-03 | FIN-02, FIN-09 | TASK-013/030 | Fees + Web | **DEV_DONE** | 3-charge void, old void, ₹0.00 variance |
| FIX-05 | [Atomic TC and Admit Card fee clearance](DLD.md#fix-05) | P0 | FIX-03, FIX-04 | FIN-04, FIN-05 | TASK-032/035 | Fees + TC + Exam | **DEV_DONE** | 20 simultaneous due/pay/void/issue; no bad issue |
| FIX-06 | [Effective fee eligibility and audited adjustments](DLD.md#fix-06) | P1 | FIX-03, FIX-04 | FIN-06, FIN-08, FIN-11, FIN-12, FIN-15,WEB-04 | TASK-012/014/015/016/017/018/021 | Fees + Student + Web | **DEV_DONE** | correct dates, no charge deletes, tuition disabled respected |
| FIX-07 | [Admission, exit, pass-out and re-admission](DLD.md#fix-07) | P1 | FIX-06 | ACAD-02,WEB-01, WEB-04 | TASK-004/008/009/022/023 | Student + Web | **DEV_DONE** | DRAFT blocked; exit stops future; same UUID returning |
| FIX-08 | [Promotion, year close and crash recovery](DLD.md#fix-08) | P1 | FIX-07 | ACAD-01, ACAD-03 | TASK-007/008/009/024/025 | Academic + Web | **DEV_DONE** | stage first; 5k batch resume; one ACTIVE year |
| FIX-09 | [Historical-year reports, exports and year UI](DLD.md#fix-09) | P1 | FIX-02, FIX-04, FIX-08 | ACAD-03,WEB-05 | TASK-010/019/021/026 | Reports + Web | **DEV_DONE** | old class/debt correct; school/year/cache isolation |
| FIX-10 | [Opening balances and resumable import](DLD.md#fix-10) | P1 | FIX-04, FIX-06 | FIN-12,WEB-06 | TASK-020 | Fees + Import + Web | **DEV_DONE** | 300/5k rows, provenance, no fake receipt |
| FIX-11 | [Receipt numbering, two copies and PDF download](DLD.md#fix-11) | P1 | FIX-04, FIX-06 | DOC-01, DOC-02,WEB-05 | TASK-027/030/031 | Fees + School + Web | **DEV_DONE** | Unicode A4 PDF source ready; historic files unchanged; QA pending |
| FIX-12 | [Versioned TC and operator issue workflow](DLD.md#fix-12) | P1 | FIX-05, FIX-07, FIX-08 | DOC-01 | TASK-028/029/033 | TC + Web | **DEV_DONE** | existing v1 SHA; v2 school codes; viewer denied |
| FIX-13 | [Scalable admit card issuance and truthful UI](DLD.md#fix-13) | P1 | FIX-05 | EXAM-01, EXAM-02,WEB-03 | TASK-034/035 | Exam + Worker + Web | **DEV_DONE** | 500/5k bounded, queued ≠ ready, clearance races |
| FIX-14 | [Integrated regression, migration and NFR sign-off](DLD.md#fix-14) | P1 | FIX-01..13 | OPS-01, OPS-02, OPS-03,WEB-04, WEB-06,SEC-03 | TASK-001..035 | QA + Infra | **NOT_STARTED** | all BASE-01..16, 35 original tasks, restore, perf |

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

## 4. Client-reported defects — Error Drafts.docx, received 2026-11-02

The two-page client Word file includes screenshots. It is external field evidence, **not** evidence of a successful developer reproduction or post-fix verification. All four issues have been assigned to existing FIX tasks; no new backlog task is necessary.

| ID | Reported route / symptom and expected behavior | Severity | Owner FIX | Source / QA state |
|---|---|---|---|---|
| ERR-01 | Page 1: Platform Admin → school → create operator (both roles): PostgreSQL `42883 uuid = text`; operator should be saved once or return an actionable business error. | P0 | FIX-01 | **SOURCE_PATCHED; FE/BE/NFR NOT_TESTED** |
| ERR-02 | Page 1: Platform Admin and Operator login screens: Back may loop to same login page; should go to public `/` on first click. | P2 | FIX-01 | **SOURCE_PATCHED; FE NOT_TESTED** |
| ERR-03 | Page 2: Collect Fees → Record Payment, ₹800 + ₹900 + ₹800: PostgreSQL `42804 school_id UUID vs text`; payment should produce exactly one ₹2,500 receipt with correct allocations. | P0 | FIX-03 | **SOURCE_PATCHED; FE/BE/NFR NOT_TESTED** |
| ERR-04 | Page 2: School user cannot find how to assign Transport Fee; fee setup, active transport service, generation and collection must be discoverable, with correct route/class/year applicability. | P1 | FIX-06 | **SOURCE_PATCHED; FE/BE/NFR NOT_TESTED** |

**Mandatory regression cases:** `ERR-01-FE01/BE01/NFR01`, `ERR-02-FE01`, `ERR-03-FE01/BE01/NFR01`, `ERR-04-FE01/BE01/NFR01`. Detailed reproducible steps, tenant and wrong-role negatives, receipt reconciliation and responsive checks are in [TESTING-AND-RELEASE.md §7a](../school-erp-development-plan/TESTING-AND-RELEASE.md#7a-client-word-file-regression-scenarios-err-0104). All remain **NOT_TESTED** pending developer execution and recorded results. No screenshot alone proves the fix.

**Source patch references:** operator UUID lock `e964952`, receipt sequence UUID `11dc9bd`, old FeeDue UUID `495874a`, transport school UUID `81cc7f3`, login Back `27d917d`, private server-error response `9146bd2`, transport rule matching `2d73e17`, transport UI instructions `67b34e9`, fee setup instructions `4ad739f`. Unit test source was added for operator create, receipt sequences and error-response safety; static regression rules were extended. No live API/Postgres/browser, build, migration or workload runs were executed here.

Add new findings to an existing owning FIX when possible; create a new task only if it is a **genuinely distinct** work package. A source hypothesis is not a runtime PASS or FAIL.


## 4b. Senior cross-cutting NFR review — 2026-11-02

**Source reviewed and patched, but runtime QA has NOT been executed.** These findings belong to existing FIX tasks, not a new tracker. All NFR-ERR-01..07 cases in the [Testing and Release Plan](../school-erp-development-plan/TESTING-AND-RELEASE.md) are mandatory.

| NFR finding | Source defect and implemented correction | Owner | Verification state |
|---|---|---|---|
| NFR-01 | API unhandled exception objects/messages could reveal SQL/Prisma internals in logs or responses. Central boundary now sanitizes code/message, supports field-labelled 422, request ID, and safe DB diagnostic codes. | FIX-01, FIX-14 | SOURCE_PATCHED; NOT_TESTED |
| NFR-02 | Web screens/widgets displayed arbitrary caught exception messages; now use shared user-safe messages. Native error alerts on student profile removed. | FIX-01, FIX-06, FIX-14 | SOURCE_PATCHED; FE NOT_TESTED |
| NFR-03 | No consistent redacted request completion telemetry; now logs status, duration, route template, request ID and error category. | FIX-14 | SOURCE_PATCHED; LOG PRIVACY/LOAD NOT_TESTED |
| NFR-04 | Worker persisted/logged raw error messages; now stores allowlisted job codes, structured stage/retry logs and rethrows safe codes. | FIX-12, FIX-13 | SOURCE_PATCHED; WORKER NOT_TESTED |
| NFR-05 | Branding cache grew without a byte bound; now 32 MiB LRU. | FIX-13, FIX-14 | SOURCE_PATCHED; MEMORY NOT_TESTED |
| NFR-06 | API client had no timeout or coalesced CSRF initialization; now bounded requests, safe network/timeout and concurrent-CSRF handling. | FIX-01, FIX-14 | SOURCE_PATCHED; LIVE RECOVERY NOT_TESTED |
| NFR-07 | Production login UI exposed demo passwords and port/server-log instructions; removed and replaced with friendly errors. | FIX-01 | SOURCE_PATCHED; FE NOT_TESTED |
| NFR-08 | Expected business details for duplicate-school confirmation, readiness and transport conflicts risked being lost; now preserve bounded sanitized nested data and test contracts. | FIX-01, FIX-14 | SOURCE_PATCHED; CONTRACT QA NOT_TESTED |
| NFR-09 | Student Profile payment timeout retry minted a new idempotency key; now retain the intent key, including safe storage-disabled fallback. Collect Fees handles refresh-after-payment separately. | FIX-03 | SOURCE_PATCHED; REAL FINANCE NOT_TESTED |
| NFR-10 | Raw DB errors from startup, per-student admit-card batch failure, export errors and school lifecycle UUID SQL issues; sanitized/corrected. | FIX-01, FIX-03, FIX-13 | SOURCE_PATCHED; API/DB NOT_TESTED |

**Source regression:** The expanded api-exception.filter.spec.ts and new scripts/verify-nfr-errors.test.mjs are wired to qa:corrective-static. Source checks and Jest test code have been added, but not executed locally against the complete project. No CI or GitHub Actions changes.

**NFR-11:** The development operator seed previously supplied a reusable default password and could overwrite existing operator credentials/reactivate a school. It now requires explicit ALLOW_DEV_OPERATOR_SEED=true, OPERATOR_EMAIL and OPERATOR_PASSWORD (12+ chars), fails in NODE_ENV=production, and is create-only. Platform Admin provisioning now logs sanitized failure categories. **SOURCE_PATCHED, local seed/production safety NOT_TESTED; owner FIX-01/FIX-14.**

**Outstanding:** FIX-11 is DEV_DONE at source level, but PDF visual/RTL/text-extraction QA remains NOT_TESTED; FIX-14 NOT_STARTED for actual Web/API/PostgreSQL/worker and NFR verification; no approval to merge into main. Original ERR-01..04 and BASE-01..16 regressions still require real evidence.

### FIX-11 — Unicode rendering source completion (2026-11-02)

Source implemented: pinned OFL Noto build-time font setup with blob-integrity validation; shared A4 renderer with Type0 embedded font and ToUnicode; two-copy receipt and 25 allocations; new TC v2, admit-card and fallback Print/Save as PDF. Existing v1 files stay immutable. Negative paths handle font outage, oversized fields, corrupt branding, memory/page bounds and safe user messages. **No local build, PDF extraction, visual comparison, or real DB/worker/load test has been run.** Record proof only in existing FIX-11/FIX-14 evidence cells; main remains untouched.

## 5. Release gate — FIX-14

- [ ] All P0 security/finance issues resolved; no existing working function lost, including client ERR-01 and ERR-03 verified on real PostgreSQL.
- [ ] 36 findings disposed (fixed, test disproved, or owner-approved deferred) with evidence.
- [ ] All 35 original requirement flows mapped and actually checked; policy/paid-CR blockers documented.
- [ ] Payment balances, allocations, voids, receipt numbers, old TC hashes reconcile exactly (₹0.00 discrepancy).
- [ ] Admission/exit/re-admission, dates, staged year transition, reporting, TC/Admit and import work on real DB.
- [ ] Live FE browser test at 360/768/1366 for touched screens, old paths, role restrictions, downloads and PDFs, including ERR-01..04.
- [ ] 2-tenant security/permission testing; 300–500 and 5k-student workloads; measured p50/p95, queue/job and resource results.
- [ ] Database migration rehearsal on sanitized prior-data clone, backup/restore and safe roll-forward proof.
- [ ] Independent senior sign-off. No merge into `main` or production release merely because the tracker exists.

### Source completion checkpoint — 2026-10-30

**FIX-01–13: DEV_DONE (source committed, not verified).** Source files, tests, Prisma additive migrations, web entry points and API flows have been added/updated in the single feature branch. FIX-11 now includes two-page Office/Student PDF, frozen receipt snapshots and configurable legacy-safe numbering; FIX-12 includes operator TC issue/status/download and a versioned TC school identity snapshot. Existing FIX-01–10 and FIX-13 changes have received further static regression fixes. The historical source details are visible in Git commits and DLD; no additional tracker is needed.

**FIX-14: NOT_STARTED.** This is the local developer's full build, migration rehearsal, real Web/API/Postgres/worker integration and measured NFR/regression sign-off. The branch is **not yet ready for merging into main or production**. A pass is not implied by this source checkpoint.

**Required local verification order:** (1) install and generate Prisma, run migration/static gates and build API/worker/web, fixing type/schema issues; (2) real two-school Postgres migrations plus old-data reconciliation; (3) P0 01–05 auth/fee/TC concurrency and idempotency; (4) 06–13 lifecycle/year-close/import/receipts/TC/exam UI on mobile/tablet/desktop; (5) 500 and 5000-student NFR, worker retries, role privacy and original BASE-01..16; (6) update each FE/BE/NFR evidence cell from NOT_TESTED and obtain code review. No `DONE` until tests/review pass.

**Known verification limitations:** New receipts/TC v2/admit cards use pinned Unicode fonts and an embedded text layer, but real PDF reader rendering, Urdu RTL copying, font build caching, print pagination and p95 timings are NOT_TESTED. Effective-date mid-month class changes fail closed pending fee policy. Performance numbers have not been measured. Existing TCs and historical receipts use backward-compatible rendering/projection paths; verify actual old files/checksums.

### Final source flow trace — 2026-10-31

**Scope checked:** Existing and new operator role/tenant routing; student/admission/status/exit/re-admit and transport; academic-year staging/close; legacy and category fee assessment, collection, void, read-only reports and exports; opening balance import; receipt numbers/PDF; TC v1/v2 and operator issuance; exam/admit card issue/worker; Prisma 0015–0019 migrations and static regression script.

**Source defects found and fixed on this branch during final review:**
- Fee generator could delete unpaid Books/Uniform charges on re-assessment; removed destructive paths, preserving auditable adjustments.
- Non-tuition fees could inherit existing legacy tuition payment balance; now only TUITION mirrors FeeDue, with original paid/base/net snapshots preserved.
- Bulk legacy due generation bypassed student-scoped fee locks and historical eligibility; now delegates to per-student locked generation.
- Legacy single-student due generation was using current class for historical month; now respects effective enrollment/admission and ACTIVE year only.
- Pending report could display current rather than historical class and REPORT_VIEWER could not load safe class labels; corrected effective-month selection and read-only class endpoint.
- Old student status PATCH bypassed enrollment/transport exit and year-transition lock; brought onto locked, date-aware path; new re-admission remains explicit.
- Profile Books/Uniform audit adjustment now keeps base/net/concession consistent.
- Year CLOSE/CLOSING transitions are protected against new student-status and exit writes.
- Expanded source-only regression checks in `npm run qa:corrective-static`.

**NFR-15 — CSRF cache race:** Concurrent security-token refreshes could restore a stale token after logout or a forced retry. A generation counter now invalidates stale completions and coalesces only the current session's request. Source regression assertion added; real concurrent login/logout/CSRF verification remains NOT_TESTED (FIX-01/FIX-14).

**NFR-14 — Account enumeration:** Login on the wrong portal previously revealed whether an email belonged to a Platform Admin or School Operator without verifying the password. Both backend login flows now return ordinary invalid credentials for unknown/wrong-password attempts and show portal guidance only when the other account's password is actually valid. A focused operator-auth Jest regression is added; Platform Admin/Operator real login regressions remain NOT_TESTED (owner FIX-01/FIX-14).

**2026-11-02 final source hardening checkpoint:** Re-reviewed the NFR patches and corrected additional UUID-typed raw SQL in academic sessions/classes/sections, TC, route create/update/reassign/end, and TC/admit-card worker file/audit transactions. Removed operator password hashes from create/update/status API payloads and removed reversible email encodings from operator audit metadata, with source and Jest regressions. Correlation IDs are now server-generated. These are **source commits only**, not runtime-verified. The browser's two-copy A4 Print / Save as PDF now preserves supplied Unicode text (subject to the device's installed fonts), while the original server PDF path **fails visibly with actionable 422 instead of silently substituting question marks**. Server-side Unicode PDF implementation is now committed; visual/RTL/printing QA remains NOT_TESTED. Browser printing, PDF layout, raw-SQL/worker SQL and real transaction tests require local developer execution.

**FIX-11 Unicode source fix:** The active receipt endpoint now renders a Unicode PDF rather than the legacy ASCII-only generator. New TC v2 and admit-card jobs use the shared font-aware PDF writer with pinned build-time Noto fonts, Type0 embedding and ToUnicode mapping. Old generated files remain immutable. Unsupported text in legacy builders now causes a controlled failure instead of replacing student names with '?'. This source is DEV_DONE; real generated PDFs, RTL text extraction and print quality have NOT been tested.
**Unverified / required local acceptance (FIX-14):** No TypeScript builds, Prisma validate/generate/deploy on a real existing-data DB, actual UI/worker runs, money reconciliation, cross-school security tests, p95 load tests or PDF download/render inspections have been executed in this source-only review. Local developer must log actual outcomes, resolve compilation/runtime defects, and re-run original BASE-01..16 and affected TASK-001..035 before any approval to merge.

**Decision:** Ready for a **developer build/test/review handoff with FIX-11 source implemented but not runtime verified**, NOT ready for integration/merge into `main`. The accepted-state definition remains strict: source DEV_DONE is not QA DONE.

### Client-report corrective checkpoint — 2026-11-02

ERR-01 through ERR-04 have source patches committed on this same corrective branch and are mapped above to FIX-01/FIX-03/FIX-06 and the existing FE/BE/NFR test plan. **The respective FIX rows remain DEV_DONE only, FIX-11 is DEV_DONE at source level, and FIX-14 remains NOT_STARTED.** The client-reported failures remain open until real browser/API/Postgres checks pass. The local developer must run `npm run qa:corrective-static`, focused API tests, generated Prisma + API/Web builds, and full two-school end-to-end checks before moving a task to READY_FOR_REVIEW or DONE.

**NFR-ERR-10:** New font-aware PDF source implemented; real font integrity, print, text extraction, two-school and worker load tests NOT_TESTED. See Testing and Release section 7b.
