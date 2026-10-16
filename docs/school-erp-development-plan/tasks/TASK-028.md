# TASK-028 — Document snapshots, secure workers and versioned files

**Engineer/domain owner:** Documents / Foundation. **Prerequisites (ALL already lower-numbered):** TASK-003, TASK-008, TASK-013. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Harden reusable frozen issue snapshots, template versioning, encryption-key compatibility, private PDF file access and job retries without duplicating ownership of TC and fee receipt aggregates.

**Outside this task:** Do not add operator TC access or admit-card issuance here; later tasks consume the stable document primitives.

**School user story:** As an operator, I can retrieve previously issued official documents even after school info or template changes and can safely retry a failed render, without leaking private records.

**Real use cases and acceptance:** UC1: change school principal after TC issued, old TC remains original; UC2: queued PDF worker restarted and renders same issue, not another; UC3: old encrypted TC snapshot key version still decrypts; UC4: expired signed download requires fresh authorization; UC5: new renderer can coexist with legacy template version.

**Domain rules, authorization and scope:** One authoritative issue per domain: TC owner for TC, Fees for receipts and later approved Admit Cards for card. No parallel duplicate master document entity; optional read-model manifest only. Only jobId in BullMQ payload, frozen issue snapshot and content SHA256; role/tenant checked before private download.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** Versioned DocumentManifest read model if needed {schoolId,domainType,domainIssueId,templateVersion,actorType,actorId,snapshotHash,fileId,status,attempts,checksum,createdAt} unique school+type+issue; existing TC encrypted snapshots and SchoolFile preserved. For new receipts expose versioned renderer, not mandatory new duplicated money rows; actor/name snapshot plan for later receipt UI.

**API/contracts, DTO validation, errors and role scope:** Reuse owning-domain GET status/download and POST retry-render only on FAILED with expectedVersion. Foundation PrivateFileService provides authorizeThenSign({actor,schoolId,domainRef,capability,ttl}), job dispatch {jobId}; typed 404 other school, 403 viewer denied, 409 invalid retry state, 503 storage unavailable.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Domain controller creates versioned frozen issue+outbox in local transaction, worker receives {jobId}, reloads database snapshot and private branding, renders PDF by pinned template version, hashes content, uploads tenant-private file, atomically marks success; bounded retry on storage failure from same source; on read validate file/actor/tenant and present safe status. Keep old TC and receipt route behavior stable.

**Concurrency/idempotency/recovery/correction edge cases:** Immutable old PDF must not be silently rebuilt with current branding. Reprints distinct from new issuance; voided receipts add visible void state via versioned view not past payment rewrite. Key rotation and backup/restore test, no sensitive data in job payload.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 completed/queued/failed/retry UX; FE02 old template still downloadable; FE03 expired link reauth; FE04 long school branding/A4; FE05 revoke download after role downgrade.

**BE cases:** BE01 hash + immutable snapshot; BE02 job replay no duplicate issue; BE03 cross-tenant and signed-url scope; BE04 old encryption key variants; BE05 forced storage failure recovery; BE06 viewer 403 and CSRF retry.

**NFR cases:** NFR01 50 simultaneous private downloads; NFR02 100 render jobs restart bounded; NFR03 7yr retention policy/backup; NFR04 A4 golden PDF and PII leak test.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
