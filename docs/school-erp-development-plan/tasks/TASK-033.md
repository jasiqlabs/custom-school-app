# TASK-033 — Operator-panel transfer certificate issuance

**Owned by:** Documents / Operator · **Requires:** TASK-001, TASK-029, TASK-032 · **Decision gate:** SCOPE_CONFIRMATION · **Reviewer tier:** **HIGH** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** As a full school manager, I can search students, preview a fee-cleared TC, issue, track, retry and download it from the operator panel, without receiving cross-school or platform-admin permissions.

**Operator use cases:** As a full school manager, I can search students, preview a fee-cleared TC, issue, track, retry and download it from the operator panel, without receiving cross-school or platform-admin permissions.

**Approved policy still to reconcile:** Shared TcService from TASK-032 is authority, not duplicated TC table or unchecked operator alternate route. schoolId derives from authenticated school manager; existing platform TC endpoint remains. TC issue itself does not auto-mark student LEFT absent client decision; optional ExitWorkflow command from TASK-022 only upon explicit approved action.

**Concrete acceptance scenario:** MANAGER issues fee-cleared TC and downloads PDF from own school; viewer direct POST 403; other school's student TC 404; after role downgrade signed retrieval denied. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/platform-admin/tc/tc.service.ts`<br>`apps/api/src/modules/platform-admin/tc/tc.controller.ts`<br>`apps/web/src/app/operator/students/[id]/ui.tsx`

**Proposed persisted fields/constraints:** Reuse TransferCertificate, file/job and audit snapshot from TASK-028/029; add issuedBy actorType OPERATOR|PLATFORM_ADMIN and requestKey uniqueness for network retries if missing. SchoolId composite FKs and versioned private file links; no new duplicated TC store.

**Deep design:** Expose Operator TcController with get/list/issue/status/download/retry using **existing** TcService/TcPublicFacade, never a duplicate TC table. schoolId from actor; manager-only capability plus CSRF on issue/retry.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** GET /operator/transfer-certificates?studentId&page, POST /operator/transfer-certificates {studentId,academicSessionId?,requestKey,templateVersion?}, GET /operator/transfer-certificates/:id, GET :id/download, POST :id/retry-render. Require tc:read/issue/download/retry manager capability+CSRF; 404 cross school, 403 report-only, 409 fees pending, 422 prerequisite missing.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** Reuse prior TASK-032 fee-clearance lock and TASK-029 school/year snapshot, TASK-028 worker/private file access; audit issuerType OPERATOR vs PLATFORM_ADMIN. No TC issue auto-exit; exit is a separate domain event. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. Reuse prior TASK-032 fee-clearance lock and TASK-029 school/year snapshot, TASK-028 worker/private file access; audit issuerType OPERATOR vs PLATFORM_ADMIN. No TC issue auto-exit; exit is a separate domain event.
2. Operator UI Student Profile → TC Preview → Fee Readiness → Confirm Issue → QUEUED/FAILED/COMPLETE → Download/Retry; preconditions show principal/signature/logo readiness and existing pending fees. Report-viewer sees no issue route.
3. Old Platform Admin TC flow remains functioning with same issue IDs/worker, old v1 download; repeated idempotency key returns original pending/issued document, while explicit reissue uses new token.
4. MANAGER issues fee-cleared TC and downloads PDF from own school; viewer direct POST 403; other school's student TC 404; after role downgrade signed retrieval denied.

**Concurrency/error handling:** One original issue is distinct from an intentional new TC; idempotency key returns same existing issue on retry. Old v1 TC files retained; role downgrade invalidates file link generation. Avoid making SCHOOL MANAGER platform admin. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-033-FE01 normal issuance/print; TASK-033-FE02 invalid state; TASK-033-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-033-BE01 API state, authorization, tenant; TASK-033-BE02 retry idempotency; TASK-033-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-033-NFR01 50 parallel jobs/downloads, TASK-033-NFR02 private files/PII, TASK-033-NFR03 worker crash/retry.

**Extra mandatory test:** MANAGER issues fee-cleared TC and downloads PDF from own school; viewer direct POST 403; other school's student TC 404; after role downgrade signed retrieval denied. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-01,04,06,07,14,16; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.
