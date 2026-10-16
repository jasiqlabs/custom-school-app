# Architecture Review and Target Extension Design (Proposed ADRs; not yet approved)

**Scope:** The original 26 tasks are **not sufficient** to cover all 10 research-PDF clarifications. This package adds CL-01..CL-06 and converts implicit business rules into explicit, separately approved decisions. This document is an **architecture proposal**, not a replacement for approved JASIQ Harness PRD/HLD/DLD. Implementation must await approved scope and canonical planning revision.

## 0. Existing approved contract and conflicts to resolve

Authoritative sources (read on 2026-10-16):
- `jasiqlabs/jasiq-harness/jasiq-specs/projects/custom-school-app/product/prd.md` **v2.0.0 APPROVED**.
- `architecture/hld.md` **v2.0.0 APPROVED**: NestJS modular monolith, Next.js 15 responsive web, Postgres 16/Prisma, Redis 7/BullMQ, private tenant files; use public ports/facades across modules.
- `design/dld/04-fee-management-dld.md` **v2.0.0 APPROVED**: monthly `FeeDue`, one-due-per-payment, snapshots, same-day void and nonretroactive generated charge snapshots.
- `custom-school-app/AGENTS.md`: approved Harness planning/user stories/UIUX/DLD are binding.

**Explicit conflicts:** PRD §2 lists **automatic academic-year rollover** and **exams** out of original MVP scope; PRD FR-STU-001 says **Aadhaar is required**; FR-ADMIN-007 makes TC issuance a **platform-admin capability**; FR-FEE-001..010 constrain MVP to monthly per-class dues. Client-requested optional Aadhaar, operator TC, multi-category fees, manual/assisted academic year transitions and Admit Card Generator change these contracts. PDF page 6 has NO marked client decisions. Thus **none** of these become approved simply because they appear in this specification. Harness revision and human approval is blocking.

**Important code-vs-approved-DLD inconsistency:** `generate-dues.service.ts` currently recalculates pending dues when concession changes, while approved DLD says already generated dues are immutable and new rules apply only to future not-yet-generated periods. FE-06/FE-07 must explicitly resolve this discrepancy via approved correction/adjustment model; do not silently back-edit historical debt.

## 1. Ownership map: one authority per business aggregate

| Owner | Owned state / data | Exposes via public port/facade | Must not do |
|---|---|---|---|
| Platform Admin / School | School profiles, codes, principal, operators, tenant enablement | SchoolInfoPublicFacade, SchoolReadiness status | Own student/fee balances |
| Academics (new school scoped) | AcademicSession lifecycle, validated current session, session closure | AcademicSessionPublicFacade, session eligibility | Directly mutate student/fees/transport internal tables |
| Students | Student identity, StudentEnrollment history, promotion/exit/rejoin state | StudentsPublicFacade (identity/enrollment/eligibility) | Read `fee_dues` or `fee_charges` via Prisma |
| Fees | FeeCategory, FeeRule, FeeCharge, FeePayment, allocations, opening balance entries, numbering/receipt snapshots | FeesPublicFacade: obligations, collect, clearance, summary | Change student identity/enrollment directly |
| Transport | Assigned route/stoppage/service dates | TransportPublicFacade: terminate future service from date | Mutate fees or student rows directly |
| Documents (TC within platform-admin existing owner unless approved module revision) | TC/document issue, frozen snapshots, jobs/file manifests; Admit Card separate paid CR | DocumentsPublicFacade: request/inspect/download | Bypass fee clearance or own fee logic |
| Dashboard | Composed read-only summary | Uses public facades | Reach into other domain tables or pretend own ledger |
| Foundation | Auth, audit, private storage, queue, idempotency primitives | Shared infrastructure | Absorb business session, finance policy |

**Migration of module ownership requires approval.** TC remains owned by platform-admin in existing HLD; operator controller should delegate into its published issuance facade, not create a second conflicting TC repository. For complex coupled exit/TC: implement an explicit **application workflow coordinator** using public commands and outbox/saga, while each owner updates only its domain. Never create circular constructor/DB dependencies.

## 2. Separation of identities / time axes

**Keep distinct:**
- `UserSession`: authentication/login, expires on inactivity.
- `AcademicSession`: school year (often 2026-27), school-owned ACTIVE/CLOSED.
- `Student`: stable person/tenant UUID and history across years, school active/inactive not interchangeable with annually enrolled.
- `StudentEnrollment`: time-bounded student/class/section placement with `academicSessionId`, start/end dates, reason, historical snapshots.
- `FeeCharge`: immutable assessed **obligation** tied to original session/period/type/due date.
- `FeePaymentAllocation`: amount applied to an existing charge (never creates an artificial carryforward bill).
- `TransportAssignment`: separately dated service that may cross an academic boundary according to policy.
- `TC / AdmitCard`: issued evidence frozen at issue time, not dynamic student data.

