# School ERP — FE, BE, NFR Verification and Safe Release Plan

**Purpose:** A development task cannot be accepted simply because its new screen/API works. It must preserve the existing multi-tenant product while meeting its new functional contracts. **35 task-specific cases live in** `tasks/TASK-XXX.md`; this document defines common required execution and release proof. Actual task execution status is kept ONLY in [TASK-TRACKER.md](TASK-TRACKER.md). **No tests have been run by this documentation-only work.**

## 1. Verify BEFORE coding, then AFTER on the same fixtures

Read [REGRESSION-BASELINE.md](REGRESSION-BASELINE.md) (BASE-01..16) and [TASK-IMPACT-MATRIX.md](TASK-IMPACT-MATRIX.md) (exact affected old files + required BASE cases for TASK-001..035). Before edits: pin current `main` SHA, capture existing page/route behaviors, initial DB counts, exact money totals, API DTOs/statuses, PDF checksum and load timing on **synthetic data**, then rerun after code. A new UI redesign/refactor is acceptable if all still-approved journeys remain usable with equal or better accessible navigation and no hidden failing server action.

**Fixtures:**
- School A: DRAFT→ACTIVE, original manager operator, student with valid encrypted Aadhaar, student missing Aadhaar after TASK-004, current enrollment with class/section, one inactive student, duplicate-name search cases.
- School B: different school UUID, classes, fee config, student, operators and logo. Attempt School A authentication against every School B protected endpoint, export, school file and issue ID.
- Financial: two months with one PAID, one PARTIAL, one VOIDED receipt; multiple fee categories after TASK-013; one outstanding balance across year; fee concessions fixed and percentage, previous fees not yet assessed, transport service start/stop.
- Documents: issued TC v1 with known immutable snapshot SHA256, logo/principal/signature, completed and failed worker render, signed URL expiry.
- Academic: 2026-27 active with 2027-28 DRAFT, old ambiguous enrollment needing mapping, returning/left and pass-out pupils, 500-row staged promotion including two conflicts.

Use a **disposable database with sanitized fixture data**. Do not log actual student Aadhaar or production credentials. Version the fixture and hash, record environment in PR.

## 2. Unit / static / build commands — what they really prove

```bash
git status --short
git diff --check
npm run prisma:generate
npm run qa:static
npm --workspace apps/api test -- --runInBand
npm test
npm run build
```

The repo currently has `apps/web test` and `apps/worker test` wired to **static QA**, not actual browser/queue integration. Those PASS signals do not verify clicks, forms, PDF, real DB transactions, CSS or job retry. Check the root npm/Node versions first; a lockfile was **not** committed at the reviewed base SHA, so `npm ci` cannot be assumed. Install dependencies according to current approved practice in an isolated checkout. `prisma:migrate` runs `migrate deploy`; first rehearse it only on disposable test data, with schema diff reviewed.

Record command, exit status, failing assertion and exact commit tested. Never weaken a previous regression test to get a green build.

## 3. Frontend acceptance (FE) — mandatory per touched flow

- Open every new/changed page in a browser on **360 px mobile**, **768 px tablet**, **1366 px desktop**; screenshot or record before/after existing screens and new journey. Check no horizontal clipping, footer/submit overlays, focus trap, keyboard nav, labels, tap targets, contrast and meaningful language.
- Execute each named `TASK-XXX-FE..` step with normal data, missing required values, wrong format, loading, double-click, stale 409, server 500/503, expired session, empty state, long names/large table, navigation back/reload/direct URL.
- Compare existing CTA/menu actions to the old baseline: admission, import, fee collect, fees history, print/void, transport, school settings, Platform Admin TC and reports must not disappear merely because a screen was redesigned.
- If printing: render actual A4 PDF/print page; verify ₹ Unicode text, page breaks, collector/school details, multi-line totals, void state, downloadable filename, old v1 issue unchanged. A screenshot of only an HTML card is not a PDF test.
- If permissions: MANAGER retains original controls; REPORT_VIEWER sees only authorized reports; guessed direct URL/backend request denied even if a disabled button is absent.

**Pass:** User can complete all accepted new and old journeys with correct server outcome. Record screenshot/video and observed error text.

## 4. Backend acceptance (BE) — actual DB and API

- Unit-test owned domain rules (date, decimal money, policy version, source keys, idempotency hash, DTO validators and secure error mapping).
- Send requests through Nest controller/auth/session/CSRF stack against isolated PostgreSQL: success+invalid+version conflict+idempotent retry. Test legacy request body and new request body side-by-side where adapters exist.
- Verify row constraints under concurrent transactions: school FKs, one active academic session, no overlapping ACTIVE enrollment by year/date, unique assessed Charge.sourceKey, unique payment idempotency, account-lock ensures exact charge balance, receipt number uniqueness across year-reset and partial/void history.
- Directly test other school IDs and **every protected method** for MANAGER/REPORT_VIEWER/Platform Admin. Important: report export is currently a POST with CSRF; it may have narrow `reports.export` without granting broad mutation. Pure GET/report must not create FeeDue (current fee summary can have side effects).
- Worker/file jobs use only trusted jobId, load frozen encrypted issue, verify authorization and private download. Test queue crash/restart/retry, same request key vs deliberate reissue, wrong school file, expired signed link, old encryption key compatibility and no PII in logs.

