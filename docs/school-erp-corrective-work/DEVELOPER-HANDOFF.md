# School ERP — Developer Handoff: Build, Test, Fix and Merge

**Repo:** `jasiqlabs/custom-school-app`  
**Working branch:** `fix/school-erp-functional-nfr-audit-20261030`  
**Stable comparison:** `main` (reviewed base `519d60b9769fc5183e6cdbf9728739330ec8cdb0`; refresh main before final merge)  
**Handoff date:** 2 November 2026  
**State:** FIX-01..FIX-13 **DEV_DONE (source only)**; FIX-14 **NOT_STARTED / integration QA pending**. No local build, live Web/API/Postgres/worker test, migration, PDF render or performance verification has been claimed.

## 1. Assignment and non-negotiable rules

Take **this branch only**. Build and run the complete product locally, test all new and existing scenarios listed below, fix source/runtime problems on the **same feature branch**, commit each fix, re-test affected flows and then merge to `main` **only when the release gate in §7 is fully satisfied**. Do not merge just because source changes are marked DEV_DONE. Do **not** add/configure CI or GitHub Actions.

**One source of truth for evidence/status:** [TASK-TRACKER.md](TASK-TRACKER.md). Use its FIX-01..FIX-14 evidence table. Do not create a second tracker. Follow the detailed acceptance cases and business rules in:
- [Corrective PRD](PRD.md), [DLD](DLD.md) and [TESTING-AND-RELEASE](../school-erp-development-plan/TESTING-AND-RELEASE.md)
- [BASE-01..BASE-16](../school-erp-development-plan/REGRESSION-BASELINE.md), [task impact matrix](../school-erp-development-plan/TASK-IMPACT-MATRIX.md) and **all 35** `docs/school-erp-development-plan/tasks/TASK-001.md` ... `TASK-035.md`
- Client screenshot defects **ERR-01..ERR-04** and error/logging tests in the corrective tracker and Testing and Release §§7a–7b

If a scenario contradicts an approved product policy, document the conflict and get product review. Never silently remove an existing workflow, relax security, delete historic records or weaken assertions to make tests pass.

## 2. Clean checkout and build — record every command and its output

```bash
git fetch origin
git switch fix/school-erp-functional-nfr-audit-20261030
git pull --ff-only origin fix/school-erp-functional-nfr-audit-20261030
git status --short
git rev-parse HEAD
node --version
npm --version

# Use the repository's checked-in lockfile if present.
npm ci --include=dev
npm run prepare:pdf-fonts
npm run prisma:generate
npm run qa:corrective-static
npm run qa:static
npm run qa:release-migrations
npm --workspace apps/api test -- --runInBand
npm test
npm run build
# Direct builds also must pass:
npm --workspace apps/api run build
npm --workspace apps/worker run build
npm --workspace apps/web run build
git diff --check
```

If no compatible lockfile is present, **do not force npm ci**; first resolve the installation approach against committed repo conventions, documenting the dependency changes. Use the project's approved Node/npm versions (the current hosting reference uses Node 24.21.0; verify package and runtime compatibility). Inspect the actual scripts before execution.

Set up **isolated, non-production** PostgreSQL, Redis, file storage and environment variables as specified in the repo, using fresh disposable credentials. Start **API, Web and worker** using the existing package scripts. Verify API health, both logins, DB connection, queue consumption, private file storage and PDF font preparation. Run `prisma validate`/generate and migrate **a copied existing-data database** first. Capture migrations, row counts, migration history, any lock/failure and restore or safe roll-forward evidence. Never execute destructive reset or unreviewed seed on production or client data.

Note: `apps/web test` and `apps/worker test` include static checks, **not** actual UI/queue integration. Run real browser, API/Postgres, job and document tests separately. Pin commit, Node/npm versions, env (no secrets), DB snapshot and results in the single tracker.

## 3. Data to prepare before manual testing

Create **two isolated schools**, A and B, with distinct logos, classes, operators, students, financial data and access sessions. Give A a **MANAGER** and a **REPORT_VIEWER**; include a Platform Admin, invalid/deactivated operators and an inactive school. Never use real PII or production passwords.

