# School ERP — Corrective DLD

**Source baseline:** `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0` (30 October 2026).  
**Use:** implementation design for existing code, not evidence that changes are developed/tested.  
**PRD:** [PRD.md](PRD.md) · **Execution status:** [TASK-TRACKER.md](TASK-TRACKER.md).  
**Original spec authority:** `docs/school-erp-development-plan/` and approved JASIQ Harness docs. Policies marked unresolved remain blocked for the affected task only.

## 1. Rules that apply to all tasks

**Runtime:** Next.js `apps/web`; NestJS `apps/api`; Prisma/Postgres `prisma`; BullMQ `apps/worker`; DTOs in `packages/contracts`, validation in `packages/validation`. Keep original route method/body and previous UI actions unless explicit compatible replacement is approved.

**No extra infrastructure by default.** Reuse existing Student, FeeDue, FeeCharge, FeePayment, FeePaymentAllocation, receipt allocator, file, job and audit records where possible. Do not invent FeeAccount, generic payment engine, document microservice or second import platform as a default solution. Add a table/index only where an invariant cannot be met with existing persisted models, and document the minimum migration. No app-wide refactor for unrelated code.

**Lock and money contract:** Shared typed transaction helper obtains a consistent lock on the existing per-school Student row (e.g., `SELECT id FROM students WHERE school_id=? AND id=? FOR UPDATE`) or another existing stable per-student lock anchor reviewed by DB architect. All assessment, payment, void, adjustment, opening-balance posting and fee-clearance issuer transactions take the **same lock before reading the balance**. Keep short transactions, lock rows in deterministic order, bounded retry. Use Decimal/integer paise for posting, never binary floating-point arithmetic for authoritative amounts. All old and new fee projections deduplicate the legacy FeeDue/TUITION mirror. Proof: net assessed - active allocated = outstanding; payment amount = sum active allocations; zero-paise discrepancy.

**Security:** Every operator write route requires explicit write capability + CSRF; read/export permission never authorizes mutation. Session-derived school, cross-school resource 404, private download current-role and school check. Do not reveal Aadhaar, private family/contact profiles or object storage keys to viewer/other schools. An HTTP GET or report export has no DB writes. Worker queue only `jobId`; encrypted file snapshot remains immutable.

**Schema rollout:** EXPAND/add nullable fields or small tables; old API/client compatibility; deterministic idempotent backfill; per-school money/UUID/file checksum reconcile; canary and safe roll-forward when production finance was written. No editing applied migration, no production DB reset, no invented school-year mapping. Code may be reorganized or UI redesigned **only when original supported workflows and NFRs still pass before/after**.

**Common UI state:** Loading, empty, ready, validation, stale 409, 401 expiry, 403 permission, request timeout, idempotent retry, in-progress job, failed job, completed job; form and navigation state retained after safe recovery. Desktop/tablet/mobile widths 1366/768/360; keyboard labels/focus; meaningful printable A4. Never claim a PDF exists until render COMPLETED.

**Test evidence:** Each task's three cases `FIX-XX-FE01`, `FIX-XX-BE01`, `FIX-XX-NFR01` represent **executed** browser, real Postgres/API and measurable security/scale tests plus old affected BASE-XX regressions, not unit-mock green checks. For high risk finance/auth/year/TC, obtain independent senior review. Original 35-task tracker remains the source for historic requirement coverage; corrective status stays in one tracker here.

## 2. Dependency order and technical implementation

<a id="fix-01"></a>

### FIX-01 — Role security, viewer data and transport UI

**Priority:** P0 · **Requires:** None · **Findings:** SEC-01, SEC-02, SEC-03, SEC-04; WEB-04 · **Original tasks:** TASK-001/002

**Inspect:** capability.guard.ts; transports.controller.ts; students.controller.ts; search-students.service.ts; apps/web/src/components/shell.tsx; transport UI.

