# TASK-029 — School identifiers and historic context on transfer certificates

**Owned by:** Documents · **Requires:** TASK-003, TASK-008, TASK-028 · **Decision gate:** SPEC_SYNC_REQUIRED · **Reviewer tier:** **MEDIUM** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** As an official certificate issuer, I generate a new Transfer Certificate showing the correct school UDISE, School Code, Affiliation Number and the class/section for the student's relevant academic period.

**Operator use cases:** As an official certificate issuer, I generate a new Transfer Certificate showing the correct school UDISE, School Code, Affiliation Number and the class/section for the student's relevant academic period.

**Approved policy still to reconcile:** New school codes from SchoolInfoPublicFacade, student historical enrollment from StudentsPublicFacade, year via AcademicsPublicFacade. Existing issued files frozen; signed private downloads unchanged. The fee clearance service is not required for this template change and is implemented in TASK-032 on existing issuer.

**Concrete acceptance scenario:** Existing TC v1 SHA256 unchanged after school code update; new v2 contains correct 3 identifiers and old-period class; missing nullable affiliation doesn't crash. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/platform-admin/tc/tc.service.ts`<br>`apps/worker/src/tc-pdf-builder.ts`<br>`apps/web/src/app/admin/(protected)/schools/[schoolId]/transfer-certificate/ui.tsx`

**Proposed persisted fields/constraints:** Extend TC immutable encrypted snapshot.school {udiseNumber?,schoolCode?,affiliationNumber?}, snapshot.student {academicSessionId,classNameSnapshot,sectionNameSnapshot}; bump templateVersion to 'tc-v2' and pin rendering for historical v1. Preserve old TC row and file checksums. No Student.udiseCode to school migration.

**Deep design:** Extend new TransferCertificate encrypted snapshot's school fields udiseNumber?,schoolCode?,affiliationNumber?, plus academicSession and original class/section display label. Pin templateVersion=tc-v2 only for new issues; never rewrite old v1 ciphertext or PDF.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** Existing /platform/schools/:schoolId/transfer-certificates POST may accept selected academicSessionId only where approved; old invocation defaults validated student current enrollment; GET/download remains byte-identical for v1. Issue snapshot DTO must include school codes; 409 unknown historic mapping, 404 wrong school.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** TC owner obtains school codes from SchoolInfoPublicFacade and correct year-enrollment from StudentsPublicFacade. Refuse ambiguous historical class if template policy requires it; never use student-level UDISE. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. TC owner obtains school codes from SchoolInfoPublicFacade and correct year-enrollment from StudentsPublicFacade. Refuse ambiguous historical class if template policy requires it; never use student-level UDISE.
2. Reuse existing TcService.issue / JobService and versioned PDF renderer; old admin controller GET/list/download remain identical. Unit golden fixtures verify new code format including leading zeros and school logo/principal.
3. Platform Admin TC preview shows school identifiers + historic student class, clear missing-code state, A4 print fit and same Download/Retry flow. Do not add operator TC route (later TASK-033).
4. Existing TC v1 SHA256 unchanged after school code update; new v2 contains correct 3 identifiers and old-period class; missing nullable affiliation doesn't crash.

**Concurrency/error handling:** If student inactive/left, validated historical class still available to administrator. If school code missing, policy determines print missing value vs readiness refusal (default graceful until approved). Old template v1 renderer kept for retries; do not alter old ciphertext. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-029-FE01 normal issuance/print; TASK-029-FE02 invalid state; TASK-029-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-029-BE01 API state, authorization, tenant; TASK-029-BE02 retry idempotency; TASK-029-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-029-NFR01 50 parallel jobs/downloads, TASK-029-NFR02 private files/PII, TASK-029-NFR03 worker crash/retry.

**Extra mandatory test:** Existing TC v1 SHA256 unchanged after school code update; new v2 contains correct 3 identifiers and old-period class; missing nullable affiliation doesn't crash. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-02,07,14,15; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.

## 8. Additional exact acceptance and regression test matrix

Use the synthetic two-school fixtures and original-function BASE-XX journeys. Record **actual** browser/API/DB/NFR results, not planned/assumed PASS. These are separate from the earlier FE/BE/NFR scenarios:

| Test ID | Preconditions/action → required assertion |
|---|---|
| TASK-029-FE04 | Issue new TC v2 containing school UDISE with leading zero and old-year class/section. |
| TASK-029-FE05 | School missing optional affiliation: print neutral omit/warning with no crash. |
| TASK-029-BE04 | Prior TC v1 PDF/download and worker continue byte-identically. |
| TASK-029-BE05 | School code sourced from validated School facade, never student UDISE. |
| TASK-029-BE06 | Foreign-student/academicSession IDs denied even if known. |
| TASK-029-NFR04 | A4 golden PDF long school name, currency not relevant; size and render p95 measured. |
| TASK-029-NFR05 | Old snapshot crypto key rotation still renders original v1 without recomputing school details. |

Every failed protected BASE flow is a regression regardless of whether the new feature passes. For commercial Admit Card tasks, test execution itself remains blocked before signed CR approval.
