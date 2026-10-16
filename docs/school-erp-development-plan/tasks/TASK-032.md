# TASK-032 — Server-authoritative TC fee clearance for every issuer

**Engineer/domain owner:** Fees / Documents. **Prerequisites (ALL already lower-numbered):** TASK-019, TASK-021, TASK-028. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Prevent creation of a **new** TC/job by ANY existing platform-admin TC issuance API when eligible dues are positive, using an authoritative school/student/period ledger check under a shared concurrency guard.

**Outside this task:** No new operator TC route required to complete this task: implement and test on existing platform-admin issuance immediately. Later TASK-033 reuses the same service without policy duplication.

**School user story:** Before creating a new TC, either existing issuer must reject an uncleared student under approved policy, using one authoritative fee ledger across prior/current academic sessions.

**Real use cases and acceptance:** UC1 ₹1 pending blocks platform-admin TC POST without TC row/job; UC2 August ₹500 + September ₹700 -> ₹1,200 total; UC3 settle then issue; UC4 void payment restores block for future issue but old TC PDF still accessible; UC5 20 concurrent fee assessments/payments and TC issues serialize consistently.

**Domain rules, authorization and scope:** Client must decide eligible categories, arrears periods, as-of date, waivers/override and unassessed months. Client-side Generate disabled is not security. Apply shared fee-clearance at *issuer service* level before worker/job creation, so no old platform route bypass.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** StudentFeeAccount(schoolId,studentId,ledgerRevision,updatedAt) with unique composite PK and per-student row lock owned by Fees; versioned DocumentClearanceDecision(schoolId,studentId,docType='TC',checkedAt,amount,policyVersion,ledgerRevision,actorType/Id,decision) or encrypted TC snapshot evidence. No alternate boolean 'hasPaidFees' cache.

**API/contracts, DTO validation, errors and role scope:** FeesPublicFacade.checkDocumentClearanceInTransaction({schoolId,studentId,purpose:'TC',asOfDate,policyVersion,transactionContext}) returns {eligible,totalOutstandingMinorUnits,ledgerRevision,violations,unassessedPeriods}; shared existing TcService.issue returns 409 ERR_FEES_PENDING_FOR_TC for positive eligible due; 404 cross-school, 503 dependency unavailable. No second issue API necessary.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Every charge creation/payment/void/correction/import holds same per-student FeeAccount row lock and increments revision. TC issuer obtains lock via facade within approved cross-module transaction boundary, evaluates all due charges, then inserts encrypted TC issue+job+audit outbox under lock; commits once, worker only renders authorized existing issue. UI on existing platform TC surfaces shows pending amount/breakdown and View Fees where authorized.

**Concurrency/idempotency/recovery/correction edge cases:** A new due inserted simultaneously must not slip between check and insert; simple GET clearance then POST TC is unsafe. Missing unassessed periods require approved fail-closed/warning policy. Prior TC downloads unaffected. For cross-domain locks only invoke Fees facade, never direct TC SQL on fee tables.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 block ₹1, show exact due; FE02 settle and retry; FE03 warning for unassessed policy; FE04 all current platform TC screens responsive; FE05 old TC downloadable after void.

**BE cases:** BE01 direct current platform API blocked; BE02 no TC/Job record on denial; BE03 50 concurrent assessment/payment/issue race; BE04 previous-session arrears; BE05 negative/void/waiver correct; BE06 tenant/role + 409/404 audit.

**NFR cases:** NFR01 p95 clearance 5k student, 24 months indexed; NFR02 zero stale-cache authority; NFR03 outbox/retry tests; NFR04 no PII logs, 7yr decisions retention.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
