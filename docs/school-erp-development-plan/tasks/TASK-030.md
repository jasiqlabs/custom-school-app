# TASK-030 — Two-copy itemized fee receipt and collector snapshot

**Owned by:** Fees / Documents · **Requires:** TASK-013, TASK-028 · **Decision gate:** POLICY_CONFIRMATION · **Reviewer tier:** **HIGH** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** A fee collector must print a professional two-copy receipt showing school header, fee components, paid/due summary, who collected payment and correct currency.

**Operator use cases:** A fee collector must print a professional two-copy receipt showing school header, fee components, paid/due summary, who collected payment and correct currency.

**Approved policy still to reconcile:** One immutable payment receipt, two named copies in one PDF/print view; currency glyph presumed ₹ but PDF source text extracted '?' — confirm before template approval. Never fabricate principal signature. Historical receipts remain meaningful even if collecting operator changes name/deletes account. Separate issued receipt vs outstanding at time of print to avoid today's balance distorting old receipt.

**Concrete acceptance scenario:** One payment of ₹500 allocated to two categories produces one receipt number and two copies, totals equal ₹500; changing operator display name later doesn't change old collector snapshot. 25 lines print without clipping. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/fees/application/collect-payment.service.ts`<br>`apps/web/src/app/operator/fees/collect/ui.tsx`<br>`apps/web/src/app/operator/fees/history/ui.tsx`

**Proposed persisted fields/constraints:** Add FeePayment.collectorNameSnapshot varchar(255) optional, receiptTemplateVersion, schoolBrandSnapshot? as versioned encrypted/JSON metadata where appropriate; allocation snapshot includes category/charge period, gross, concession, fine and allocated paid; aggregate amounts derive immutable receipt snapshot. Existing FeePayment.createdBy UUID resolves legacy operator name if still present, with historical fallback.

**Deep design:** FeePayment captures collectorNameSnapshot at payment time (not dynamic email/name), school/learner/class snapshot, each FeePaymentAllocation row category/month/amount and receiptTemplateVersion. Payment totals derive from immutable receipt projection.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** Extend GET /operator/fees/payments/:id/receipt with versioned ReceiptViewDto {school,receiptNumber,issuedAt,studentSnapshot,collectedBySnapshot,rows:[{category,period,assigned,concession,fine,received}],totals:{assigned,discount,net,paidThisReceipt,paidToDate,balanceAsOfReceipt},status}. Auth manager or explicitly approved report access, no-store, school scope.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** Refactor current receipt assembly into one FeesOwned ReceiptView DTO: school header, receipt #, issueAt, collector, allocated fee line list, original gross/discount/fine and paidThisReceipt, remainingAsOfReceipt, void metadata. Never compute money in React. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. Refactor current receipt assembly into one FeesOwned ReceiptView DTO: school header, receipt #, issueAt, collector, allocated fee line list, original gross/discount/fine and paidThisReceipt, remainingAsOfReceipt, void metadata. Never compute money in React.
2. Reusable ReceiptPrint component renders A4 with clearly labeled **Office Copy** and **Student Copy**; stable ₹ glyph, amount-in-words as per reviewed format; avoid duplicate print numbers despite series policy optional.
3. Update collection confirmation and Payment History View/Print using same DTO. Continue legacy single-fee receipt adapter and current browser print even before Download PDF is built.
4. One payment of ₹500 allocated to two categories produces one receipt number and two copies, totals equal ₹500; changing operator display name later doesn't change old collector snapshot. 25 lines print without clipping.

**Concurrency/error handling:** One payment can allocate across many fee charges FE-07; show each row without double counting concessions; void prints original data plus void metadata, not zero paid. Long school address/signature, logo aspect ratio, browser PDF print differences. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-030-FE01 normal issuance/print; TASK-030-FE02 invalid state; TASK-030-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-030-BE01 API state, authorization, tenant; TASK-030-BE02 retry idempotency; TASK-030-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-030-NFR01 50 parallel jobs/downloads, TASK-030-NFR02 private files/PII, TASK-030-NFR03 worker crash/retry.

**Extra mandatory test:** One payment of ₹500 allocated to two categories produces one receipt number and two copies, totals equal ₹500; changing operator display name later doesn't change old collector snapshot. 25 lines print without clipping. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-09,10,11,12; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.
