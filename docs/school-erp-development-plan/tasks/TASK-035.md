# TASK-035 — Admit card issuance with fee-clearance enforcement

**Engineer/domain owner:** Documents / Fees. **Prerequisites (ALL already lower-numbered):** TASK-032, TASK-034. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** After separate commercial approval and exam context setup, issue immutable Admit Card PDFs for eligible students, enforcing exam-specific dues policy **at issuance time** for individual and approved batch workflows.

**Outside this task:** No unsecured interim Generate endpoint; fee clearance and PDF generation must ship atomically in this task. Never build full exam marking/attendance module.

**School user story:** As an approved full operator, I generate branded Admit Cards for students registered in an exam context **only after** exam-specific fee-clearance is confirmed, then can download frozen PDFs.

**Real use cases and acceptance:** UC1 one student zero eligible due, issue and download. UC2 ₹300 overdue under agreed exam cutoff -> 409 and no issue or job. UC3 mixed 50-student batch results eligible/blocked if client approved partial batch. UC4 payment/fee assessment concurrently tries to change status; issuance locks correctly. UC5 student changes class/fee after issue; old card still original, reissue explicit.

**Domain rules, authorization and scope:** **Paid CR**; no implementation without signed quotation/approval and exact exam-card template. Policy explicitly specifies exam cutoff, eligible categories and old arrears, override/waiver; no assumption about future months prepaid. Fee block enforced in server issue, not only UI. No grading/full exam module.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** AdmitCardIssue(id,schoolId,studentId,examContextId,issueSequence,requestKey,issuedBy/actorType,issuedAt,status,templateVersion,encryptedSnapshot,keyVersion,clearanceDecisionId,jobId,fileId,sha256), unique school+requestKey, strong composite school FKs. FileType.ADMIT_CARD and JobType.ADMIT_CARD_PDF implemented only now. Frozen snapshot includes school/context/year/student class and policy evidence.

**API/contracts, DTO validation, errors and role scope:** FeesPublicFacade.batchCheckDocumentClearance purpose ADMIT_CARD examContextId/asOfDate/policyVersion, trusted transaction/gate; POST /operator/admit-cards/issue {examContextId,studentIds,requestKey}; GET /operator/admit-cards/issues and /:id/download, POST /:id/retry-render. 409 ERR_FEES_PENDING_FOR_ADMIT_CARD; 403 role, 404 cross school, 422 missing exam data; idempotent replay.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Validate exam context READY from TASK-034; batch StudentsPublicFacade enrollment/class snapshots; lock account ledger and check eligible fees via Fees facade (same TASK-032 mechanism) before inserting per-student issue+job+outbox; snapshot school and candidate/roll fields, render approved PDF in trusted worker with {jobId}, private file and checksum; UI review count/blocked details, confirm, queued progress, safe download. Recheck eligibility per student for long batches.

**Concurrency/idempotency/recovery/correction edge cases:** If no subject slots, client-approved template may permit single exam date only; never fabricate. Replaying same request cannot issue twice; intentional new card uses new request key/version. Voided payment after issue affects future new issuance only; report viewer always denied.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 preview and A4 signed-off design; FE02 fee blocked then paid; FE03 mixed batch and error table; FE04 same job retry; FE05 360/768/1366 keyboard, issuer name.

**BE cases:** BE01 direct API fee gate; BE02 no queued PDF when due positive; BE03 50 concurrent pay/issue race; BE04 tenant/role and exam+student+session; BE05 request idempotent, immutable snapshot; BE06 worker storage retry, download signed.

**NFR cases:** NFR01 100-500 cards bounded batch and queue as approved; NFR02 locked ledger correctness; NFR03 no Aadhaar/job PII; NFR04 PDF glyph/A4 golden, retention and private access.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