Prepare:
1. Students: new admission, missing optional Aadhaar, same-name/different-parent records, inactive/left student, returning student, class/section change, long Hindi/Urdu names, large search population. Keep school/student IDs stable.
2. Academics: ACTIVE year **2026–27**, DRAFT year **2027–28**, 3+ classes and sections, promotion/repeat/pass-out/leave decisions, conflicting enrollment changes and 500 / 5,000 staged candidates.
3. Fees: tuition on/off; concession % and fixed; 1-, 2- and 3-charge dues; partial/full/voided payments; 2+ periods including a previous academic year; paid and pending old arrears; admission/books/uniform/registration/exam/other categories as applicable; both school-wide and route/class/year transport rules. Use amounts **₹800 + ₹900 + ₹800 = ₹2,500** for the reported multi-line case.
4. Transport: two routes, multiple stoppages, active/end/reassign windows, student transport required/not required, route-scoped fee rules and 500-student generation.
5. Files: logo, signature, existing **completed TC v1** and receipt PDFs with SHA256 baseline, failed/queued jobs, valid/invalid images, Hindi/Urdu/Arabic text, 25-line receipt and long addresses.
6. Imports: official XLSX/CSV templates; a valid 300-row file, a 5,000-row file, duplicate student/source rows, malformed header, wrong school codes, invalid amount/date/CSV quoting, mixed `DUE` and `EXTERNAL_PAID` rows. Use the Opening Balances screen to download the five-column template. Original EXTERNAL_PAID rows must remain references, **not fabricated application receipts**.

Keep before/after counts, API payload samples, ledger totals and document hashes; store only sanitized test evidence.

## 4. Mandatory functional and integration test matrix

For **each row**, test a happy path, empty/invalid data, a conflict/retry, permission denial, cross-school ID, browser reload/back, mobile/tablet/desktop where relevant, and the corresponding exact cases in DLD/TESTING-AND-RELEASE. Confirm database state, audit record and user-readable result; do not accept a screenshot alone.

| Task | Execute in the running app / API / database | Expected decisive result |
|---|---|---|
| **FIX-01 — roles and secure flows** | Platform Admin create/update/reset/deactivate MANAGER and REPORT_VIEWER in both schools; logout, session invalidation, CSRF, direct URL and wrong-tenant requests; viewer browse dashboard/students/fees/transport/academics/exams/TC. | Manager's old functions still work; viewer's main-branch read routes and sidebar links remain, writes denied 403; no IDOR, credential leak or forced account reactivation. |
| **FIX-02 — reports** | Pending fees, dashboard, class/period reports, XLSX export, viewer export with permitted scope, repeatedly call GET/report endpoints. | **Zero writes during GET/read-only reports**; totals consistent; correct school+role+year filter; XLSX safe against formula injection. |
| **FIX-03 — payments** | New student > Collect Fees, profile payment, full/partial, three allocations, wrong amount, timeout after commit, same-key retry after reload, concurrent collectors (20/50 attempts); switch selected students while fee requests run. | Exactly one booked payment/receipt for same intent, no overpayment or stale-student amounts; successful receipt stays visible even if balance refresh fails; audit/receipt/payment atomic. |
| **FIX-04 — voids** | Void multi-allocation payment and old payment; repeat void, wrong day/role, failure during rollback, compare historical receipt and report. | Every allocation restored exactly once, no money loss, history immutable, **₹0.00** unexplained variance. |
| **FIX-05 — fee clearance** | Try TC and admit-card issuance with arrears; race pay/void/due generation with issue (20 concurrent), then clear and retry. | Server checks under lock; **no document issued with pending eligible fees**; cleared cases queue exactly once. |
| **FIX-06 — fee eligibility** | Configure categories/rules/concessions, tuition disabled, transport route/class/year, fees before/after admission/exit, midmonth changes, reassessment. | Only eligible, correctly dated charges; no duplicate source keys, no deleted paid history; transport fee discoverable via Fee Setup and Collect. |
| **FIX-07 — student lifecycle** | Admit, edit, exit/pass-out, inactive arrears, re-admit same person/year, wrong DRAFT year, duplicate name/ID, old class histories. Force fee-assessment outage just after successful admission/edit. | Same Student UUID, new dated enrollment, no overlap; preserved debt and prior records; successful student operation **must not show as failed**; actionable fee-pending notice. |
| **FIX-08 — year transition** | Plan 500 and 5,000 students; stage PROMOTE/REPEAT/PASS_OUT/LEAVE, prepare/process batches/finalize, interrupt/resume, retry, edit/add/exit student during PREPARED/CLOSING, mismatch counts, two concurrent finalizers. | One ACTIVE year, no half-visible switch or forgotten students; conflicting edits rejected; resumable batch with audit; no duplicate active enrollments. |
| **FIX-09 — historical reports** | Search/report old years before and after transition; past class/section, arrears, concessions, receipts, viewer and school B. | Old-year rows and original period/identity retained; correct totals; no cross-year/school cache leakage. |
| **FIX-10 — opening balances** | Download template; preview/import valid 300 and 5k rows; errors CSV, duplicate import, bad quoted CSV, huge/negative/over-precision INR, wrong-school IDs, crash/resume 50-row chunks. | Bad preview cannot import; valid rows imported once with provenance; EXTERNAL_PAID never becomes a new payment; error CSV escapes spreadsheet formulas. |
| **FIX-11 — receipts/PDF** | New and old number sequences; multi-line receipt, two-copy Office/Student print, new Unicode server PDF, frozen snapshot after school profile edits, page overflow and unavailable fonts. | No duplicate/changed historic numbers; exactly two copies; Devanagari/Urdu/Arabic renders and extracts correctly; readable A4, no silent `?` substitution. |
| **FIX-12 — TC** | Platform and operator issuance, authorization, logo/principal/signature, v1 re-download SHA, v2 school identifiers, failed worker/retry, private URL wrong school. | Old v1 **byte hash unchanged**; v2 frozen and legible; states QUEUED/FAILED/COMPLETED honest; only authorized school can read. |
| **FIX-13 — admit cards** | READY exam, correct class/year/student, pending-fee blocks, mixed bulk response, 500/5k selection, retry failed issue, worker crash/restart, long/multilingual names. | Queued is **not** shown as ready; issue idempotent; no stale fee-clearance bypass; correct PDF access and bounded memory/queue. |
| **FIX-14 — integration** | Re-run all rows above, **BASE-01..16** and original **TASK-001..035** required FE/BE/NFR cases, deployment/migration/recovery/security/load checks below. | Full independent evidence, no unapproved regression or high-risk unknown. |

