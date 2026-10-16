# Academic Session Management — Requirements, DLD and Test Tasks

**Scope:** Academic **school year** (e.g., 2026–27), *not* authentication/cookie session. Baseline has no academic-session model. No attendance module exists in the reviewed `main` tree, so attendance is an **integration contract for future modules**, not an instruction to invent a new attendance system.

## AS-01 — Set up academic years (P0)

**Requirement / user story.** As an authorized school manager, I can create an academic session with a unique name, start date, end date and optional description; I can list, inspect and correct draft sessions before activation. Each school owns its sessions.

**Acceptance criteria.** Date range is valid; school cannot create duplicate session code or overlapping *active* schedules by accident; draft data can be edited; templates use local calendar dates without timezone off-by-one; existing schools can be migrated safely.

**DLD.**
- Add `AcademicSession(id,schoolId,code,label,startDate,endDate,status[DRAFT,ACTIVE,CLOSING,CLOSED],version,createdBy,activatedAt,closedAt,createdAt,updatedAt)` with `@@unique([schoolId,code])` and school-scoped indices.
- Introduce Nest academic-session controller/service and Zod/contracts; do not overload `UserSession`, which is authentication.
- Implement `GET /operator/academic-sessions`, `POST /operator/academic-sessions`, `PATCH /operator/academic-sessions/:id`. All use school id from session, not request body.
- Add an operator-facing **Academic Sessions** settings screen with create/edit form, dates, lifecycle badges, proper validation; do not disrupt platform-admin class CRUD.
- Backfill strategy: when migrating schools with pre-existing enrollment records, create a clearly labeled legacy session **as part of a reviewed migration plan**, rather than silently guessing historic year boundaries. Require school confirmation when exact dates are unknown.

**FE tests.** Create valid/invalid dates; duplicate name; empty school; mobile, tablet, desktop layouts; form accessibility and tab order; invalid timezone edge; view-only role cannot create.
**BE tests.** Tenant isolation; overlapping/conflicting dates; concurrency and unique index; optimistic version 409; input validation; legacy data migration/rollback fixture.
**NFR tests.** Paginated sorted listing; indexed lookups with 10k sessions across tenants; secure audit log; no sensitive values in logs; no destructive migration.

## AS-02 — Active, close and archive school year (P0)

**Requirement.** One active session per school; close only after readiness check and confirmation; prior sessions remain accessible read-only. Support transition without wiping past records.

**Acceptance criteria.** At most one ACTIVE session per school at DB level; read-only CLOSED state; preview of outstanding fees/unenrolled students/incomplete promotions; reactivation/reopening only via tightly authorized audited exceptional flow, if approved.

**DLD.**
- Enforce **partial unique SQL index** on schoolId for status ACTIVE; transaction + row lock on `schools` during activation.
- Add `POST :id/activate`, `GET :id/close-preview`, `POST :id/close`; audit actor/time, old/new session, impact counts.
- Closing must not mark unpaid fees paid or drop arrears; close may block uncompleted enrollment transition according to decision log.
- Backend rejects writes that target CLOSED sessions. Old read endpoints remain usable for legacy callers via controlled active-session inference until upgraded.

**FE tests.** Confirm dialog lists blockers; active badge; closed lock; fast double-click; error recovery and page refresh.
**BE tests.** Two simultaneous activations, cross-school refs, idempotent close, preserved debts/history, denied closed-period mutation, audit events.
**NFR tests.** Concurrent activation under load; deadlock retry policy; zero downtime additive migration; authorization probes.

## AS-03 — Per-session student enrollment and historical class data (P0)

**Requirement.** Student identity is school-long-lived, while class/section/admission-for-year is session-specific. Opening a historic session shows actual past enrollment, not current class labels.

**Acceptance criteria.** Student admitted in 2026–27 can have different class in 2027–28; current and historic records are both valid; no duplicate active enrollment for same student/year; historic TC/admission form can resolve correct year.

**DLD.**
- Add nullable `academicSessionId` to `StudentEnrollment` initially; backfill, audit, then make nonnull after complete migration. Include unique active enrollment per `(schoolId,studentId,academicSessionId)` using SQL index or equivalent constraint.
- Keep immutable `Student.id` and `studentCode`; add optional class/section display snapshots where renamed entities could distort old printed records.
- Update admission, search, profile, student list, export and platform-admin TC snapshot facades to accept validated session context with safe active default.
- Keep `Class` and `Section` reusable between years initially; do **not** clone classes or break existing IDs unless session-specific curricula explicitly required.
- Never discard historical enrollment rows. `EnrollmentStatus` needs clearly defined year-ended semantics; do not reuse student INACTIVE for ordinary year transition.

