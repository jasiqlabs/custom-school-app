# School ERP — Corrective Release PRD (Web + API + NFR)
**Document status:** Source-reviewed corrective requirements, **not runtime-verified**.  
**Baseline:** `jasiqlabs/custom-school-app` `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0`, reviewed 2026-10-30.  
**Branch:** `fix/school-erp-functional-nfr-audit-20261030`.  
**Scope:** Address regressions, incomplete workflows and NFR defects across the existing 35-task development programme. **Do not build a second competing school product.**  
**Implementation ledger:** [TASK-TRACKER.md](TASK-TRACKER.md). **Design:** [DLD.md](DLD.md). The existing `docs/school-erp-development-plan/TASK-TRACKER.md` remains the historic status of the 35 original requirements; this tracker owns **only corrective work** and must reconcile accepted completion back to original tasks.

## 1. Product goal and delivery contract

A school manager must be able to set up a school/year, admit and maintain students, run transport, configure and collect multiple fee types, void/print/download receipts, run reports, close/promote a year, issue school TCs and (only if commercially approved) exam admit cards. A report-viewer must see only explicitly approved reports and exports **without any write access or exposure of unauthorized student PII**. A platform administrator must retain existing school activation and TC workflows.

**Refactor/rewrite allowed:** Replace existing implementation inside owned modules, API clients, storage adapters and UI components when beneficial. **Forbidden:** broken old routes/buttons, lost historic students/payments/files, unexpected changed money, tenant leaks, weakened permissions, unmeasured major performance regressions, or reliance on future incomplete task code.

**Cutover:** Additive, compatibility-preserving migrations and safe flags where needed. Historical payment/receipt/TC snapshots are immutable facts. Production databases must not be reset or backfilled by guessing historical dates/values. A corrective task is done only after actual FE + BE/API/DB + NFR + old-feature regression, approved by a reviewer.

## 2. Evidence classification (must not overstate certainty)

**Confirmed from source** means the code directly exhibits the described behavior; **Gap observed** means essential specified workflow/model/controller was not found; **Verification risk** means source suggests a vulnerability or missing acceptance but it requires browser, live DB, concurrency or operational testing. No performance timings, UI browser tests, real migration outcomes or production security tests were executed in this planning review.

