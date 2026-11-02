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

## 7a. Client Word-file regression scenarios (ERR-01..04)

Source: `Error Drafts.docx` (2 pages, reported 2 November 2026). Test against the corrective feature branch after initial smoke/build. Record outcomes only in `docs/school-erp-corrective-work/TASK-TRACKER.md`; **unexecuted cases remain NOT_TESTED**.

| Case | Manual browser steps | Real API/Postgres / negative checks | NFR and old-flow gate |
|---|---|---|---|
| ERR-01 | Sign in as Platform Admin → ACTIVE school → Operators → create MANAGER, then REPORT_VIEWER. Reopen list, log in as each. Repeat on another school. | POST `/platform/schools/:schoolId/operators` creates once, audit row, UUID lock works; inactive school 409, duplicate email 409, wrong role blocked. Server SQL may be logged privately but NEVER shown to client. | Two tenants, 20 concurrent create attempts for same email → one account, no 500/42883; BASE-02/04. |
| ERR-02 | Open `/admin/login` and `/operator/login` both from landing page and directly; click page's Back after redirects/history; confirm `/` in one click. | Public landing, login/logout/session/CSRF still work; no redirect cycle or back-to-login loop. | 360/768/1366, keyboard navigation; BASE-01/05. |
| ERR-03 | With student owing three charge lines (₹800 + ₹900 + ₹800), select all in Collect Fee, Cash, set date, submit. Show receipt and history then try same request again; void with authorization. | Confirm `school_id UUID` in legacy receipt_sequences insert and FeeDue lookup; exactly one ₹2,500 payment with three correct allocations; same idempotency replay returns same receipt; other-school IDs denied; 20 simultaneous attempts do not overpay. | Verify payment balance and receipt sequence, 0.00 discrepancy and no 500/42804; BASE-10/11/12/16. |
| ERR-04 | Create route/stoppage; mark student Transport Required; assign student; Fee Setup → Categories create/enable TRANSPORT → Rules create MONTHLY school-wide or route-specific amount → Generate Dues for eligible month → Collect Fees includes Transport Fee. | No rule or no active transport → no assessed transport charge; route A rule never applies to B; wrong class/year rule ignored, no double charge on rerun; end assignment stops future transport fees, not old arrears. Viewer cannot create rules or collect. | 360/768/1366, 500-student batch, historical service date/tenant isolation; BASE-08/09/10/11/13. |

Run the new focused Jest tests for `OperatorsService`, `ReceiptNumberAllocator`, and `ApiExceptionFilter`, and the existing `qa:corrective-static` gate. These do **not** replace real database or browser checks.

## 7b. Error handling, logging, recovery and privacy NFR cases

**All cases NOT_TESTED until local developer evidence is recorded.** Run the corrective branch with real two-school Postgres data, Web, API and worker. The source gates (`npm run qa:corrective-static`) and Jest test additions are **supplementary**, not browser or load-test results.

| Case | Manual/API/worker steps and acceptance |
|---|---|
| NFR-ERR-01 | Trigger missing/invalid Email, Amount, class, academic session and upload fields; verify 400/422 with readable labels, required-field instructions, no raw paths/SQL/Prisma/stacks. Confirm business 401/403/404/409/423/429 remain actionable. |
| NFR-ERR-02 | Attempt duplicate-school creation and complete signed confirmation; validate candidate details still available, readiness blockers/warnings visible, busy transport deactivation shows safe active-assignment count. Confirm arbitrary nested secrets are absent. |
| NFR-ERR-03 | Simulate malformed UUID, server 500, database unavailable, network offline, aborted and delayed requests. Every Web screen presents readable inline messages with next steps, no JavaScript error alert, technical message or raw exception. Check 360/768/1366 and keyboard focus. |
| NFR-ERR-04 | Review request logs for success/validation/denial/500: request ID, method, route template, status, duration, error class and safe database code only. **Never log** password, email/phone, student names, cookies/authorization, PII, URL queries, SQL text, or raw exception.message. Correlate response reference to logs. |
| NFR-ERR-05 | Force TC/admit-card render failures (missing image, storage outage, DB unavailable), retries, restarts and parallel jobs; verify only stable worker error codes are persisted, fail/retry states are truthful, prior PDFs unchanged, and branding cache remains bounded with 500/5000-student workloads. |
| NFR-ERR-06 | Record identical fee payments from Collect Fee and Student Profile, lose response after DB commit, retry/reload (including disabled sessionStorage): **one** payment/receipt, same allocations, zero money discrepancy. Changing details yields a new intent. On confirmed payment followed by failed dues refresh, receipt remains visible and UI says balances need refresh. |
| NFR-ERR-07 | Both login pages have no demo credentials, backend-port or server-log text; wrong role, invalid credentials, lockout, session expiry and CSRF recovery display clear messages and accessible forms. Validate wrong-tenant/REPORT_VIEWER denial and download/export failures. |