**Backend / DB implementation:** 1. Enumerate all controller methods by HTTP verb, route, required capability and actor; test MANAGER, REPORT_VIEWER, Platform Admin. The current CapabilityGuard accepts a class-level `transports.read` requirement on mutating methods, bypassing its default viewer write denial. Add explicit write capability to every mutating route and guard against accidentally treating class-level read as a write grant. Preserve CSRF/session guards. 2. Define owner-approved viewer projections: aggregated student/transport/report data permitted, private student profile/family/address/contacts restricted. Restrict APIs, not just links. 3. Inspect existing cross-school relations and validate tenant IDs at mutation; strengthen composite DB FKs only if needed by actual invariant tests. Preserve existing MANAGER and Platform Admin actions.

**Web UI & user journey:** Correct viewer sidebar/home and deep-link error; manager retains route/assignment/edit buttons and normal profile view. Viewer no write buttons and no leaked private details.

**Required verification:** `FIX-01-FE01` actual browser flow; `FIX-01-BE01` API/DB scenarios; `FIX-01-NFR01` security, load or recovery: Direct viewer POST assignments/create/reorder/end with valid cookie+CSRF => 403, DB unchanged; viewer private student GET restricted; manager same old flows work. Cross-tenant UUID 404 and role-downgrade session revoked. Test every controller method, not only transport.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-02"></a>

### FIX-02 — Read-only fee statements, reports and exports

**Priority:** P0 · **Requires:** FIX-01 · **Findings:** FIN-03, FIN-10, FIN-14; WEB-05 · **Original tasks:** TASK-002/013/019/026

**Inspect:** query-pending-fees.service.ts; fees-public.facade.ts; generate-dues.service.ts; collect-payment.service.ts:getStudentDues; fee-exports.service.ts; fees/pending UI.

**Backend / DB implementation:** 1. Remove implicit assessment from all GETs/summary/exports. Keep already-assessed legacy FeeDue and FeeCharge as a single read projection; show UNASSESSED distinctly from zero. 2. Assess only via existing authorized idempotent POST dues/generate (or equivalent explicit command) with audit and correct school/period. 3. Replace sequential per-student assessments with page/batch DB queries for school, period, category and original obligation. Include historic unpaid fees of inactive/exited students; avoid fee creation on view. 4. Keep existing response DTOs with additive unassessed/historical fields; preserve XLSX and role authorization.

**Web UI & user journey:** Pending report shows true assessed totals and an explicit 'Not assessed' state, with manager-only Assess action. Viewer sees no Assess. Export and displayed totals use same query, no fake zero when historical state unknown.

**Required verification:** `FIX-02-FE01` actual browser flow; `FIX-02-BE01` API/DB scenarios; `FIX-02-NFR01` security, load or recovery: Run every permitted GET/export as viewer and manager; count FeeDue, FeeCharge, Payment, audit rows before/after => no changes. Exited student old debt appears; no duplicate old/new tuition. 500/5000-student p50/p95, SQL EXPLAIN; no N per-student write calls.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-03"></a>

### FIX-03 — Safe payment transactions, retries and old arrears

**Priority:** P0 · **Requires:** None · **Findings:** FIN-01, FIN-07, FIN-08, FIN-13; WEB-02, WEB-07 · **Original tasks:** TASK-013/016/019

**Inspect:** collect-payment.service.ts; fees/repository; prisma/schema.prisma; packages/validation/src/fees/fee.schema.ts; fees/collect UI.

**Backend / DB implementation:** 1. Implement **one common student-scoped transaction lock** for all fees writers. Prefer locking existing `students` school/student row via a typed shared transaction helper (no mandatory new FeeAccount table), provided lock ordering and ownership pass reviewer assessment. All old and new fee writers must call it. 2. Under lock re-read source balances, ordered charge rows, verify payment amount = sum allocations using Prisma.Decimal or integer paise, and update active allocations/legacy TUITION mirror and receipt atomically. 3. Store a canonical requestHash for the existing idempotencyKey; replay same hash returns original receipt, changed payload gives 409. Do not bypass outstanding checks on retries. 4. INACTIVE student with old dues may pay them; no new future accrual. Validate same school on every charge and payment allocation.

