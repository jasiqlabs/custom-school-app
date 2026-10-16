# School ERP — Target Architecture & Engineering Decisions (Clean Edition)

**Status:** Proposed extension design, **not automatically approved canonical Harness DLD**. **Reviewed code:** `main@3d5a609f50be88af8366338bc7466316b435bbc1` on 16 October 2026. **Change type:** brownfield, compatibility-preserving delivery across 35 tasks. **Source of implementation status:** [TASK-TRACKER.md](TASK-TRACKER.md). Review `AGENTS.md` and approved `jasiq-harness/jasiq-specs/projects/custom-school-app` PRD/HLD/stories/UIUX/DLD before implementation.

## 1. Non-negotiable architecture acceptance criteria

- **Safe evolution, not a blank database:** Current operator login, admin setup, class/section maintenance, student admission/import, transport, monthly tuition, part/full payments, void, receipts, dashboard/report XLSX, platform-admin TC and private files are in use. A rewrite is allowed, but cannot remove functioning supported behavior without an approved replacement and migration. Maintain stable API adapters through cutover.
- **Ownership boundaries:** School domain = school profile/identifiers/activation/operators. Academics = school-year state. Students = permanent student identity, yearly enrollments, changes, leaving/rejoining. Fees = categories/rules, assessment/charges, allocations, balances, receipts/void. Transport = route, stoppage, effective assignment and cessation. Document issuer (existing TC owner, future separately paid Admit Card) = frozen issuance snapshots, issue status. Foundation = authorization, audit, private file, job/outbox, encryption and time/transaction primitives. No new cross-domain repository queries.
- **Client/server contracts:** Typed Zod in `packages/validation`, shared public DTOs/ports in `packages/contracts`; actual controllers live in Nest app; web uses central API clients, not duplicated ad-hoc fetches. Retain route methods and old request bodies with adapters until all active consumers migrate.
- **Failure and security:** `schoolId` derives from trusted actor, never request JSON for operator API; manager/report-viewer authorization on every method including GET and export, plus CSRF on POST/PUT/PATCH/DELETE; 404 for foreign-school resource, 403 for forbidden capability. Secure caching/no-store and session revocation on role change. Worker payload `{jobId}` only. File URL authorized at issue/download, not just UI.
- **Finance and history:** all monetary authority PostgreSQL NUMERIC(12,2) / Decimal, no binary floating-point posting. Payments and snapshots append-only; void is auditable reversing event; no mutating paid original financial facts. Past-year arrears are balances on original obligations, not new charges. Enrollment/transport/fee start/stop effective dates obey approved school-local policy.
- **Independent increments:** Each `TASK-XXX` is fully deployable when its explicitly listed lower-numbered dependencies are done. No API call, CTA, migration constraint, or background job depends on a future task. UI must hide incomplete future actions rather than 404.

## 2. Actual baseline components (do not invent them)

| Existing | Real code | Constraint for implementation |
|---|---|---|
| Auth | `apps/api/src/common/security/session.guard.ts`, `platform/auth/session.service.ts` | `OperatorGuard` only checks OPERATOR today; add capability checks without weakening authentication |
| Student | `apps/api/src/modules/students/application/*`, `prisma Student/StudentEnrollment` | Enrollment is not year-specific yet; old code expects ACTIVE enrollment |
| Fees | `apps/api/src/modules/fees/application/*`, `prisma ClassFeeConfig/FeeDue/FeePayment` | One FeeDue per student/month and one Payment.dueId; report projections sometimes generate missing dues |
| Transport | `apps/api/src/modules/transports/facade/transports-public.facade.ts` | Current Student profile and Fees code have direct sibling table access; isolate safely |
| TC | `apps/api/src/modules/platform-admin/tc/tc.service.ts`; `apps/worker/src/tc-pdf-builder.ts` | Existing admin issue/list/get/retry/download, encrypted snapshot and job; don't fork repository |
| Web | `apps/web/src/app/operator/**`, `apps/web/src/app/admin/**` | Existing responsive pages, API clients, print view; preserve meaningful actions |
| QA | `apps/api/**/*.spec.ts`, `scripts/static-qa.mjs` | API Jest mocks exist; `apps/web test` / worker `test` call static QA only, **not browser E2E** |

## 3. Core domain relations / state ownership