### Existing-product baseline — explicitly run all 16

- [ ] **BASE-01..04:** Public landing; Admin/Operator login/logout; Platform Admin schools and state changes; class/section CRUD; operator management and password reset.
- [ ] **BASE-05..08:** Operator dashboard; admission and ID suggestion; student directory/search/profile/edit; XLSX student import and error recovery.
- [ ] **BASE-09..12:** Monthly fee setup/dues; full/partial payment; history/receipt/void; pending report, download and dashboard reconciliation.
- [ ] **BASE-13..16:** Transport/stoppages/assignments; Platform TC issue/list/download/retry; branding/private file upload; authentication, privacy, CSRF, audit and tenant isolation.

Also execute every original task's recorded `TASK-XXX-FE`, `TASK-XXX-BE`, `TASK-XXX-NFR` acceptance steps for **TASK-001 through TASK-035**; use the task-impact matrix to select all affected BASE cases. Log actual outcomes, not just "tested."

### Reported Word-file defects — must reproduce and verify

- [ ] **ERR-01 P0:** Create MANAGER and REPORT_VIEWER; no PostgreSQL **42883 uuid=text** error, correct duplicate email/inactive school handling; 20 concurrent same-email attempts produce one account.
- [ ] **ERR-02:** From both login pages, **Back returns home in one click**, without login loops; direct links and logout unaffected.
- [ ] **ERR-03 P0:** Collect **₹800 + ₹900 + ₹800**, submit and re-open receipt; no PostgreSQL **42804 UUID/text** error, one ₹2,500 receipt, three correct allocations, idempotent retry and void.
- [ ] **ERR-04:** Staff can configure and see **TRANSPORT** fees using valid route/stoppage assignment and category/rule; correct eligibility, no double charges or cross-route/month application.

## 5. Error-handling, logging, privacy, PDF and nonfunctional tests

- **All user-visible screens:** 360/768/1366 px; keyboard, labels, responsive layout, slow/offline network, empty/no-access state, duplicate submit, 401/403/404/409/422/429/500/503, timeout and CSRF retry. Messages should explain what happened and what to do; no raw Prisma, SQL, stack, UUID casting, secret, technical pop-up or false success/failure. Required-field messages must identify relevant fields. Verify login non-enumeration and approved branding.
- **Security:** MANAGER vs REPORT_VIEWER vs Platform Admin; wrong school UUIDs across **students, payments, documents, jobs, exports and signed files**; session downgrade/revoke; mutation CSRF; audit log sanitization; seed requires explicit dev flag and must refuse production. Never log passwords, email/phone, addresses, names, Aadhaar, queries, cookies, JWT, DB SQL or exception text. Correlate safe request ID, route template, status, duration, error class.
- **Post-commit failure simulations:** fee assessment fails after admitted student or updated profile (student remains saved and UI shows fee pending); audit insert fails during payment/TC/admit card (whole operation rolls back); payment succeeds but GET refresh fails (receipt remains visible). Queue/Redis/storage/DB outage, worker restart, corrupt image, unavailable encryption key, duplicate job and offline fonts must have truthful retry/failure status and controlled error messages.
- **PDF verification:** run `npm run prepare:pdf-fonts`, verify pin/cache integrity offline, render real receipt/TC v2/admit-card files with long EN/HI/UR names and page count. Use `pdfinfo`, `pdffonts`, `pdftotext -layout` and raster preview at 200 DPI; inspect Noto embedding, ToUnicode/copyable text, RTL shaping, ₹, office/student copies and mobile readers. Compare **SHA256** of existing completed v1 files and old receipt history.
- **Money/accounting:** compare old/new **exact decimal** assessed, paid, voided and outstanding, per school/student/period/category; ensure no double-counted legacy due plus new charge, no fabricated external payment, and **₹0.00** variance. Test timezone (Asia/Kolkata), leap day, March/April boundary, multi-year arrears and midmonth assignment.
- **Representative scale:** 10–12 schools × 300–500 students, 24 months of fees, then 5,000-student tenant with 24–60 months of charges; 5k import, 500/5k year plan, 20 parallel money/clearance operations, 50 concurrent document downloads, 100 queued jobs. Capture p50/p95, SQL EXPLAIN, indexes, DB connection pool, memory, deadlocks and worker recovery. Check inherited targets against current specs: exact student ID lookup p95 <1 s at 5k, name search p95 <1.5 s, dashboard p95 <3 s at 2k; report actual measurements and deviations, not invented PASS.