**Web UI & user journey:** Collect Fees keeps a persistent payment-attempt key until outcome known (including network timeout/reload), offers 'check payment status / retry same attempt', refreshes server amounts on 409, and allows old owed dues for exited students without future billing.

**Required verification:** `FIX-03-FE01` actual browser flow; `FIX-03-BE01` API/DB scenarios; `FIX-03-NFR01` security, load or recovery: 20/50 simultaneous pay requests on ₹1000 balance never collect >₹1000; network response lost then retry => exactly one receipt; conflicting key 409. INACTIVE student pays old ₹400 while new charge creation remains blocked. Old due-only payment/receipt works, exact ₹0.00 variance and 2-tenant isolation.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-04"></a>

### FIX-04 — Multi-charge void and legacy ledger reconciliation

**Priority:** P0 · **Requires:** FIX-03 · **Findings:** FIN-02, FIN-09 · **Original tasks:** TASK-013/030

**Inspect:** void-payment.service.ts; collect-payment.service.ts; query-payments.service.ts; prisma FeePayment/FeePaymentAllocation/FeeCharge/FeeDue; fees/history UI.

**Backend / DB implementation:** 1. Using same student lock as FIX-03, lock FeePayment and all allocations in stable order. Handle nullable dueId for multi-charge payments, and legacy-only dueId payments through adapter. 2. Validate original same-day Asia/Kolkata policy, then mark payment VOIDED and reverse **every active allocation exactly once**, restore original charge paid/balance/status and matching legacy tuition mirror. Keep original receipt and audit reason. 3. Reconcile old FeeDue payments, new FeeCharge and voids by school/student/month/category without double-counting shadow rows. Never delete/overwrite posted history. 4. Roll forward safely if previously generated bad records are found; no silent data correction.

**Web UI & user journey:** History Void modal shows affected allocations/amounts, same-day reason and final VOIDED state. Payment history and printable old receipts remain available and accurate.

**Required verification:** `FIX-04-FE01` actual browser flow; `FIX-04-BE01` API/DB scenarios; `FIX-04-NFR01` security, load or recovery: Payment ₹650 allocated across 3 categories, void restores all 3 outstanding balances; second void no change. Concurrent pay/void serializes. Legacy one-due void still works. Per-school financial difference ₹0.00 and original receipt ID stable.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-05"></a>

### FIX-05 — Authoritative fee clearance for TC and admit card

**Priority:** P0 · **Requires:** FIX-03, FIX-04 · **Findings:** FIN-04, FIN-05 · **Original tasks:** TASK-032/035

**Inspect:** tc.service.ts; fees-public.facade.ts; admit-cards.service.ts; fees/clearance policy; existing TC and exam controllers.

**Backend / DB implementation:** 1. Use FIX-03's lock (no second lock system) for purpose-specific clearance. Evaluate eligible **distinct** old and new obligations, including missing-assessment policy and approved category/exam cutoff. 2. Existing Platform Admin TcService.issue MUST evaluate clearance and create TC encrypted issue + outbox/job in same protected transaction. All future operator issuance uses same method. 3. Admit-card issue checks clearance inside each student's protected short transaction; preflight is advisory only. Blocked request inserts **no** new issue/job; committed historical issue remains immutable if debt changes later. 4. Return well-defined 409 business codes with safe balance/reason, log actor. No request flag bypass.

**Web UI & user journey:** Existing admin TC UI and exam preview show pending dues and refresh at Confirm; blocked message never implies issuance. Preserve old issued TC downloads and admin issue/list/retry routes.

**Required verification:** `FIX-05-FE01` actual browser flow; `FIX-05-BE01` API/DB scenarios; `FIX-05-NFR01` security, load or recovery: Race with charge insertion, payment/void and TC/admit issue (20 parallel requests) cannot produce issue when eligible debt exists. Failure rollback produces no job. Current admin TC old route protected; old TC PDF checksum unchanged.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-06"></a>

### FIX-06 — Correct fee setup, eligibility and audited adjustments