```text
School (tenant)
  ├─ AcademicSession(id, schoolId, code, startDate, endDate, status, version)
  ├─ Class / Section  [existing, school-scoped; remain school master data]
  ├─ SchoolOperator + role/permissions
  ├─ Student(id stable; schoolId)
  │   ├─ Enrollment(studentId, academicSessionId, classId, sectionId,
  │   │             effectiveFrom, effectiveTo, year/class/section label snapshots)
  │   ├─ Status/exit event, re-admission event, transition batch decision
  │   ├─ TransportAssignment   [owned by Transport; date-effective]
  │   └─ FeeAccount [owned by Fees]
  │       ├─ FeeCharge(id, student, category, origin session, charge period, source key)
  │       ├─ FeeAdjustment [append-only accounting adjustments]
  │       └─ FeePayment(id, receipt number, collector snapshot)
  │           └─ FeePaymentAllocation(paymentId, chargeId, amount)
  ├─ TC [existing owner; immutable issue snapshot → Job → SchoolFile]
  └─ AdmitCard [new only after paid CR approval; immutable issue snapshot]
```

**Identity:** Student UUID persists across graduation, exit, re-admission and academic years. Student Code/SR is display identifier; any reset must remain school-unique. Authentication `UserSession` is unrelated to `AcademicSession`. A `FeeCharge` belongs to original academic session/period; payment happens on a separate collection date. Current `Student.status` is not a substitute for year-specific `Enrollment` or an official TC.

**States:** AcademicSession `DRAFT → ACTIVE → CLOSING → CLOSED` (no automatic year switch by date). Student admission/transfer/end/rejoin are explicit effective-dated events. Transition decisions are `PREPARED` by TASK-024; actual atomic/chunked academic rollover happens in TASK-025. Private document job `QUEUED → PROCESSING → COMPLETED|FAILED` with bounded authorized retry; reissue ≠ retry.

## 4. New-school bootstrap without circular prerequisites (TASK-007, TASK-011)

**Current code evidence:** `OperatorsService.create` rejects non-ACTIVE schools. A school-year created only through authenticated operator would create deadlock if school activation required it.

**Binding architectural rule:** First year can be created by **Platform Admin** under existing platform auth for a DRAFT School, using the same AcademicsSessionService as the later school-manager routes. School remains DRAFT until activated by approved platform flow. After activation, provision/log in the first operator. TASK-011 can add further readiness rules, but must resolve `NO_OPERATOR` with either a secure provisional operator who cannot log in until school ACTIVE, or an advisory warning and post-activation provisioning. Existing ACTIVE schools lacking new year data remain functional under reviewed legacy compatibility, not forcibly locked out.

**E2E:** New school DRAFT → create Class/Section, initial academic session via platform admin → activate school → provision operator → operator login → admit student. Tenant B must never see school A setup.

## 5. Explicit migration/compatibility protocol

Every persisted schema change must document:

1. **EXPAND**: additive tables/nullable FKs/columns, old reads/writes still supported; no lock-heavy table rewrite during production availability.
2. **SHADOW & BACKFILL**: deterministic, idempotent migration per tenant with before/after row counts, referential integrity, impossible-to-infer historic years flagged for human review, historical receipts untouched.
3. **RECONCILE**: exact student/enrollment/fee/TC IDs preserved; fee paid/due/void counts and rupee totals match to **₹0.00 variance** per school and period. File SHA256 immutable.
4. **FEATURE-CUTOVER**: versioned adapters and flags per tenant; server+web+worker contract version compatible in either deployment order. Existing pages not routed to unimplemented backend.
5. **RECOVERY**: backup/restore tested, writes flag reversible where safe, completed new financial events not rolled back by dropping tables. Document how to roll **forward safely** if financial mutations already happened.
6. **CONTRACT**: remove legacy paths/columns only in later approved separate change, not in the enabling task.

**Academic year history:** New `Enrollment.academicSessionId` initially nullable; don't map an old enrollment to today's session just to satisfy NOT NULL. Record `UNVERIFIED_LEGACY` mapping if proof missing. Use versioned read adapter and final constraint only after reviewed backfill. Server-only school, class, session FK validation and unique active-per-year constraints; PostgreSQL partial unique index with school scoping. Once moved to year segments, every old-year class/section snapshot is immutable.

