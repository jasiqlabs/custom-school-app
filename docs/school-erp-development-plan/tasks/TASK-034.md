# TASK-034 — Exam context and admit card setup (paid change)

**Owned by:** Documents · **Requires:** TASK-001, TASK-007 · **Decision gate:** PAID_CR_REQUIRED · **Reviewer tier:** **HIGH** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** As a school manager, I can define the minimum approved examination context for a future admit card without adding grading/attendance/full examination management.

**Operator use cases:** As a school manager, I can define the minimum approved examination context for a future admit card without adding grading/attendance/full examination management.

**Approved policy still to reconcile:** **Separate paid change request:** block implementation until commercial approval and sample template approved. Define schedule metadata only to extent needed to print Admit Cards, school-year and class scoped. No marks, grades, student exam result or full exam module; generation and fee-clearance are future task TASK-035 and MUST NOT be exposed here.

**Concrete acceptance scenario:** Create a Class 5 exam context 2026-27, preview/update and print confirmed template fields; foreign school context inaccessible, report viewer cannot create. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/platform-admin/academics/academics.service.ts`<br>`apps/web/src/app/operator/ui.tsx`<br>`prisma/schema.prisma`

**Proposed persisted fields/constraints:** ExamCardContext(id UUID,schoolId,academicSessionId,title,examCode?,examStart DATE,examEnd DATE,venue?,instructions?,status DRAFT|READY|CLOSED,version,createdBy,createdAt,updatedAt) unique school+session+code if code configured; ExamSubjectSlot(contextId,subject,date,startTime,endTime,room) ONLY if explicitly confirmed. School/session composite FKs, no AdmitCardIssue table/write here.

**Deep design:** **Commercial gate:** written separate paid CR approved before implementing. Add ExamCardContext with schoolId, sessionId, title, approved date/venue and optional subject slots only when template requires; state DRAFT/READY/ARCHIVED, version and school FK.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** GET/POST/PATCH /operator/admit-card-contexts plus GET :id and GET :id/preview with DTO {school,session,classes,dates,subjectSlots?}. Manager capability, CSRF, school from session, 422 invalid schedule, 404 foreign context, 409 stale version. No /generate or issue endpoint in this task.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** Platform Admin or school MANAGER permissions (per approved policy) create/edit school/year exam setup, validate class applicability and dates, snapshot template config. No marks, full timetable/gradebook/results module by default. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. Platform Admin or school MANAGER permissions (per approved policy) create/edit school/year exam setup, validate class applicability and dates, snapshot template config. No marks, full timetable/gradebook/results module by default.
2. GET/POST/PATCH /operator/admit-card-contexts with Zod input, same-school class/session, optimistic version and audit. Build Preview Context page with empty/missing fields and deliberate Publish/Ready action.
3. This task must be fully functional by itself: users can create, review, edit and reuse exam context, **no Generate Admit Card button until TASK-035 is implemented**.
4. Create a Class 5 exam context 2026-27, preview/update and print confirmed template fields; foreign school context inaccessible, report viewer cannot create.

**Concurrency/error handling:** A locked/issued context may later be referenced by frozen AdmitCardIssue, so changes after READY need versioned snapshots. Exclude numeric exam grades/marks entirely. No fake roll number; policy defined in approval. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-034-FE01 normal issuance/print; TASK-034-FE02 invalid state; TASK-034-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-034-BE01 API state, authorization, tenant; TASK-034-BE02 retry idempotency; TASK-034-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-034-NFR01 50 parallel jobs/downloads, TASK-034-NFR02 private files/PII, TASK-034-NFR03 worker crash/retry.

**Extra mandatory test:** Create a Class 5 exam context 2026-27, preview/update and print confirmed template fields; foreign school context inaccessible, report viewer cannot create. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-03,07,14,16; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.