**Priority:** P1 · **Requires:** FIX-03, FIX-04 · **Findings:** FIN-06, FIN-08, FIN-11, FIN-12, FIN-15; WEB-04 · **Original tasks:** TASK-012/014/015/016/017/018/021

**Inspect:** generate-dues.service.ts; update-student-profile.service.ts; students enrollment/Transport facades; fee categories/rules; fees/setup UI.

**Backend / DB implementation:** 1. Keep one source for charge eligibility using school-local dates, session/enrollment segments, effective class/section, transport assignment and versioned fee rules. Do not infer old years or prorate/backbill without approved policy. 2. Never auto-enable disabled TUITION/FeeCategory. 3. Implement minimal auditable adjustment/cancellation (reason, signed amount, actor, source charge, idempotency) rather than deleting Books/Uniform charges or repricing paid receipts. Prefer existing audit/schema facilities; add a table only when durable line-item accounting needs it. 4. Fees owner computes Decimal net, validates no over-credit below paid amount and respects common account lock. 5. Keep monthly legacy fee generation and old student/profile APIs working via adapters.

**Web UI & user journey:** Fee Setup lists effective categories/rules and clearly warns when disabled; admission and student profile show Books/Uniform/discount preview and reason; old paid fee unaffected. Explicit Generate is manager-only.

**Required verification:** `FIX-06-FE01` actual browser flow; `FIX-06-BE01` API/DB scenarios; `FIX-06-NFR01` security, load or recovery: Admit Aug => no April–July auto-charges; change class Oct 15 and stop transport Nov 15 => approved rates and no Dec fee. Disabled TUITION stays disabled; Books untick leaves auditable correction. Concurrent generator retry no duplicate sourceKey; old receipt unchanged.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-07"></a>

### FIX-07 — Student admission, exit, pass-out and re-admission

**Priority:** P1 · **Requires:** FIX-06 · **Findings:** ACAD-02; WEB-01, WEB-04 · **Original tasks:** TASK-004/008/009/022/023

**Inspect:** admit-student.service.ts; change-student-status.service.ts; change-student-enrollment.service.ts; transports facade; students/new/[id] UI.

**Backend / DB implementation:** 1. Admit only to school ACTIVE academic session on **both web and backend**. Preserve any approved compatibility handling for existing schools without a mapped year; don't silently map old history. 2. Exit/pass-out is a small durable, idempotent workflow recording effective date/reason, closing enrollment, ending future transport and stopping future fee assessment **without removing past debts**. Use existing services and outbox/retry when cross-module steps cannot be one transaction. 3. Re-admission creates a new session enrollment under same Student UUID, prevents active overlaps and explicitly handles new registration fee policy. 4. Keep existing basic student status API and old admission/edit/import working.

**Web UI & user journey:** Admission year chooser ACTIVE only and disabled when no session; profile has clear Exit/Pass-out, history and Re-admit actions when eligible, with effective date, impact preview, reload/recovery. Don't replace unrelated 5k-line profile UI wholesale.

**Required verification:** `FIX-07-FE01` actual browser flow; `FIX-07-BE01` API/DB scenarios; `FIX-07-NFR01` security, load or recovery: DRAFT-year POST fails; ACTIVE admission and original Aadhaar/import work. Leave Nov 15 stops Dec fee/transport but October debt still collectible; returning next session same UUID, no duplicate person. Kill workflow mid-step and resume exactly once, foreign tenant 404.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-08"></a>

### FIX-08 — Stage promotion and safely close academic year

**Priority:** P1 · **Requires:** FIX-07 · **Findings:** ACAD-01, ACAD-03 · **Original tasks:** TASK-007/008/009/024/025

**Inspect:** academic-sessions.service.ts; change-student-enrollment.service.ts; academic-sessions-view.tsx; Prisma.