| Issue | Priority | Evidence | User-visible impact | Main source evidence |
|---|---|---|---|---|
| SEC-01 | P0 | Confirmed | REPORT_VIEWER can reach Transport write routes through inherited `transports.read` capability | `apps/api/src/modules/transports/controllers/transports.controller.ts`, `common/security/capability.guard.ts` |
| SEC-02 | P0 | Confirmed | GET student-profile read includes private/contact/family data with viewer's `students.read` capability; scope not reports-only | `capability.guard.ts`, `students.controller.ts`, `search-students.service.ts` |
| SEC-03 | P1 | Verification risk | Broader operator/Platform Admin routes, exports, file links and cache partition must be exhaustively enumerated for role/school scope | all controllers, file/download endpoints, `apps/web/src/components/shell.tsx` |
| FIN-01 | P0 | Confirmed | Charge-based payment reads `FeeCharge` without a row/account lock; concurrent pay risks lost balance/overcollection | `fees/application/collect-payment.service.ts` |
| FIN-02 | P0 | Confirmed | Void reads required legacy `payment.due_id` and reverses FeeDue only, not FeePaymentAllocation/FeeCharge; fails new multi-charge receipts | `fees/application/void-payment.service.ts`, `prisma/schema.prisma` |
| FIN-03 | P0 | Confirmed | Pending-fees GET generates due and charge for every active student, including report viewer; student fee summary GET also writes | `query-pending-fees.service.ts`, `fees-public.facade.ts`, `collect-payment.service.ts:getStudentDues` |
| FIN-04 | P0 | Confirmed | TC issuance has no mandatory fee-clearance guard, despite checker existing | `platform-admin/tc/tc.service.ts:issue`, `fees-public.facade.ts:checkStudentDocumentClearance` |
| FIN-05 | P0 | Confirmed | Admit Card clearance is a pre-issue read outside issuance transaction; concurrent due creation/void can race | `examination/application/admit-cards.service.ts` |
| FIN-06 | P1 | Confirmed | Existing unpaid Books/Uniform charge deleted on profile toggle instead of audited adjustment/cancel history | `students/application/update-student-profile.service.ts` |
| FIN-07 | P1 | Confirmed | Payment idempotency lookup returns prior receipt without comparing current request payload; no hash stored on create | `collect-payment.service.ts` and `FeePayment.requestHash` model |
| FIN-08 | P1 | Confirmed | Financial assessment/report/receipt uses `Number(Decimal)`, `roundHalfUp`, float arithmetic for posted values | fee services, pending report and receipt projection |
| FIN-09 | P1 | Verification risk | Legacy FeeDue↔FeeCharge bridge, per-month report totals and void reversal may diverge or double count; needs zero-variance migration tests | `FeeDue`, `FeeCharge`, `FeePaymentAllocation`, pending/due/receipt paths |
| FIN-10 | P1 | Confirmed | Report GET loops sequentially through all enrolled students and assesses dues twice/student | `query-pending-fees.service.ts` |
| FIN-11 | P1 | Verification risk | Date-effective admission, class/section changes and past transport service eligibility can use current/active fallback and recreate ineligible charges | `generate-dues.service.ts`, Student/Transport services |
| FIN-12 | P1 | Gap observed | Audited FeeAdjustment workflow and historical import/opening-balance reconciliation are incomplete/absent | Prisma schema, finance services, import screens |
| ACAD-01 | P1 | Confirmed | Academic close immediately sets CLOSED, with no staged promotions, conflict review, journal or final switch | `academic-sessions.service.ts:close`, `academic-sessions-view.tsx` |
| ACAD-02 | P1 | Gap observed | Coordinated leave/pass-out/return and re-admission with durable effective-date orchestration missing | `change-student-status.service.ts`; no exit/rejoin workflow models |
| ACAD-03 | P1 | Verification risk | Historical enrollment mapping, overlaps, stale directory responses and year-scoped reports need end-to-end correctness checks | `studentEnrollment`, `change-student-enrollment.service.ts`, directory and report APIs |
| DOC-01 | P1 | Gap observed | Operator TC issuance route, new school identifiers/history on TC, two-copy Office/Student receipt, standalone PDF receipt download and collector snapshot incomplete | TC controller/service, fee controller, history/collect UI |
| DOC-02 | P1 | Gap observed | School-configurable receipt/SR continuous vs academic/fiscal-year numbering with uniqueness testing not delivered | numbering allocators, Prisma schema |
| EXAM-01 | P1 | Confirmed | Exam candidate list uses unbounded `Promise.all` to run one fee-clearance query per student | `exam-contexts.service.ts:getStudentsWithClearance` |
| EXAM-02 | P1 | Verification risk | Admit-card bulk issuance lacks bounded/background batching and reliable per-student transactional fee clearance; PDF worker retry, tenant and status need real tests | `admit-cards.service.ts`, `apps/worker/src/main.ts` |
| WEB-01 | P1 | Confirmed | Admission selector offers DRAFT and server rejects only CLOSED, allowing DRAFT admission instead of ACTIVE-only enrollment | `students/new/ui.tsx`, `admit-student.service.ts` |
| WEB-02 | P1 | Confirmed | Fee UI creates a fresh idempotency key on every retry, so network-timeout retry can record another payment | `fees/collect/ui.tsx` |
| WEB-03 | P1 | Confirmed | Admit-card UI says PDF ready immediately on successful issue response although issue may remain QUEUED; bulk result similarly overstates completion | `exams/[id]/admit-cards/ui.tsx` |
| WEB-04 | P1 | Verification risk | History/filter search, archived-year edit controls, student profile's 5,000-line component, transport role UI and stale async response must pass actual browser walkthrough | student, fees, transport, academic year web modules |
| WEB-05 | P2 | Gap observed | Pending fee report/print/history lacks unified historical year/as-of distinction; print and PDF flows need parity and downloadable receipts | fees pages, reporting clients, receipts |
| WEB-06 | P2 | Verification risk | Import error download uses raw API URL; cookies, cross-domain session, error status and file naming must be tested in actual deployments | `students/import/ui.tsx`, `students-api-client.ts` |
| OPS-01 | P1 | Verification risk | Migrations 0008–0014, recovery helper, deploy script and source constraints not yet rehearsed on realistic data; never edit already applied migration | `prisma/migrations`, `scripts/deploy-migrations.mjs` |
| OPS-02 | P1 | Verification risk | UI static tests and mocked API tests cannot establish real browser, DB concurrency, worker resilience or performance targets | `apps/web/package.json`, `apps/worker/package.json`, test scripts |
| OPS-03 | P1 | Verification risk | Multi-tenant cache, N+1 query usage, export workload, XLSX limits, job backpressure, secure PDF URLs need measured checks | dashboard cache, exports, exam/services, worker |

