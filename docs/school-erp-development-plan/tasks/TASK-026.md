# TASK-026 — Historical year selector, reporting and exports

**Engineer/domain owner:** Reports / Fees / Students. **Prerequisites (ALL already lower-numbered):** TASK-010, TASK-019 (all lower numbers). **Single execution status:** [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. Explicitly deliverable capability

**What this task delivers:** Extend the existing school-year selector on ACTIVE or historical academic sessions (CLOSED only when available) and server query contracts to historical fee/student/report dashboards and XLSX exports using immutable origin-year and as-of snapshots.

**Outside this task:** Do not introduce new exam/attendance/report-builder modules or force legacy reports to use future data.

**School user story:** As an authorized school manager or reports viewer, I choose an archived academic year and download student/fee/transport reports with the correct as-of enrollment and financial context.

**Real use cases and acceptance:** UC1: inspect 2025–26 students with original class/section. UC2: export 2026–27 fee report with original charge months and separate now-collected historical payments. UC3: current-year dashboard remains current by default. UC4: reports-only operator may download only allowed reports. UC5: unauthorized school/year filter is 404.

**Domain rules, authorization and scope:** Backend holds report source-of-truth; never aggregate by today's class instead of selected historical class. Report request filter snapshots must include schoolId, yearId, asOf date and actor capability. Reader scopes enforced by FB roles from TASK-001/002; historic report views immutable, exported snapshots reproducible.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** No duplication of StudentEnrollment or FeeCharge. Add report-read indices (schoolId,academicSessionId,feePeriod), report job frozen input {schoolId,academicSessionId,asOfDate,filters,actorId,capability,templateVersion} with authorized private file mapping. School+year in cache keys.

**API/contracts, DTO validation, errors and role scope:** GET /operator/reports/yearly-students?academicSessionId, GET /operator/reports/yearly-fees?academicSessionId&asOfDate, GET /operator/reports/yearly-transports?academicSessionId only if existing transport effective histories support date; POST/report XLSX job followed by authorized GET status/download. Old pending-fee report URLs remain compatible. 403 non-report role, 404 foreign year, 422 invalid asOf.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Extend existing YearSelector TASK-010 to Reports & fee/dashboard export routes only after their backend data is ready, show selected year + as-of report label, no edit CTA on old years. Reports facade composes bulk batched StudentsPublicFacade/FeesPublicFacade/TransportPublicFacade summaries; owns no sibling DB reads. XLSX job freezes filter and school in trusted snapshot; signed URL only after capability+tenant recheck.

**Concurrency/idempotency/recovery/correction edge cases:** Report 'total outstanding at year close' differs from 'old-session remaining as of today', label them separately. School may lack legacy year mapping: warn 'history unverified', not fake previous classes. Ensure report-viewer cannot infer protected Aadhaar/private data via export.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 toggle year and see historic identity+totals; FE02 export with year/header; FE03 reports-only allowed screens; FE04 period-as-of clarity; FE05 360/768/1366 accessibility.

**BE cases:** BE01 old/current as-of fee reconciliation; BE02 no report cross tenant; BE03 frozen filters/role on download; BE04 generated XLSX exact row count; BE05 prior Session CLOSED write deny; BE06 no older receipt mutation.

**NFR cases:** NFR01 5000 students x 24 months export worker bounded memory; NFR02 dashboard p95<3s 2k active inherited; NFR03 WCAG 2.1 AA, no-store; NFR04 export formula injection and signed private file expiry.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
