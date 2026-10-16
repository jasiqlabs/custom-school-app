# TASK-033 — Operator-panel transfer certificate issuance

**Engineer/domain owner:** Documents / Operator. **Prerequisites (ALL already lower-numbered):** TASK-001, TASK-022, TASK-029, TASK-032. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Add full manager TC search/preview/list/issue/download/retry screens and school-scoped operator routes backed by the already fee-gated TC issuing facade.

**Outside this task:** Do not implement a second TC store or bypass the existing platform-admin route; TC does not automatically change student exit status absent approved decision.

**School user story:** As a full school manager, I can search students, preview a fee-cleared TC, issue, track, retry and download it from the operator panel, without receiving cross-school or platform-admin permissions.

**Real use cases and acceptance:** UC1 own student TC after dues cleared, PDF in operator history. UC2 outstanding balance blocks with same service as platform admin. UC3 report viewer direct POST = 403. UC4 missing principal signature shows readiness error; no job created. UC5 renderer fails then retry from frozen snapshot.

**Domain rules, authorization and scope:** Shared TcService from TASK-032 is authority, not duplicated TC table or unchecked operator alternate route. schoolId derives from authenticated school manager; existing platform TC endpoint remains. TC issue itself does not auto-mark student LEFT absent client decision; optional ExitWorkflow command from TASK-022 only upon explicit approved action.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** Reuse TransferCertificate, file/job and audit snapshot from TASK-028/029; add issuedBy actorType OPERATOR|PLATFORM_ADMIN and requestKey uniqueness for network retries if missing. SchoolId composite FKs and versioned private file links; no new duplicated TC store.

**API/contracts, DTO validation, errors and role scope:** GET /operator/transfer-certificates?studentId&page, POST /operator/transfer-certificates {studentId,academicSessionId?,requestKey,templateVersion?}, GET /operator/transfer-certificates/:id, GET :id/download, POST :id/retry-render. Require tc:read/issue/download/retry manager capability+CSRF; 404 cross school, 403 report-only, 409 fees pending, 422 prerequisite missing.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Operator API maps actor school -> TcPublicFacade in existing TC owner, passes school and student to Students facade for enrollment snapshot, checks school principal/logo via School facade, performs TASK-032 fee clearance lock then enqueues immutable snapshot job. Next.js student profile > Transfer Certificate and Operator TC history page; user sees readiness, preview, confirm, QUEUED/FAILED/COMPLETE and Download/Retry. Do not let UI reissue silently from Retry.

**Concurrency/idempotency/recovery/correction edge cases:** One original issue is distinct from an intentional new TC; idempotency key returns same existing issue on retry. Old v1 TC files retained; role downgrade invalidates file link generation. Avoid making SCHOOL MANAGER platform admin.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 full operator issue; FE02 report viewer no action; FE03 readiness and blocked fee messaging; FE04 status/retry; FE05 old admin workflow and A4, 360/768/1366.

**BE cases:** BE01 operator school guard and capability; BE02 fee clearance inside shared service, cannot bypass; BE03 platform route regression; BE04 same-key replay; BE05 job failure and snapshot hash; BE06 school signed download 404/403.

**NFR cases:** NFR01 queue memory under 50 TC jobs; NFR02 worker redis restart; NFR03 private file signed expiry; NFR04 audit no sensitive fields.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