**Review scope:** All discoverable `apps/web/src/app` page/UI entry points, all Nest controllers, related contracts/validation, school/Student/Fees/Transport/Exam services, Prisma schema/migrations, and worker/deployment scripts are included in the **route and scenario audit**. The items above are source-grounded findings, **not a promise that zero other runtime bugs exist**. New findings during exhaustive runtime QA must be appended to the single corrective tracker with a reproduction and grouped under the appropriate workstream.

## 3. Required end-to-end product journeys

1. **School bootstrap**: Platform Admin creates DRAFT school, official identity, classes/sections, DRAFT/ACTIVE year, resolves readiness, activates school, provisions manager, first login succeeds; old ACTIVE schools not locked out.
2. **Role/tenant segregation**: Manager can admit, edit, transport, collect, void, configure, report; viewer can only access specifically allowed aggregate/student-summary reports/exports, cannot mutate via transport/hidden API/download; School A never sees School B.
3. **Admission**: Only ACTIVE year selectable; nullable Aadhaar, correct school UDISE in admission print; Books/Uniform options resolved server-side; no duplicate one-time charge.
4. **Student lifecycle**: Date-effective class change, leave/pass-out, transport stop, fee accrual cutoff, later re-admission with same student ID and old debt/TC preserved.
5. **Academic year transition**: PREPARE promotion/repeat/pass-out changes, operator resolves conflicts, CLOSED old year + ACTIVE next year only after crash-safe finalization; old statements/receipts remain.
6. **Money setup & assessment**: Categories and rule priority/effective date, monthly tuition, optional transport, exam, registration, admission, books, uniform, other/late only by approved policy, no earlier/ineligible months.
7. **Collection**: Multi-item one receipt, partial and old-month allocation, exact money, stable idempotency retry, concurrent payments safe and same-day void reverses all original source charges.
8. **Reports/exports**: Pure read, no creation of charges, viewer protected, month/year/as-of totals match exact immutable source; 500/5k student workloads measured.
9. **Opening balances**: Preview/import external starting balances with provenance, no fabricated SaaS receipts, dedupe/restart/reconcile.
10. **TC**: Both Platform Admin and authorized manager share one guarded issue service, server checks fee clearance in same account consistency boundary, old TC downloads unchanged; versioned new TC includes school identifiers and historical class.
11. **Receipts**: Printable two labeled copies and downloadable PDF from history with the **same frozen payment snapshot**, collector recorded at issue time; old and voided receipts unchanged.
12. **Admit Card (paid CR)**: Exam context and student list, only cleared students issued via server under safe fee guard, status QUEUED vs COMPLETED accurate, retry/download authorized and scalable.

## 4. Web acceptance contract

Every impacted route must demonstrate actual browser use on **360px, 768px, 1366px** with appropriate navigation, keyboard focus, empty/loading/error/stale/permission states, duplicate-submit controls, retained form inputs after error, no dead CTAs, no stale school/year data. Critical endpoints must agree with displayed amounts and statuses (no merely cosmetic success). Avoid unnecessary redesign; splitting very large components is allowed when it reduces regression risk. Preserve old menu entry points and URLs or implement reviewed redirects.

**Route families to trace:** public landing + admin/auth/schools/operators/academics/TC; operator dashboard, login/forgot password, student directory/new/profile/import/admission-print, academics, fees setup/pending/collect/history, transport route/stoppage/assignment/count, exams list/new/edit/candidate/admit-card. FE test each with manager, viewer, expired session, School A/B, normal and error response. The UI must never be the only authorization gate.

