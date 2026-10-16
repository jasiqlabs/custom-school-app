# TASK-009 — Effective-dated class and section history

**Owner:** Students · **Requires:** TASK-008 · **Policy gate:** SPEC_SYNC_REQUIRED · **Review risk:** **HIGH** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can effective-dated class and section history.

**Cases to demonstrate:** UC1 Class 2A until 2026-10-14 and Class 3B from 2026-10-15 shows two dated segments; UC2 same-section change preserves original label snapshot; UC3 backdated overlapping change fails unless approved adjustment workflow; UC4 old session CLOSED cannot be edited; UC5 current class query stays correct under compatible reads.

**Policy/eligibility:** No overlapping active effective enrollment segments for one student; exactly one class/section at a specific school date. Approved class change does not itself generate/recalculate tuition; fee eligibility under dated segments is delivered in TASK-014.

**Concrete golden scenario:** Test 2026-10-15 Class 2→3; 14th remains Class 2, 15th Class 3; overlapping/backdated errors 409. Concurrent two operator edits cannot create two active segments. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `apps/api/src/modules/students/application/update-student-profile.service.ts`<br>`apps/api/src/modules/students/application/search-students.service.ts`<br>`prisma/schema.prisma`

**Schema and migration contract from requirement:** StudentEnrollment academicSessionId, classId, sectionId, validFrom DATE, validUntil DATE nullable, endedReason CLASS_CHANGE, classNameSnapshot and sectionNameSnapshot plus version. Constraints school/student/year and exclusion overlap (PostgreSQL range/exclusion or transactional lock with indexed bounds). Legacy Enrollment ACTIVE indicates latest segment only.

**Detailed new DB behavior:** Add validFrom/validUntil dates and endedReason/snapshots to enrollment records without losing current active row. Prevent overlaps via school/student/year locked transaction or Postgres exclusion index; version old segment before new one.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** PATCH /operator/students/:id/enrollment {academicSessionId,classId,sectionId,effectiveDate,expectedVersion,reason?}; GET /operator/students/:id/enrollment-history?sessionId. Response ordered segment history with date bounds; reject 409 overlap/version/closed year, 422 out-of-year date.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Implement class-change command using existing Students service via `PATCH /operator/students/:id/enrollment`; resolve school/session, class and section, assert an ACTIVE session, validate effectiveDate inside session, close old segment and create new in one transaction.

## 4. Service/repository algorithm — implement in this order
1. Implement class-change command using existing Students service via `PATCH /operator/students/:id/enrollment`; resolve school/session, class and section, assert an ACTIVE session, validate effectiveDate inside session, close old segment and create new in one transaction.
2. Expose `getEnrollmentAtDate` bulk/public port and history list. Existing profile should show current class and an auditable previous-class timeline; archived year view is read-only.
3. Do **not** reprice already generated fees here; TASK-014 will use effective dates for eligible pricing. Existing fees must stay compatible and update correctly for current month via a documented adapter; no future service calls.
4. Test 2026-10-15 Class 2→3; 14th remains Class 2, 15th Class 3; overlapping/backdated errors 409. Concurrent two operator edits cannot create two active segments.

**Inter-module integration currently proposed:** Students module owns locks and enrollment transition. Validate year via AcademicsPublicFacade and selected class/section same school, end old segment at day preceding new effectiveDate, create new segment with saved labels, append audit. Update existing profile class-edit form to request date and show a confirmation/history timeline; legacy fee generator remains backward-compatible with current segment for current month until new engine wired.

**Failure handling:** Avoid leaving a student without enrollment on transient failure (single transaction). Rewriting historic segments requires correction workflow, not naïve row update. Backdated change if previously assessed fees requires warning but cannot wait on future ledger. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** Test 2026-10-15 Class 2→3; 14th remains Class 2, 15th Class 3; overlapping/backdated errors 409. Concurrent two operator edits cannot create two active segments.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-009-FE01 user journey on 360/768/1366; TASK-009-FE02 invalid form; TASK-009-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-009-BE01 service API; TASK-009-BE02 tenant isolation; TASK-009-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-009-NFR01 load target; TASK-009-NFR02 privacy; TASK-009-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-03,06,07,09,13,14. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.

## 8. Additional executable golden cases (test IDs & outcomes)

Use synthetic School A and School B, known requestId, stable baseline SHA and recorded before/after outputs. These supplement—not replace—Section 6 named cases:

| ID | Exact test action and assertion |
|---|---|
| TASK-009-FE04 | Change Class 2A on Oct 15 to Class 3B: current profile 3B, history Oct 14 shows 2A. |
| TASK-009-FE05 | Backdated change overlapping prior segment is blocked with date/conflict and original segment preserved. |
| TASK-009-BE03 | Old search/profile and legacy fee/transport flow still respond, with saved class snapshots. |
| TASK-009-BE04 | Two managers update same student/version concurrently: only one current segment remains. |
| TASK-009-BE05 | Request Section of another school and attempt CLOSED-year edit; reject 404/409 without a write. |
| TASK-009-NFR04 | Date-effective history lookup at 5k students uses school/student/date index with measured p95. |
| TASK-009-NFR05 | Failed DB update halfway doesn't end source enrollment without creating target; transaction rollback proven. |

Reviewer must link actual browser/API/DB/load evidence for every applicable row in the **one tracker**. A screenshot of the UI without checking the underlying DB/HTTP result is not a PASS.