**Finance:** Keep `FeeDue`, `FeePayment.dueId`, old ReceiptSequence while adding `FeeCharge` + `FeePaymentAllocation` + mapping from legacy due to charge. All balances calculated from **one unified projection** that de-duplicates legacy shadow rows. Old simple POST payment adapts to one allocation; new payment supports many charges. Payment request idempotency key + hash; old void status and original receipt number retained. Do not union two ledger sources and double count.

## 6. Fees / category rule / eligibility algorithms

### Definitions
- `FeeCategory` is per-school classification with event/one-time/recurring/manual kind, disabled category remains visible historically.
- `FeeRule` controls applicability by school, class, academic session if known, effective date, recurrence and amount; published rule version snapshots on assessed charges. Session optional on legacy school until TASK-007/008 backfill.
- `FeeCharge` is a unique assessed obligation; sourceKey should include school/student/category/period/origin event, NOT only the month. Different categories can coexist for same month.
- `FeePaymentAllocation` is paid portion of a particular immutable source charge, with payment-time snapshots and void reversal semantics.
- `FeeAdjustment` is explicit authorized correction with reason and audit; never silently rewrite paid historical charge/receipt.
- `FeeAccount` is a per-student owned lock/version boundary for all charge, adjustment, pay, void, opening import and document clearance operations.

### Normal financial invariants

```text
netAssessed(charge) = base + fine - concession + SUM(approved adjustments)
paid(charge)        = SUM(allocations belonging to ACTIVE payments)
balance(charge)     = netAssessed - paid   [must be >= 0 unless approved credit-account model]
payment.amount      = SUM(payment allocations)
totalOutstanding    = SUM(balance of distinct ORIGINAL eligible charges)
```

Round at deterministic line/period boundaries under approved India currency rule using Decimal, never accumulative `Number()` floats to post. Void reverses allocations under existing same-day rule. Receipt is payment-time snapshot and must show original allocation, collector and status even if student later switches class.

### Effective date and read correctness
- Bill only when a school/student is eligible under session + effective-dated enrollment + category rule; transport requires dated active assignment through Transport facade. Mid-month start/stop/proration/class-change conventions need explicit school policy decision. No guessed retroactive charges for school onboarding.
- `GET /student/fee-summary` currently may create dues. A report-viewer must **never** cause a DB mutation by reading a report. During TASK-001/002 use truly read-only projections; by TASK-013 migrate new assessment to explicit authenticated idempotent command. No write-through in permitted report GET/export.
- Older months: show **original** unpaid charge dates and balances within today's statement, do not clone arrears into next month or next year. Older paid receipt remains retrievable.

## 7. Serializable clearance for TC and Admit Card

**Failure mode to prevent:** A loose `GET /fees/pending` check followed by TC issue can race with charge creation or payment void; locking only currently existing charge rows misses newly inserted overdue charge.

**Approved-design candidate for review:** `StudentFeeAccount(schoolId,studentId,ledgerRevision)` unique; ALL fee-account writers lock this row via FeesPublicFacade before creating/adjusting charges, paying, voiding or importing, then increment revision. TC issue obtains the **same lock through a transaction-bound public facade**, verifies all eligible dues and missing-assessment policy, and inserts encrypted frozen issue + audit/outbox job inside protected transaction. If no shared transaction design can honor module boundaries, use explicit document-clearance reservation state (not a stale boolean) and document serializable reconciliation. Worker only renders an *existing authorized* issue by job ID. Old completed TC downloads unaffected by newly unpaid fees.

**API error contract (proposed):** `409 ERR_FEES_PENDING_FOR_TC` with safe total/breakdown, no issue/job. For Admit Cards, `ERR_FEES_PENDING_FOR_ADMIT_CARD` per student and approved cutoff. `404` cross tenant, `403` role, `422` invalid field, `503` temporary underlying service failure. No override switch without approved authorized write-off flow.

## 8. Multi-owner workflows and rollover correctness

**Student exit:** User enters effective date/type/reason; Students service owns ExitWorkflow status, publishes idempotent steps for TransportPublicFacade.stopServiceEffective and FeesPublicFacade.stopFutureAccrual. Already assessed fee remains outstanding unless explicit adjustment, never deleted. Only finalize student exit after all mandatory downstream effects are applied or an audited compensating failure state is visible. TC issue alone does **not** auto-exit until owner approves that policy.

