# TASK-025 — Academic-year close, archive and correction controls

**Engineer/domain owner:** Academics. **Prerequisites (ALL already lower-numbered):** TASK-021, TASK-024. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Finalize the staged transition decisions from TASK-024 during reviewed academic-year close with fee reconciliation and safe activation of the next year, and durable audit/closed historical immutability.

**Outside this task:** Initial session creation/activation already delivered TASK-007. Do not invent late fee write-offs, reissue old TCs, or require future reporting TASK-026.

**School user story:** As a school manager, I formally close the completed academic year after reviewing enrollments, transfers and outstanding finance, and can still access its frozen records without ordinary edits.

**Real use cases and acceptance:** UC1: 2026–27 with all reviewed student transitions closes once, while old ₹450 outstanding remains collectable. UC2: when a promotion batch failed, closing preview flags affected students; approval/policy dictates block vs signed warning. UC3: after close, old enrollment modification returns 409/403. UC4: concurrent operators attempt close twice, exactly one applied. UC5: an authorized correction creates audited compensating event and is not in-place mutation.

**Domain rules, authorization and scope:** Only documented DRAFT→ACTIVE→CLOSING→CLOSED transitions, never auto-close because of current date. No future fee deletion, no automatic overdue payment writing, and no unreviewed promotion. Client must approve blockers versus warnings, target activation ordering, partial-batch repair and exceptional correction scope. Never leave a student enrolled ACTIVE simultaneously in old and future school year.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** AcademicSession.status/version/closedAt/closedBy and SessionClosureReview(schoolId,sessionId,version,reviewToken,counts/ledgerHash,reviewedBy,createdAt); row-level lock on session+school; sessionId school scoped. Preserve historical enrollment and financial source records. Optional correction event append-only, not unlocking historic reports.

**API/contracts, DTO validation, errors and role scope:** GET /operator/academic-sessions/:id/close-preview returns reviewed/unreviewed enrollment count, pending promotions, outstanding charges, readiness and reviewToken. POST /operator/academic-sessions/:id/close {expectedVersion,reviewToken,confirmWarnings} manager+CSRF. GET closed years from TASK-007 unaffected. Typed 409 stale preview/blocked state, 422 bad transition, 404 other school.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Academics service calls StudentsPublicFacade for completed transition state and FeesPublicFacade for versioned as-of closure financial snapshot; requires no future Report service. Under a locked school transition coordinator, validate all staged decisions from TASK-024; execute bounded idempotent student-transaction batches (END source and ACTIVATE/CREATE target according to approved window), persist progress/exception journal, and only mark the source CLOSED / target ACTIVE when all blocking items are completed. Use a durable transition state that survives crashes and prevents other activation until finalization. New UI 'Close Year' readiness wizard has summary, blockers, warning checkboxes, confirmation and irreversible-effect explanation; closed year read-only banner.

**Concurrency/idempotency/recovery/correction edge cases:** If a new old-year payment is collected after closing, do not change historical closure snapshot, only current outstanding ledger. Correct close after issue requires append-only amendment with role and reason; do not silently reopen or mass mutate prior-year rows. Close is idempotent by token.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 close preview with unpaid warning but no data loss; FE02 pending promotions blocker; FE03 close success and historic read-only; FE04 double click and stale preview feedback; FE05 360/768/1366 keyboard/a11y.

**BE cases:** BE01 locked idempotent close and 50 concurrent requests; BE02 finance snapshot with old unpaid exact; BE03 year source records unchanged; BE04 denial old-year enroll edits; BE05 404 other tenant, audit actor/version, 409 stale blocker.

**NFR cases:** NFR01 bounded preview 5k students; NFR02 no synchronous huge report generation under DB lock; NFR03 transaction rollback/retry under worker timeout; NFR04 as-of vs live totals reconciled and retained 7yr.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