**Dates:** business `DATE` in Asia/Kolkata for school calendar; timestamps `timestamptz` stored UTC; session interval `[startDate,endDate]`, closing is explicit state (not auto on calendar expiry). A 2027-04-01 UI/SQL boundary may fall outside 2026-27; enforce date coverage or provide explicit approved exception. Do not default to calendar year.

## 3. Approved-code migration plan (expand → dual-read → backfill → verify → cutover → contract)

### Academic
Add `AcademicSession(schoolId,code,startDate,endDate,status,version,...)`, unique school/code; enforce at most one active session per school by partial SQL unique index. Add nullable `academicSessionId` to historical enrollments, plan per-school legacy assignment with review; keep an old query adapter until all IDs backfilled; **do not automatically assign all old enrollments to today's session**. Guarantee one active enrollment *per student in the active session*, and handle the older invariant of one ACTIVE enrollment globally on cutover. Use explicit overlap constraints for same student historical dates.

### Student leaving, return and corrections
School operational outcome should be explicit (`ENROLLED`, `LEFT`, `PASSED_OUT`, `INACTIVE_OTHER` or approved equivalent), separate from archived enrollment rows and TC issue record. Define leaving effective date and reason, end current enrollment and transport service through owned services, suppress **future** fee generation while preserving already assessed charges. TC generation does **not** automatically imply leaving unless client selects that behavior. Correction uses compensating audited workflow; no silent restored 'ACTIVE' enrollment from previous year. Re-admission creates a fresh session-specific enrollment linked to same student identity; recurring charge eligibility recalculated from new start date, one-time fees obey approved policy.

### Fees
Add `FeeCategory`, `FeeRule`, `FeeCharge`, `FeePaymentAllocation` and `FeeAdjustment` where validated; keep legacy `FeeDue`, `ClassFeeConfig`, `FeePayment.dueId` readable until reconciled. **Never** delete or rewrite paid financial history. Financial invariant for each charge: `netAssessed = sum(activeAllocated) + outstanding`, after authorized adjustments, not mutable ad hoc totals. Every unique charge `sourceKey=(tenant,student,category,applicablePeriod,originEvent)` must be idempotent. For one-time fees key includes approved per-lifetime/per-enrollment scope, not just month. Money numeric(12,2)/decimal, no client floats as authority. Concession change on assessed lines uses explicit adjustment event with reason and before/after audit, never silent recalculation against paid receipts. Leave/transfer stops new charges according to policy, does not erase prior liability.

**Opening balances:** mid-year migration is *not* the same as regenerating past months. Separate approved prior-system opening obligation with `source=OPENING_BALANCE`, reference and as-of date; previous collected amounts may be imported as **externally paid historical entries** with provenance, never forged as a new SaaS receipt or double-posted. Upload preview/reconciliation/confirm is mandatory.

### Receipts / numbering
Receipt number policies scoped to school plus configurable `CONTINUOUS|ACADEMIC_YEAR|FINANCIAL_YEAR` (subject to client decision). Number allocator transactionally locks policy-specific sequence; unique `schoolId,seriesKey,receiptNumber` across historical rows and legacy cross-series collisions; externally visible receipt string includes unique prefix when series resets. Student ID/SR is a **mutable business identifier** with approved numbering policy, but immutable student UUID remains principal FK; historic TC/receipt identity is always snapshotted. Changing policy does not renumber issued files.

## 4. Transactional boundary patterns

### Issuing a new TC / Admit Card with no dues
One **authoritative** `FeesPublicFacade.checkDocumentClearance({schoolId,studentId,documentType,asOfDate,policyVersion})` computes charges due through policy date including prior sessions/opening balances and verified adjustments. Document workflow checks fees inside locked/gated issue transaction or uses a ledger revision token validated again under lock **before enqueue**. Avoid global cross-module Prisma queries by using facade transactional interfaces; if atomic lock across independent modules cannot be honored, use serializable/coordinated transaction or state reservation design and document race tests. No retries that bypass clearance. Previously issued files remain historical; reversal of payment affects **future** issuance only. Typed error with sanitized payable summary.

### Leaving transition
Commands `Students.beginExit` / `Transport.endServiceEffective` / `Fees.stopAccrualEffective` / `Students.finalizeExit` may cross modules. Prefer a coordinator with transactional outbox + idempotent steps and `ExitWorkflow` state to tolerate failures; compensations for partial workflow; never mark exit complete while future generation can still occur. Do not auto-end transport solely from student edit without reviewing effective-date behavior.