**Promotion / repeat / pass-out:** TASK-024 produces reviewed `PREPARED` rows and reports conflicts/errors, with no change to actual current enrollment. TASK-025 persists durable `CLOSING` coordinator and idempotent per-student finalization journal. Do not expose partially applied target active-year students to normal reads/fee generators. Pin old active context or use reviewed temporary write-lock/transition view until source CLOSED and target ACTIVE switch verified. Crash after any chunk resumes from journal; no double enrollment or charges. Close does not pay/write off old-year arrears.

**Returning student:** Reuse stable Student UUID and prior enrollment history; explicit target session/date/class/section, no implicit previous transport assignment; one-time admission fee policy controlled separately.

## 9. Authorization compatibility and report permissions

- `MANAGER` = all currently supported school operator workflows; `REPORT_VIEWER` = only explicit allowed report API GET and authorized export endpoints, never all GET.
- Enumerate real controllers: `students.controller.ts`, `fees.controller.ts`, `transports.controller.ts`, `operator-dashboard.controller.ts`, `student-import.controller.ts` plus new controllers and private downloads. An `@RequiresCapability(...)` or equivalent must be enforced **server-side** per endpoint. Existing MANAGER route behavior cannot disappear in rollout.
- `SchoolOperator.accountVersion` already exists. Role change increments version and revokes sessions; old tokens become invalid immediately. Never use client UI hide as security.
- GET reports cannot issue private data/charge mutation. POST `/operator/fees/exports/pending` is a read-data export with CSRF, so use `reports.export` capability without handing viewer broad POST mutation rights.
- Cached dashboards, reports and files partition by schoolId + actor/role + academic session and relevant filters. Recheck role at signed-download retrieval; don't persist a public file URL.

## 10. Frontend, accessibility, and error handling contract

Each feature must have: loading, empty, error, success, duplicate-submit, stale-data/409 and safe retry states; strong labels, clear helper text, preserved navigation/back actions, keyboard focus and 360/768/1366 layout. New screens should reuse school design tokens and existing API client wrappers. A UI redesign is allowed **only** if existing operator journeys remain fully completable and discoverable (no hidden actions without replacement). Reports-only operator sees clearly scoped reports instead of nonworking module navigation. Legacy admin and operator links must remain valid or redirect to an authorized equivalent.

Each official print/download must have stable A4 pagination, Unicode ₹ glyph, no clipped rows, school logo/signature from authorized existing private files, immutable amount/issuer/year snapshots. Never render real Aadhaar unless explicitly approved.

## 11. NFR acceptance and review tiers

**Inherited targets from approved product:** exact student-ID search p95 <1s at 5k students, name search p95 <1.5s, dashboard p95 <3s at 2k students, 99.5% target availability, at least 7-year historical record retention subject to law, WCAG 2.1 AA. A proposed new load test (e.g., 5000 students x24 months or 50 PDFs) is an acceptance **workload**, not an agreed new latency SLO. For each task, measure p50/p95, memory/CPU/SQL EXPLAIN and before-vs-after fixture with clear equipment.

**Senior review required** for RBAC/session, encrypted Aadhaar, academic enrollment/exit/rollover, fee/ledger/backfill, payment/void/receipt, TC clearance/issuance, private documents/worker and schema changes affecting old rows. Intern can implement with supervision; intern alone cannot approve merge. Low-risk visual/nullable form changes still need independent regression review.

## 12. Related docs and authority

- [README](README.md) — one task list and handoff.
- [TASK-TRACKER](TASK-TRACKER.md) — **only** work status.
- [INTERN-RUNBOOK](INTERN-RUNBOOK.md) — exact development steps.
- [REGRESSION-BASELINE](REGRESSION-BASELINE.md) — baseline 16 workflows.
- [TASK-IMPACT-MATRIX](TASK-IMPACT-MATRIX.md) — current source paths and per-task mandatory regression suites.
- [DECISIONS](DECISIONS.md) — genuine unresolved policy choices (not invented defaults).
- [ENGINEERING-REVIEW](ENGINEERING-REVIEW.md) — static audit observations and risks.

**Do not change canonical Harness documentation without its required revision process; do not merge this planning branch before an explicit merge decision.**