## 5. Backend/DB/API contract

- Preserve all existing public HTTP methods and typed shapes until **test-proven** adapter/cutover. New DTOs in `packages/contracts`, validators in `packages/validation`, domain ownership via facades/ports.
- Every operator method has explicit role capability (read/export distinct from mutation), session-derived tenant, anti-CSRF for writes and private signed-file check at retrieval. No unapproved viewing full student profile, Aadhaar, family/private fields by REPORT_VIEWER.
- No monetary modifications during GET/export/report/clearance preview. Move assessment to explicit idempotent authorized commands or background worker. No duplicate fees from a subsequent page view.
- Fee writes **must serialize per StudentFeeAccount** and use exact Decimal in both old/new paths; payment idempotency binds a canonical request hash. Payment VOID reverses every allocation exactly once and retains old receipts.
- Preserve Student UUID, old year/class snapshots, original source charge month/year, paid receipt and TC encrypted snapshot/hash. Fix incomplete history by **adding** events/adjustments, not deleting old records.
- Long operations/imports/rollover/PDF issuance have bounded batches, durable progress and job retry, meaningful error and auditable partial recovery. Every inter-module mutation uses authorized public facade.
- Live database migrations are additive, replayable and rehearsed, with zero monetary variance and successful old-record reads. Current migration checks are valuable but are **not** a live rehearsal.

## 6. NFR acceptance targets and evidence

| Dimension | Requirement and evidence |
|---|---|
| Availability | Retain existing 99.5% product target; graceful error without partial writes and clear queued-job progress |
| Latency | Verify approved baseline thresholds: exact ID lookup p95 <1s at 5k students, name search p95 <1.5s, dashboard p95 <3s at 2k; all changed endpoints require old/new p50/p95 comparison |
| Scale | Normal 10–12 schools ×300–500 students; stress 5k per school, 24–60 fee months, 500–5k promotions/import rows, 20–50 parallel payments/clearance, 100 queued documents |
| Consistency | 0 paise balance variance per school/student/month/category, no double allocation, 100 parallel receipt IDs unique, 0 duplicate enrollment from year transition |
| Isolation | Cross-school foreign UUID returns 404/no data, viewer forbidden write 403, direct reports/downloads role tested, privacy redaction and Excel formula escaping |
| Security | Session revocation after role change, CSRF on writes, encrypted PII, private object files and signed URL expiry, no raw Aadhaar in logs/receipts |
| Workers | Bounded concurrency, retry/crash resume, outbox/job idempotency, no stale 'PDF ready' message while queued |
| Responsive/accessible | 360/768/1366 layouts, no overlap or clipping, WCAG 2.1 AA keyboard/labels/focus, A4 receipts/TC with ₹ Unicode and long school names |
| Migration | Staging clone rehearsal, old/new read interoperability, per-school counts/reconciliation, SQL EXPLAIN, backup/restore, safe roll-forward after posted financial events |
| Observability | Request ID, school/actor context without PII, job progress/failure, assessment/payment reconciliation alerts, throughput/DB connection/error measurements |

No invented PASS: log actual hardware, fixture, command, p50/p95, SQL plan, memory, API status, tested commit, screenshot and reviewer. Node static QA/Jest mocked unit suite alone does **not** verify operational NFR.

## 7. Scope boundaries and approvals

- This is a **corrective release**. Do not add attendance, payroll, full exam grading, stock management or separate inventory just to address a bug.
- Outstanding product policies in original [DECISIONS.md](../school-erp-development-plan/DECISIONS.md) remain open until explicitly approved: fee proration, concession effective date, opening balance source, promotion timing, TC blocks/overrides, numbering, legacy mappings, etc.
- Admit Card Generator (`TASK-034/035`) has a **paid-CR gate**: even though code is on main, further scope changes or acceptance require commercial approval, not implied by code.
- No forced rewrite or data wipe. Refactor only as needed for durable correctness. Avoid new PRD/DLD per bug. Developer documents progress **only** in this corrective tracker and links back to original TASK IDs.
- Final approval requires source code review, executed FE/BE/NFR tests, migration and regression tests and reviewer acceptance. This planning branch does **not** itself implement fixes or certify functionality.