**Backend / DB implementation:** 1. Add a small durable transition batch and row journal: source ACTIVE, target DRAFT, decision PROMOTE/REPEAT/PASS_OUT/LEAVE and enrollmentVersion; don't move students while staging. 2. Preview conflicts and old-year finance; require confirmation. 3. Mark CLOSING and finalize in bounded idempotent chunks. Ordinary year-sensitive writes must be gated; year reads remain on source until all chunks pass. 4. One short DB transaction changes old CLOSED and target ACTIVE after row verification. Crash/retry resumes journal. Existing year create/activate remains unchanged; old direct close must not bypass new safe rules.

**Web UI & user journey:** Academic Sessions UI exposes Prepare > Review > Resolve > Finalize and live progress/failure; replace dangerous single-click Close with safe transition, preserving historical year list and first-year activation.

**Required verification:** `FIX-08-FE01` actual browser flow; `FIX-08-BE01` API/DB scenarios; `FIX-08-NFR01` security, load or recovery: 500/5000 students, repeats/pass-outs, kill after chunk 17 then resume, no duplicate enrollment/fee, old-year snapshot accessible and at most one ACTIVE/CLOSING session per school; legacy school activation untouched.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-09"></a>

### FIX-09 — Historical year and fee reporting

**Priority:** P1 · **Requires:** FIX-02, FIX-04, FIX-08 · **Findings:** ACAD-03; WEB-05 · **Original tasks:** TASK-010/019/021/026

**Inspect:** fee exports/pending; dashboard reports; search-students.service.ts; students directory/profile; fees/pending/history UI.

**Backend / DB implementation:** 1. Introduce optional validated academicSessionId and explicit report basis AT_CLOSE vs TODAY_REMAINING. Distinguish original charge year/period from actual payment collection date. 2. Query via pure read projections of FIX-02/04; don't sum legacy shadow twice or hide exited balances. 3. Use school/year/role scoped cache and validate download permissions. 4. Old URLs with no year still show current approved default and compatible data.

**Web UI & user journey:** Year selector stays in URL/back/reload; historical reports show year, as-of basis, class at time; filter changes cancel/stale-protect in-flight requests; exports match visible view. Viewer receives only safe allowed columns.

**Required verification:** `FIX-09-FE01` actual browser flow; `FIX-09-BE01` API/DB scenarios; `FIX-09-NFR01` security, load or recovery: School year A Class 2 to year B Class 3, old unpaid ₹400 + current ₹900, historical/aggregate exports align; report GET changes no DB row; cross-school year returns 404 and cache never mixes.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-10"></a>

### FIX-10 — Historical opening balances and source import

**Priority:** P1 · **Requires:** FIX-04, FIX-06 · **Findings:** FIN-12; WEB-06 · **Original tasks:** TASK-020

**Inspect:** fee services; existing student XLSX import as reference; private-file/job service; new fees import UI.

**Backend / DB implementation:** 1. Add **only** the data needed for opening obligations: batch metadata (school/as-of/file checksum/status/reviewer) and source rows with period, type due/external paid/credit, linked student and provenance; do not treat external paid proof as a new FeePayment/receipt. 2. Support XLSX/CSV upload→strict student matching→preview total/error rows→confirm→bounded resume; persist request key/row status, use common fee lock on each student. 3. Re-use existing import file/job/error presentation infrastructure where practical. No OCR, accounting general ledger or additional generic import platform.

**Web UI & user journey:** One concise Upload > Match > Preview > Import status > Download errors screen. Existing student import still works, including authenticated error workbook download across deployed origins.

**Required verification:** `FIX-10-FE01` actual browser flow; `FIX-10-BE01` API/DB scenarios; `FIX-10-NFR01` security, load or recovery: 300/5000 rows, student mismatch, duplicate checksum, zero fabricated receipts, retry after process kill, ₹0 reconciliation to approved source and no cross-school inserts.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-11"></a>

### FIX-11 — Receipt numbering, two-copy print and PDF history

**Priority:** P1 · **Requires:** FIX-04, FIX-06 · **Findings:** DOC-01, DOC-02; WEB-05 · **Original tasks:** TASK-027/030/031

**Inspect:** receipt-number-allocator.ts; student-identifier-allocator.ts; collect/receipt query service; fees/collect/history UI; schools admin settings.

