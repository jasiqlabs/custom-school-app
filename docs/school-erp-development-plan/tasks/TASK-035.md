# TASK-035 — Admit card issuance with fee-clearance enforcement

**Owned by:** Documents / Fees · **Requires:** TASK-032, TASK-034 · **Decision gate:** PAID_CR_REQUIRED · **Reviewer tier:** **CRITICAL** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** As an approved full operator, I generate branded Admit Cards for students registered in an exam context **only after** exam-specific fee-clearance is confirmed, then can download frozen PDFs.

**Operator use cases:** As an approved full operator, I generate branded Admit Cards for students registered in an exam context **only after** exam-specific fee-clearance is confirmed, then can download frozen PDFs.

**Approved policy still to reconcile:** **Paid CR**; no implementation without signed quotation/approval and exact exam-card template. Policy explicitly specifies exam cutoff, eligible categories and old arrears, override/waiver; no assumption about future months prepaid. Fee block enforced in server issue, not only UI. No grading/full exam module.

**Concrete acceptance scenario:** Eligible student PDF shows exact year/class/exam/student; ₹300 overdue blocks with no new issue, after payment recheck succeeds; role and tenant deny, payment void later doesn't mutate old issued PDF. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/platform-admin/tc/tc.service.ts`<br>`apps/api/src/modules/fees/facade/fees-public.facade.ts`<br>`apps/worker/src/tc-pdf-builder.ts`

**Proposed persisted fields/constraints:** AdmitCardIssue(id,schoolId,studentId,examContextId,issueSequence,requestKey,issuedBy/actorType,issuedAt,status,templateVersion,encryptedSnapshot,keyVersion,clearanceDecisionId,jobId,fileId,sha256), unique school+requestKey, strong composite school FKs. FileType.ADMIT_CARD and JobType.ADMIT_CARD_PDF implemented only now. Frozen snapshot includes school/context/year/student class and policy evidence.

**Deep design:** **Commercial gate:** approved quote and exact signed template. Add AdmitCardIssue with immutable encrypted school/student/exam snapshot, unique requestKey, file/job/checksum, issuer, clearance policy hash. Extend worker JobType/FileType only now.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** FeesPublicFacade.batchCheckDocumentClearance purpose ADMIT_CARD examContextId/asOfDate/policyVersion, trusted transaction/gate; POST /operator/admit-cards/issue {examContextId,studentIds,requestKey}; GET /operator/admit-cards/issues and /:id/download, POST /:id/retry-render. 409 ERR_FEES_PENDING_FOR_ADMIT_CARD; 403 role, 404 cross school, 422 missing exam data; idempotent replay.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** Validate READY exam context from TASK-034, enrolled eligible students in session/class, school IDs and exam cutoff. FeesPublicFacade clearance purpose ADMIT_CARD under TASK-032 same lock for each student, with approved category/year/future-month cutoff. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. Validate READY exam context from TASK-034, enrolled eligible students in session/class, school IDs and exam cutoff. FeesPublicFacade clearance purpose ADMIT_CARD under TASK-032 same lock for each student, with approved category/year/future-month cutoff.
2. Create issue+job+audit under lock only for eligible students; if blocked return per-student 409 and no Job. For bulk, define atomic-all vs eligible-only skip policy explicitly; job chunking and safe replay ensure no duplicate issued card.
3. Operator UI Exam→Students→Preview→Check Fees→Issue→Progress/Failures→Download. Show blocked dues and link to fee statement, ensure private signed file authorization at download. No gradebook or separate mark input.
4. Eligible student PDF shows exact year/class/exam/student; ₹300 overdue blocks with no new issue, after payment recheck succeeds; role and tenant deny, payment void later doesn't mutate old issued PDF.

**Concurrency/error handling:** If no subject slots, client-approved template may permit single exam date only; never fabricate. Replaying same request cannot issue twice; intentional new card uses new request key/version. Voided payment after issue affects future new issuance only; report viewer always denied. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-035-FE01 normal issuance/print; TASK-035-FE02 invalid state; TASK-035-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-035-BE01 API state, authorization, tenant; TASK-035-BE02 retry idempotency; TASK-035-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-035-NFR01 50 parallel jobs/downloads, TASK-035-NFR02 private files/PII, TASK-035-NFR03 worker crash/retry.

**Extra mandatory test:** Eligible student PDF shows exact year/class/exam/student; ₹300 overdue blocks with no new issue, after payment recheck succeeds; role and tenant deny, payment void later doesn't mutate old issued PDF. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-07,09,10,11,14,16; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.
