# TASK-002 — Reports-only operator experience and exports

**Deliverable ownership:** Reports. **Explicit completed predecessors:** TASK-001. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Deliver end-to-end usable reports-only role on current reporting/export surfaces, including permission checked private downloads.

**Not part of this task:** Do not invent new reporting analytics or a full reporting builder.

## 2. Functional requirement, users and acceptance journeys

**User story:** School owner assigns Operator 1 who can only view authorized reports and download them, but cannot edit or see sensitive student profiles.

**School use cases / required results:** UC1: a reports-only operator logs in to a reports-oriented navigation. UC2: downloads permitted month-wise fee XLSX for own school. UC3: POST fee collection returns 403 even via curl with valid login+CSRF. UC4: GET arbitrary student private profile not allowed. UC5: tenant B report URL cannot be fetched by tenant A.

**Rules, permissions and policy boundaries:** 'View all Reports' must be translated into explicit report allow-list and allowed columns; not 'all GET requests'. Non-report modules e.g. student entry/transport editing should not be exposed. All privileged admin routes stay platform-only. Client must confirm list of reports and PII visibility.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** SchoolOperator.role enum REPORT_VIEWER|MANAGER from FB-08; capability matrix REPORTS_READ and REPORTS_DOWNLOAD, optionally report-specific scopes if confirmed. No direct access to StudentPrivateProfile; job/report rows bind schoolId and authorized actor with private file permission.

**API contract, validation and status/errors:** GET /operator/reports/* and GET authorized export status/download restricted to reports.read/download; POST config/payment/student/transport/promotion/TC always 403. Legacy operator GET routes treated as sensitive until reviewed; deny-by-default. For new reports API use server projection from approved report facades.

**Backend/service algorithm, module/public facades and FE binding:** Use capability guard/decorator on each report route and secure file resolution; nav server-derived capability DTO. Dashboard should not accidentally count as all reports unless approved. Link accessible 'Download' only for report resources. Role changed during session triggers invalidation from FB-08.

**Failures, concurrency, idempotency and edge cases:** No client-side role flag as authority, no hiding bypass; export job must re-check permission at download time. Audit denied write attempts without exposing sensitive inputs. Report filtration as-of session applies AS-06.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TC-FB07-FE01 show only permitted report sections; FE02 accurate downloadable filtered report; FE03 no write control; FE04 direct URL to unauthorized page yields safe 403/redirect; FE05 mobile/tablet and screen reader.

**Backend BE cases:** TC-FB07-BE01 enumerate every operator route in table-driven role test and assert deny/allow; BE02 CSRF-valid direct mutation still denied; BE03 source file direct URL cannot leak; BE04 cross-tenant IDs 404; BE05 downgrade active session revoked; BE06 sensitive PII fields absent.

**Nonfunctional NFR cases:** TC-FB07-NFR01 fuzz role escalation and BOLA; NFR02 job/report permission revalidation; NFR03 cache partition by tenant role session; NFR04 PDF/XLSX formula injection and PII leakage tests.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