**Backend / DB implementation:** 1. First freeze existing FeePayment receipt DTO with collector name, source line allocations, school/class/year and status. Print **Office Copy** and **Student Copy** from one versioned immutable snapshot; old/voided receipts use legacy adapter. 2. Add protected authenticated PDF download from payment history with no new payment/receipt number; use existing private-file/worker only if actual render size requires it. 3. For numbering, add minimally configurable per-school receipt and student sequence policy (continuous/academic/fiscal where confirmed), atomic allocator/uniqueness; keep old sequences and number text unchanged. Defer unapproved policy choices, do not build new system wide sequence engine.

**Web UI & user journey:** One shared print preview and Download PDF on both payment confirmation/history, labelled two copies, A4 glyph/long-name layout. Admin previews numbering options without editing old series.

**Required verification:** `FIX-11-FE01` actual browser flow; `FIX-11-BE01` API/DB scenarios; `FIX-11-NFR01` security, load or recovery: 25-line ₹500 split receipt → same ID/totals in two copies and PDF; old VOIDED readable; 100 parallel IDs unique across Mar/Apr; file role/school denied; old numbering unchanged.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-12"></a>

### FIX-12 — Versioned TC and operator issuance

**Priority:** P1 · **Requires:** FIX-05, FIX-07, FIX-08 · **Findings:** DOC-01 · **Original tasks:** TASK-028/029/033

**Inspect:** tc.service.ts/controller; tc-pdf-builder.ts; new operator TC controller/UI; school identities and Students facade.

**Backend / DB implementation:** 1. Keep TC v1 encrypted snapshot/worker/URLs unchanged. Introduce TC v2 snapshot with official school identifiers, historical class/section at issue date and branding; versioned renderer for **new** issue only. 2. Add manager-only operator preview/list/issue/status/retry/download **delegating to existing TcService**, no second certificate table. Both old admin and new operator routes use FIX-05 fee guard and identical issue state. 3. No automatic Student EXIT from TC issue without approval. Retrieve private file with current role+school authorization.

**Web UI & user journey:** Operator student profile > TC readiness > preview > issue > queued/failed/complete/download. Existing Platform Admin TC view and retry remain functional and familiar.

**Required verification:** `FIX-12-FE01` actual browser flow; `FIX-12-BE01` API/DB scenarios; `FIX-12-NFR01` security, load or recovery: Old v1 PDF SHA unchanged after principal/school update; v2 displays leading-zero school UDISE and correct historical class. Manager issue with no debts succeeds; viewer 403, cross-school 404, pending dues 409 with zero new issue.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-13"></a>

### FIX-13 — Scalable admit-card issue and truthful web status

**Priority:** P1 · **Requires:** FIX-05 · **Findings:** EXAM-01, EXAM-02; WEB-03 · **Original tasks:** TASK-034/035

**Inspect:** exam-contexts.service.ts; admit-cards.service.ts; exam controllers/worker; exams/[id]/admit-cards UI.

**Backend / DB implementation:** 1. Retain current exam context and PDF worker; **no new exam grading/marks subsystem**. Replace unbounded per-student Promise.all with bounded batches or a single indexed school/class fee projection. 2. Per-student issue rechecks fee clearance under FIX-05 lock; issuance and job creation idempotent, bulk work bounded, recoverable per student. 3. Responses distinguish accepted QUEUED, PROCESSING, COMPLETED (file exists), FAILED/blocked; no fabricated success. Review paid-CR entitlement before expanding feature beyond existing live code.

**Web UI & user journey:** Student and bulk buttons show queued/progress/failed/ready correctly, only enable PDF on COMPLETED and valid private file, keep filters/page and retry status across reload.

**Required verification:** `FIX-13-FE01` actual browser flow; `FIX-13-BE01` API/DB scenarios; `FIX-13-NFR01` security, load or recovery: 500/5000 candidates with bounded DB connections, worker killed after N jobs and resumed; 20 concurrent fee changes+issue denied when due; queued UI never says PDF ready; safe signed URL and role decline.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

<a id="fix-14"></a>

