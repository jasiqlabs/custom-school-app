# TASK-001 — Operator roles and server-side capability enforcement

**Deliverable ownership:** Access Control. **Explicit completed predecessors:** none. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Two operator capabilities must be enforced by every server endpoint and every file/job download; avoid default-allow while rolling out: inventory and annotate all existing routes before flipping default deny.

**Not part of this task:** Full MANAGER retains legacy behavior; REPORT_VIEWER account can authenticate but only a minimal reports capability until TASK-002 implements the complete reports UX.

## 2. Functional requirement, users and acceptance journeys

**User story:** Platform administrator provisions a Type 1 report viewer or Type 2 manager, and every server operation checks capabilities, even if browser UI is bypassed.

**School use cases / required results:** UC1: existing operators retain full functionality after migration. UC2: new REPORT_VIEWER can view allowed reports. UC3: existing manager is downgraded while logged in; old token immediately loses write rights. UC4: report viewer attempts TC issue with endpoint direct URL; 403. UC5: manager cannot access /platform admin routes.

**Rules, permissions and policy boundaries:** MANAGER=full school-operations capability, not cross-school administration. REPORT_VIEWER=approved reports only. Default DENY for any new endpoint without declared ability. Do not couple capability to school status; both school status and role must pass. Password reset/deactivation still revokes sessions.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** SchoolOperator.role enum REPORT_VIEWER|MANAGER default MANAGER for backfill only; capability registry codes in type-safe contract; session includes roleVersion or compare SchoolOperator.accountVersion on every privileged call. On role update bump accountVersion+revoke all user sessions transactionally; store audit old/new role.

**API contract, validation and status/errors:** Existing POST/PATCH /platform/schools/:id/operators accept role, role appears in GET list; PATCH role dedicated version guard; GET /operator/me/capabilities returns allow list and school identity. Capability guard uses @RequiresCapability('students.write' etc) and actor school, CSRF separately. 403 forbidden vs 404 foreign record. Never let manager choose own role.

**Backend/service algorithm, module/public facades and FE binding:** Admin operator add/edit form selection, explanatory labels and default appropriate role; server role update invalidates session. Extend OperatorGuard to resolve identity but leave capability authorization in dedicated guard covering every controller operation, including downloads/GET private profiles. Web header/nav built from validated me/capabilities; server pages auth-gated too.

**Failures, concurrency, idempotency and edge cases:** Backfill on live tenants must retain existing operators, avoid null role fail-open, preserve admin/operator authentication plane split. Last active operator deletion policy unchanged. New routing approach must not bypass CSRF.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TC-FB08-FE01 admin create/edit role; FE02 forced re-login after downgrade; FE03 old operator sees same navigation; FE04 report-viewer no fee collect; FE05 responsive/keyboard.

**Backend BE cases:** TC-FB08-BE01 migration defaults existing to MANAGER; BE02 each controller route coverage test; BE03 stale cookie after downgrade denied; BE04 direct API invalid capability; BE05 cross-school and admin segregation; BE06 reset/deactivation unchanged.

**Nonfunctional NFR cases:** TC-FB08-NFR01 measurable guard overhead at 50 parallel requests; NFR02 deny-by-default regression scanner; NFR03 authorization audit with no PII; NFR04 zero session revocation race.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