**FE tests.** Current vs history toggle; accurate class/section; switching year; empty historical view; admission to active year; invalid legacy record shown safely.
**BE tests.** FK and unique constraint; multi-tenant student/session mismatches; historic print snapshots; backfill without duplicates; concurrent admissions.
**NFR tests.** Student directory index query plan and pagination at 500–5000 students/school; backwards-compatible API contract; privacy checks.

## AS-04 — Session promotion, repeat, graduate, transfer-out (P0)

**Requirement.** School operator can preview year-end student transitions, select next class/section, mark **Promote**, **Repeat**, **Completed/Graduated**, or **Transferred/Left**, and commit once with full audit.

**Acceptance criteria.** Preview counts and exception list; no automatic movement of unreviewed students; existing student record not duplicated; individual override supported; re-running request is idempotent; impossible to promote into another school's class.

**DLD.**
- Create `SessionTransitionBatch` and `SessionTransitionItem` with source/target session, student, decision, target class/section, actor, status, idempotency token, before/after snapshots, validation errors.
- `POST /operator/academic-sessions/:id/transitions/preview` and `POST .../commit` (idempotent); transaction per bounded batch/chunk and job for large batches.
- Lock source/target student enrollments; end source enrollment, create target enrollment only for enrolled outcome; preserve completed/left as history with separate lifecycle reason.
- Reject closed target, active-conflict, invalid section, unsettled blocking rule (if client chooses), invalid input; show partial-failure recovery.
- Introduce separately audited correction/reversal approach; never delete financial transactions to undo a promotion.

**FE tests.** Bulk select, exceptions, change destination section, repeat, complete, no selection, offline/error retry, status summary.
**BE tests.** Idempotent retries, parallel commit, duplicate prevention, status consistency, tenant isolation, rows > batch size, audit.
**NFR tests.** Batch of 500–5000 students within agreed job budget, progress states, resumable retry, DB pool health and bounded transactions.

## AS-05 — Year-bound fees and financial continuity (P0)

**Requirement.** Fees are attributable to the academic session in which incurred; unpaid historical balances remain collectable in later sessions without duplicating ledger entries.

**Acceptance criteria.** 2026–27 unpaid Rs 400 + 2027–28 charge Rs 900 = total collectable Rs 1300, with **two original source lines**, not 2026 fee recreated as 2027 income; paying balance reduces correct source item.

**DLD.**
- Integrate AS-03 session id with new charge/ledger structure FE-01/07; each line has `originSessionId` and `dueDate`; payments have allocation to original charge lines.
- Do not copy fee due as new debt at rollover. Present previous-year arrears via aggregate query; retain original invoice/period source.
- Only new-period recurring rules create current-period charges; ensure per-period idempotency.
- Produce session close financial snapshot/reconciliation count (charges, concessions, collections, outstanding), not silently write off balances.

**FE tests.** Dual-year owed amount breakdown, historical receipt display, partial collection applied to old and new, closed year dues visible.
**BE tests.** No duplicated carryforward ledger, same charge across session switch, partial/void/retry, reconciliation sums, uncollectable-policy safeguards.
**NFR tests.** Indexed outstanding query over many sessions, consistent totals under concurrent payments, audit immutability.

## AS-06 — Session selector, reporting and downstream integration (P1)

**Requirement.** Selected academic year is prominent in relevant school screens and archived views; old-year reports can be downloaded without editing historical records.

**Acceptance criteria.** Default active year; explicit past-year selection persists safely; report headers show year; student class, fees, admission and TC show correct period; any active navigation respects permitted role.

**DLD.**
- Standardize validated `academicSessionId` query/filter contract and response metadata; never accept arbitrary foreign-school session IDs.
- Share selector in school header/academic modules; use school-specific active session not browser clock.
- Update student list/profile, fees configs/dues/reports, TC/admission form consumers; review transport assignment boundaries with transport module owners.
- **Future** attendance/exams modules should use the same session key if added later; do not add attendance as an undocumented extra feature.
- Route old URLs through default active context for compatibility, log migrations of old clients.

**FE tests.** Selector semantics, cross-page persistence, archived read-only affordance, export header, responsive layout.
**BE tests.** Pagination and query filters per session, per-school authorization, backwards-compatible request handling, correct print data.
**NFR tests.** Query plans, cache keys include `schoolId + sessionId`, avoid cross-school cache exposure, historical report generation stress.