**NFR-ERR-10 (login privacy and helpfulness):** On both portals try an unknown email, known email in the other portal with wrong password, and valid opposite-portal credentials. Unknown and wrong-password requests must have identical generic invalid-credential response (no existence disclosure). Only a verified password may trigger an appropriate redirect hint. Repeat for locked and inactive accounts, rate limiting and audit logs; no passwords or email values in request logs.

**NFR-ERR-09 (newly found UUID/secret regressions):** With two real schools, execute create/edit/activate/deactivate academic year, add/edit class/section, issue and retry TC/admit card, create/reassign/end routes and stoppages. Verify no PostgreSQL `42883`/`42804` from raw school UUID bindings. Inspect operator create/update/status responses: no password hash, reset secret or authentication field; inspect operator audit rows: no reversible email encoding. Validate worker saved file/audit rows have correct UUID school ID, status transition and correct school isolation.

**FIX-11 Unicode printing acceptance:** Create a receipt with school and student names in Devanagari, Urdu, Arabic diacritics, mixed English and parentheses. Verify the Collect Fees and History **Print / Save as PDF (2 copies)** path retains original characters and is safe from HTML insertion, with exactly one OFFICE and one STUDENT copy. The old server PDF download must return a readable 422 with guidance rather than `?` substitution. Server-generated Unicode receipt/TC v2/admit-card source is implemented; font embedding, glyph rendering, text search and print QA remain NOT_TESTED and must not be marked PASS.

**NFR-ERR-08 (seed/deploy security):** Run the operator seed with NODE_ENV=production (must reject), then without ALLOW_DEV_OPERATOR_SEED (must reject). On a disposable local database set ALLOW_DEV_OPERATOR_SEED=true, OPERATOR_EMAIL and a unique 12+ character OPERATOR_PASSWORD; create one test operator, rerun (must preserve existing password/role/school status), attempt inactive school (must refuse reactivation), and confirm seed logs contain neither credentials nor raw database exception text. Never use production credentials or live school records for this test.

**NFR-ERR-10 — New server Unicode documents (SOURCE_READY, NOT_TESTED):** From a clean local checkout run `npm ci`, `npm run prepare:pdf-fonts` and then rerun font prep with networking disabled (cached files must verify). Tamper with a disposable copied font and rerun to ensure the pinned Git blob hash is rechecked/replaced or the preparation fails. Verify `npm run qa:corrective-static`; build storage/API/worker/Web before testing. Generate a 25-line receipt containing English, Hindi, Urdu, accented names and special characters, with exactly one OFFICE and one STUDENT copy, immutable receipt number, stable amounts and no `?` substitution. Use `pdfinfo`, `pdffonts`, `pdftotext -layout` and visually render A4 at 200 DPI; confirm Noto Type0 is embedded, ToUnicode text is present and expected Hindi/Urdu glyphs display/are copyable in Chrome, Adobe and mobile PDF readers. Compare PDF generation before/after school name changes; PDF uses the frozen receipt snapshot. Use 2 schools and wrong-role reads to prove isolation. Issue TC v2 and an admit card with Urdu and Devanagari names, long principal names/addresses and image branding; ensure old completed v1 PDFs have exactly the same SHA, worker retries are idempotent, and queues recover from missing fonts, corrupt logos, Redis outage and worker restart. Measure 500 and 5,000 candidates, memory and p95 under `WORKER_CONCURRENCY=2` then optionally 4 only after safe results. Capture actual PDF text/render/screenshot/log evidence.
Execution evidence belongs **only** in [the corrective tracker](../school-erp-corrective-work/TASK-TRACKER.md), including actual steps, response/status/log fragments that are privacy-safe, receipts and p50/p95, BEFORE/AFTER regressions and independent review. Original FIX-11 Unicode receipt/TC issue remains explicitly open.

**MAIN-COMPARE-REGRESSION (source fixes require real QA):** (1) Log in as REPORT_VIEWER and verify Dashboard, Students (read-only), Fee history/pending, Transport listings, Academics, Exams and existing TC read endpoints work just as in main; all POST/PATCH/DELETE changes must still be denied, except deliberately allowed read-only report export. Confirm corresponding sidebar routes appear and don't expose write controls. (2) As MANAGER record a student-profile payment; the receipt must remain visible while outstanding balances refresh, and a failed refresh must never show "payment failed" or enable duplicate recording; retry same key yields only one payment. (3) Force audit insertion to fail inside a disposable payment transaction; assert the payment, allocations, sequence and receipt do **not** commit. Recover and retry successfully, assert exactly one audit row and receipt. (4) Compare historic TC v1 PDFs and preexisting receipt numbers with pre-change data. (5) Verify login navigation, duplicate school confirmation, transport reassignment and multi-fee void against main baseline, two-school/wrong-role negatives, and mobile/tablet/desktop workflows. Record actual results in the single tracker, not as a source-review pass.

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