### FIX-14 — Integrated Web/API/DB/NFR and migration release verification

**Priority:** P1 · **Requires:** FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09, FIX-10, FIX-11, FIX-12, FIX-13 · **Findings:** OPS-01, OPS-02, OPS-03; WEB-04, WEB-06; SEC-03 · **Original tasks:** TASK-001..035

**Inspect:** all web routes/controllers, prisma migrations, scripts, web/worker test runners, base regression docs.

**Backend / DB implementation:** Do **not** defer unit/integration/browser tests from preceding tasks to this one. This is the final independent release reconciliation: verify all 35 original user-story outcomes against current feature, run 16 baseline flows, test old migration history on sanitized DB clone, full security/financial NFR, backup/restore and actual worker/browser tests. Improve indexes/metrics/recovery only when measured failure proves need. No speculative new tracing framework or broad rewrite.

**Web UI & user journey:** Run actual browser walks for public/admin/operator routes at 360/768/1366 and all roles; test printing, XLSX download, year switch, fees/refunds/TC/admit and mobile keyboard/empty/errors.

**Required verification:** `FIX-14-FE01` actual browser flow; `FIX-14-BE01` API/DB scenarios; `FIX-14-NFR01` security, load or recovery: 0 P0 open; real BE tests with 2-school database, NFR p50/p95 at 300–500 and 5000 students, payment 20–50 parallel, worker 100 queued, exact ₹0 reconciliation, migrations up/restore, past TC checksums and independent senior acceptance.

**Non-regression gate:** Rerun related original [BASE-01..16](../school-erp-development-plan/REGRESSION-BASELINE.md) and task-specific original FE/BE/NFR scenarios. Preserve untouched features; log executed results and reviewer in the one corrective tracker.

## 3. Cross-module test and user-flow matrix

| Functional area | Screens and server owner | Minimum old features to retain |
|---|---|---|
| School/admin/auth | public home; admin school create/edit, operators, academics; operator login/password | DRAFT→ACTIVE school, tenant-scoped manager, password/session/CSRF, class/section |
| Students | operator directory/admit/profile/import/admission-form | old student UUID/code, optional Aadhaar, admission print, bulk XLSX, edit/transport/fees |
| Fees | setup, pending/export, collect, payment history/receipt | old monthly tuition, partial/full/void, dashboard/report totals, original receipt numbers |
| Transport | routes/stoppages, assignment, reassign/end, counts | correct dates and assignments, no viewer write, no cross-school data |
| Academics | year setup/activation, historical class, staging/close | verified year history, no two active sessions, crash resume, previous-year arrears |
| TC and PDFs | admin TC, operator TC, worker, private file | v1 old download/cryptographic snapshot, new v2 issuer, file authorization |
| Exams | contexts, candidates, admit cards, download/retry | existing already-issued cards, safe fee-clearance, bounded jobs |
| Infra | migrations, files, auth/cache, dashboard, worker | backup/restore, privacy, reasonable p95, request IDs, job retry |

If runtime QA discovers a distinct problem, document a reproducible **NEW-XX** defect in [TASK-TRACKER.md](TASK-TRACKER.md), assign it to the **existing task** that owns the flow, and create a new task only if genuinely separate work is required. Avoid another PRD/DLD.

## 4. Minimum task PR handoff

```text
FIX ID, owner, original TASK mappings, approved policy:
main baseline SHA and work branch/PR:
Code before/after; API, schema and UI touched:
BEFORE old working journey and actual baseline evidence:
FIX-XX-FE01 browser 360/768/1366 outcome:
FIX-XX-BE01 API/Postgres/tenant/CSRF/financial outcome:
FIX-XX-NFR01 workload, p50/p95 or race/retry/worker result:
Affected BASE-XX unchanged flows before/after:
Data migration and exact old money/receipt/TC preservation:
Open defects, reviewer decision, merged SHA:
```

**Do not merge to `main` or mark DONE solely because docs or source code exist.** Each task ships complete FE+BE and its NFR checks, with a separately reviewed final integration gate.