## 6. Fix / retest workflow

For **every failure**:
1. Record `FIX-XX` / `BASE-XX` / `ERR-XX` / `NFR-ERR-XX`, steps, test school/fixture, expected vs actual, relevant HTTP/DB/log code and before/after screenshots **without PII** in the **single** task tracker; mark `QA_FAILED`.
2. Trace Web → API → validator/service → Prisma/DB → worker/file (as applicable). Compare with `main` and ensure the fix cannot break old flows, tenancy, security, reports, money or dates.
3. Fix code in the **same feature branch**, add focused regression test, commit with descriptive message; do **not** patch production data manually or remove a test.
4. Rebuild affected workspace, re-run focused unit/integration tests, failed manual case, its related FIX cases, impacted BASE and original task cases. Mark `READY_FOR_REVIEW` only after evidence exists; senior review for finance, roles, year transitions, migrations, private documents.
5. If a policy decision or unresolved environment dependency blocks verification, mark `BLOCKED`, list exactly what is missing, and **do not merge**.

## 7. Release sign-off and merge to main

**Merge is blocked until ALL boxes below are checked and linked in TASK-TRACKER.md:**

- [ ] Clean install, Prisma validate/generate, migration rehearsal and all static/unit/build tests pass at **final SHA**; API/Web/worker actually run.
- [ ] FIX-01..FIX-14 integrated evidence complete, all reported ERR cases verified, BASE-01..16 and all applicable original TASK-001..035 FE/BE/NFR scenarios passed.
- [ ] Two-school role/IDOR/CSRF/private file negatives pass; no raw/private errors or unsafe logs.
- [ ] Money reconciliation **₹0.00** discrepancy, concurrency/idempotency/void and historical receipts verified.
- [ ] Existing-data migration/backup/restore or safe roll-forward, old document hashes, queue retries, unicode PDF visual/text checks pass.
- [ ] Responsive 360/768/1366 browser checks and measured p50/p95/memory/load results recorded; no P0/P1 defect open.
- [ ] Latest `origin/main` fetched; compare merge diff, inspect conflicts, rerun affected tests on combined code. No previously accepted main functionality removed.
- [ ] Independent reviewer approves; task tracker updated to `DONE` with commands, outputs, screenshots, non-sensitive logs, SHA and reviewer.

**Only after sign-off**, update with latest main safely and merge:

```bash
git fetch origin
git switch fix/school-erp-functional-nfr-audit-20261030
git pull --ff-only origin fix/school-erp-functional-nfr-audit-20261030
git merge origin/main
# Resolve conflicts by comparing both functional flows; repeat required tests.
git diff --check
git status --short
# Commit verified conflict resolutions and push this tested branch.
git push origin fix/school-erp-functional-nfr-audit-20261030
# Open/review PR to main, or use the team's approved protected-branch merge process.
```

Do **not** force-push `main`, skip required checks or claim successful production deployment. A live-production smoke/deploy is a **separate step after approved merge**, following the project's existing release procedure. If the developer finds no issues, still attach actual validation evidence before merge.

## 8. Final developer report (short, send after testing)

```text
Branch + final SHA:
Baseline main SHA / merge review:
Node/npm/DB/Redis/storage environment (no secrets):
Install + Prisma + API/Web/worker builds:
Static/Jest/browser/integration test results:
FIX-01..FIX-14 result and tracker evidence links:
BASE-01..16 and TASK-001..035 coverage:
ERR-01..04, role/tenant/security/error/logging checks:
Fee reconciliation (before/after, variance):
Migration backup/restore and existing-data result:
Receipt/TC/admit-card PDF hashes, Hindi/Urdu inspection:
NFR workloads, measured p50/p95, memory and queue recovery:
Bugs found + commits fixing them:
Remaining blockers / risk:
Independent review:
Main PR / merge SHA (only if approved):
```

**Delivery definition:** The source branch is ready to **build/test/fix**, but not yet verified working or approved for `main`. The developer owns real execution, defect fixes, evidence and final safe merge.
