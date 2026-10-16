# TASK-032 — Server-authoritative TC fee clearance for every issuer

**Owned by:** Fees / Documents · **Requires:** TASK-019, TASK-021, TASK-028 · **Decision gate:** POLICY_CONFIRMATION · **Reviewer tier:** **CRITICAL** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** Before creating a new TC, either existing issuer must reject an uncleared student under approved policy, using one authoritative fee ledger across prior/current academic sessions.

**Operator use cases:** Before creating a new TC, either existing issuer must reject an uncleared student under approved policy, using one authoritative fee ledger across prior/current academic sessions.

**Approved policy still to reconcile:** Client must decide eligible categories, arrears periods, as-of date, waivers/override and unassessed months. Client-side Generate disabled is not security. Apply shared fee-clearance at *issuer service* level before worker/job creation, so no old platform route bypass.

**Concrete acceptance scenario:** Concurrent new charge + TC check + payment void cannot pass using stale clear state; 409 ERR_FEES_PENDING_FOR_TC with no issue/job, existing issued TCs still downloadable after debts reappear. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/platform-admin/tc/tc.service.ts`<br>`apps/api/src/modules/fees/facade/fees-public.facade.ts`<br>`apps/api/src/modules/fees/application/query-pending-fees.service.ts`

**Proposed persisted fields/constraints:** StudentFeeAccount(schoolId,studentId,ledgerRevision,updatedAt) with unique composite PK and per-student row lock owned by Fees; versioned DocumentClearanceDecision(schoolId,studentId,docType='TC',checkedAt,amount,policyVersion,ledgerRevision,actorType/Id,decision) or encrypted TC snapshot evidence. No alternate boolean 'hasPaidFees' cache.

**Deep design:** Fees owns StudentFeeAccount(schoolId,studentId,revision) with unique lock row. ALL fee charge inserts, allocations, void, adjustments and opening imports must lock it before modifying relevant assessment/paid balances.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** FeesPublicFacade.checkDocumentClearanceInTransaction({schoolId,studentId,purpose:'TC',asOfDate,policyVersion,transactionContext}) returns {eligible,totalOutstandingMinorUnits,ledgerRevision,violations,unassessedPeriods}; shared existing TcService.issue returns 409 ERR_FEES_PENDING_FOR_TC for positive eligible due; 404 cross-school, 503 dependency unavailable. No second issue API necessary.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** Add FeesPublicFacade.withLockedClearance(transactionContext,{schoolId,studentId,asOfDate,purpose:'TC',policyVersion}) returning eligible, outstanding minor units, missing-assessed-months and revision. No TC owner direct fee table read. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. Add FeesPublicFacade.withLockedClearance(transactionContext,{schoolId,studentId,asOfDate,purpose:'TC',policyVersion}) returning eligible, outstanding minor units, missing-assessed-months and revision. No TC owner direct fee table read.
2. TcService.issue obtains lock in same coordinated transaction, computes eligible source charges including earlier months/sessions, verifies policy and (if blocked) creates NO TransferCertificate or Job. If clear, issues frozen snapshot+audit+outbox while protected. All admin issue routes call same guard.
3. Existing Platform Admin TC screen shows due total/breakdown and safe View Fees action where authorized. No operator TC route required in this task, but future controller must use same issuer.
4. Concurrent new charge + TC check + payment void cannot pass using stale clear state; 409 ERR_FEES_PENDING_FOR_TC with no issue/job, existing issued TCs still downloadable after debts reappear.

**Concurrency/error handling:** A new due inserted simultaneously must not slip between check and insert; simple GET clearance then POST TC is unsafe. Missing unassessed periods require approved fail-closed/warning policy. Prior TC downloads unaffected. For cross-domain locks only invoke Fees facade, never direct TC SQL on fee tables. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-032-FE01 normal issuance/print; TASK-032-FE02 invalid state; TASK-032-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-032-BE01 API state, authorization, tenant; TASK-032-BE02 retry idempotency; TASK-032-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-032-NFR01 50 parallel jobs/downloads, TASK-032-NFR02 private files/PII, TASK-032-NFR03 worker crash/retry.

**Extra mandatory test:** Concurrent new charge + TC check + payment void cannot pass using stale clear state; 409 ERR_FEES_PENDING_FOR_TC with no issue/job, existing issued TCs still downloadable after debts reappear. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-09,10,11,12,14,16; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.