### Promotion
Use durable `SessionTransitionBatch` and per-student decisions with source/target sessions. Preview all changes and financial carryover. Bounded transaction/chunk writes with `idempotencyKey`, revalidate locks/row versions, write new enrollment and end source enrollment without deleting history. Distinguish repeat/pass-out/left from TC issuance (TC not implicit).

### Read-only operator
Use deny-by-default capability guards on every protected endpoint, including GET with PII and signed downloads. `REPORT_VIEWER` is **reports only**, not all read endpoints. Existing operators migrate to `MANAGER`; session revocation on downgrade; admin plane remains separately protected. Capability check must occur **before signed URL creation**. Export jobs bind tenant, actor, filter and permission at retrieval time.

## 5. Proposed HTTP API and errors (to be finalized in approved DLD)

Representative `/operator/academic-sessions`, `/operator/academic-sessions/:id/activate|close-preview|close`, `/operator/students/:id/exit|re-admit`, `/operator/onboarding/opening-balances/preview|commit`, `/operator/fees/students/:id/statement`, `/operator/fees/payments` with allocations, `/operator/transfer-certificates`, `/operator/fees/payments/:id/receipt.pdf`. API should use existing versioned route prefix/DTO convention and avoid renaming approved endpoints without an ADR. Prefer 404 for cross-tenant UUID, 403 for disallowed role, 409 for business-state/concurrent conflict, 422 for invalid input, 503 for unavailable async dependency.

## 6. NFR / immutable guarantees and required metrics

**Inherited approved PRD targets:** student code lookup p95 <1s at 5,000 students/school; name lookup p95 <1.5s; dashboard p95 <3s at 2,000 students; 99.5% target monthly availability; retain operational/financial/document history >=7 years subject to legal policy; WCAG 2.1 AA contrast and responsive widths; protected no-store PII/financial resources. New billing/promotion/TC-specific p95 targets must be agreed after baseline measurements, not invented as accepted SLAs.

Measured test profiles: 500-student typical, 5,000-student stress, 24+ months/charges, 10 parallel payment operations, 50 PDF downloads, 500-row transition; DB deadlock/retry, time zone March/April midnight, file encryption/rotation, tenant-BOLA and privilege downgrade. Verify Postgres constraints under concurrent transactions, BullMQ job-ID-only payload, and audit outbox durability.

## 7. Release / authority gates

1. Review the **10 PDF clarification rows**, mark `CURRENT|NEXT_PHASE|NOT_REQUIRED` individually. Do not claim they are approved; PDF boxes blank.
2. Reconcile affected FRs/BRs and new scope into Harness approved PRD/HLD and module planning **revision mode**; preserve existing IDs, register explicit new FR/BR IDs only through canonical governance.
3. Run `/jasiq-stories`, `/jasiq-uiux` and `/jasiq-dld` with Human Approval Gate; **this repository's task specs are a development preparation, not approved canonical DLD**.
4. Confirm new ownership and DAG, ensuring no circular cross-module dependency.
5. Implement additive DB migrations, backfill/reconciliation and compatibility before switching writers; stagger RBAC/document/fee features behind feature toggles.
6. Require independent reviewer to mark task tracker `READY_FOR_REVIEW` → `DONE` only after FE/BE/NFR regression and approved merge.

**Do not** implement Admit Card before separate written CR approval. **Do not** add independent books/uniform inventory or full exams/attendance modules.


## 8. Specific pre-existing source-code boundary violations to avoid propagating

Despite the approved HLD saying `Students`, `Fees` and `Transport` communicate via public facade/port contracts, current `main` contains direct sibling-model access:
1. `students/application/update-student-profile.service.ts` calls `tx.transportAssignment.*` directly.
2. `fees/application/generate-dues.service.ts` calls `prisma.studentEnrollment.*` and `prisma.student.*` directly.

**Design review decision:** new session-aware class/transport/fee eligibility must use a batch `StudentsPublicFacade` and `TransportPublicFacade`, not replicate cross-domain SQL. A safe refactoring may use a shared transaction-bound public port with explicitly passed Prisma transaction context **only if the port owns its internal operations and concurrency semantics**; otherwise use coordinated outbox events. The approved HLD strictly prohibits direct sibling persistence. Add a regression test and lint/code-review checklist to prevent new sibling-model calls. Treat such refactors as high-risk compatibility changes, with functional and ledger golden fixtures before/after.