**Pass:** Tests run against actual persisted database effects, not only mock `jest.fn()`. All old transaction/void/admission/current TC cases remain green.

## 5. Finance and academic integrity checks

For every migrated school, reconcile before/after **per school, student, original period, category and payment status**:
- Original FeeDue and old FeePayment counts and IDs unchanged; all old receipt numbers, amounts, mode, paid dates and VOIDED records retrievable.
- `netAssessed = original base + fine − concession + approved adjustments`, `paid = active allocation sum`, `outstanding = netAssessed − paid`. Current dashboard and XLSX sums use **de-duplicated single projection**, no old FeeDue + shadow FeeCharge double count. **₹0.00 discrepancy required** for approved cutover.
- A single payment across multiple categories preserves `payment.amount = SUM(allocations)`; concurrent requests never overpay. Repeated idempotency key returns same receipt, different payload using same key conflicts.
- Previous-month/year arrears stay on original charge with original period (never duplicated as next-year new charge). Unassessed legacy months not misrepresented as settled.
- Enrollment migration preserves Student UUID and old class/section snapshots. A year transition cannot make two sessions simultaneously ACTIVE or show half-applied class switches; crash recovery resumes PREPARED→CLOSING chunks exactly once.
- Fees stop on actual approved exit effectiveDate, not automatically on TC issue; re-admission uses same Student UUID and fresh enrollment.
- Existing completed TC v1 file SHA, encrypted issue snapshot and keyVersion unchanged after new school identifiers/worker templates.

No staging/production cutover on any unexplained discrepancy, even ₹0.01.

## 6. NFR baselines and load scenarios

**Inherited approved targets** (verify current Harness revision): Student ID lookup p95 <1s at 5,000 students/school, name lookup p95 <1.5s, dashboard p95 <3s with 2,000 students/school, 99.5% monthly availability target, ≥7 years retention subject to legal policy, WCAG 2.1 AA.

**Required representative workloads** (workload, not invented new latency SLA):
- **Normal:** 10–12 schools each 300–500 students, 24 months of fees, multi-role concurrent searches/collection.
- **Stress:** 5,000 student tenant, 24–60 months of multi-category FeeCharge rows, 500–5,000 promotion decision rows, 5,000-row XLSX import, 20 parallel payment/void/clearance requests, 50 concurrent receipt/TC downloads and 100 queued jobs.
- Measure p50/p95, request counts, SQL EXPLAIN/row scans, index usage, DB connections, CPU/memory, worker queue retries, deadlocks and actual recovered records. Compare same fixture/same machine before/after and document uncertainty.
- Test CSRF, BOLA/IDOR, session downgrade revocation, PII redaction, private file URL TTL, report exporter formula injection, HTML sanitization and school+role+year cache isolation.
- Test leap year/March–April boundary/business timezone and 1- vs 2-decimal money rounding.

When no approved latency target exists for a newly added endpoint, **report measured baseline and reviewer-agreed acceptance budget**, not 'NFR PASS' without values.

## 7. Release gates by risk

**All tasks:** current code and Harness review, legacy baseline captures, approved task PR, validated type/build, FE browser cases, BE real data + wrong-role/tenant, measured relevant NFR, 16-baseline subset, independent reviewer.

**Database/account/role/finance/year/TC tasks:** migration dry-run and restore from backup; reversible feature flag and compatibility adapter; targeted canary tenant; per-school before/after snapshot and receipts; job replay and log/security verification; senior architecture/domain reviewer.

**Production cutover sequence:** deploy additive schema → deploy backward-compatible API/worker → dry-run and approve backfill → shadow read/reconciliation → enable selected canary tenant → monitor errors, ledger invariants and p95 → expand tenants → verify old reports/receipts/TCs → remove legacy schema only in later reviewed release. If financial events posted, never use table rollback to erase them; freeze new writers and safely roll forward corrective migration when needed.

## 8. Definition-of-Done evidence in the one tracker

Every task row in [TASK-TRACKER.md](TASK-TRACKER.md) must link:
```text
Task ID + assignee + baseline main SHA + branch/PR:
Product/spec policy approval:
BE and FE changed file list:
Before/after BASE journey screenshots (360/768/1366):
New TASK-XXX-FE case IDs, steps, actual result, evidence:
New TASK-XXX-BE tests, API/DB command, actual result:
New TASK-XXX-NFR data size, p50/p95, memory/queue/plan, old vs new:
Wrong-role/cross-school/CSRF/PII negative cases:
Legacy fee/receipt/TC and student counts and SHA before/after:
Additive migration, backfill, restore/roll-forward evidence:
Full static/type/build/API and browser test outputs:
Independent reviewer + remaining risk:
Main merge SHA / handoff or deploy status:
```

A task must not be marked DONE until executed FE/BE/NFR and non-regression evidence has passed and been independently reviewed. **Design readiness and application code readiness are different states.**
