# TASK-034 — Exam context and admit card setup (paid change)

**Engineer/domain owner:** Documents. **Prerequisites (ALL already lower-numbered):** TASK-001, TASK-007. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** After signed paid scope approval, create minimal exam context (title, academic session, applicable classes, agreed venue/dates/schedule and template fields) with manager CRUD and preview of context.

**Outside this task:** No admit-card PDF issuance, grading, marks, full exams or payment handling. A self-contained exam context setup must work without TASK-035, which implements issuance.

**School user story:** As a school manager, I can define the minimum approved examination context for a future admit card without adding grading/attendance/full examination management.

**Real use cases and acceptance:** UC1 create 'Annual Examination 2026–27' for year and Class 5 with approved exam dates/venue. UC2 list and edit future DRAFT exam context; reject date range outside approved session if policy. UC3 close/publish context with version preserving earlier snapshot. UC4 two schools reuse same exam title with no tenant overlap. UC5 preview shows only confirmed template fields, not fabricated schedule.

**Domain rules, authorization and scope:** **Separate paid change request:** block implementation until commercial approval and sample template approved. Define schedule metadata only to extent needed to print Admit Cards, school-year and class scoped. No marks, grades, student exam result or full exam module; generation and fee-clearance are future task TASK-035 and MUST NOT be exposed here.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** ExamCardContext(id UUID,schoolId,academicSessionId,title,examCode?,examStart DATE,examEnd DATE,venue?,instructions?,status DRAFT|READY|CLOSED,version,createdBy,createdAt,updatedAt) unique school+session+code if code configured; ExamSubjectSlot(contextId,subject,date,startTime,endTime,room) ONLY if explicitly confirmed. School/session composite FKs, no AdmitCardIssue table/write here.

**API/contracts, DTO validation, errors and role scope:** GET/POST/PATCH /operator/admit-card-contexts plus GET :id and GET :id/preview with DTO {school,session,classes,dates,subjectSlots?}. Manager capability, CSRF, school from session, 422 invalid schedule, 404 foreign context, 409 stale version. No /generate or issue endpoint in this task.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Documents/ExamCardContext owner validates AcadSessionPublicFacade and class IDs via Students public class-projection, persists versioned school-scoped context and audit. Operator UI 'Exam Setup' form uses calendar date, class applicability, optional subjects/instructions, review & save; status DRAFT/READY. If card issuance is not yet deployed, UI never presents nonworking Generate CTA; context setup remains independently usable.

**Concurrency/idempotency/recovery/correction edge cases:** A locked/issued context may later be referenced by frozen AdmitCardIssue, so changes after READY need versioned snapshots. Exclude numeric exam grades/marks entirely. No fake roll number; policy defined in approval.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 create/edit, FE02 validate session/class/date, FE03 warning missing schedule fields, FE04 responsive and a11y, FE05 other school context hidden.

**BE cases:** BE01 tenant+class/session constraint, BE02 idempotent create/update version, BE03 role viewer denied, BE04 audit and validation, BE05 old TC unchanged.

**NFR cases:** NFR01 lightweight schema-only migration, NFR02 no private student data in config, NFR03 bounded list at thousands contexts, NFR04 no legacy route regression.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
