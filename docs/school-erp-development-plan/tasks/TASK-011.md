# TASK-011 — School go-live readiness and first-operator bootstrap

**Deliverable ownership:** School. **Explicit completed predecessors:** TASK-001, TASK-007. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Activation readiness covers policy-selected session/classes/sections/operator criteria. Resolve existing bootstrap circularity: current operator creation requires school ACTIVE.

**Not part of this task:** No school should become impossible to activate because 'has an operator' is required before operator provisioning is allowed.

## 2. Functional requirement, users and acceptance journeys

**User story:** As platform admin, I get a clear checklist before activating a new school so I don't provision a technically active but unusable tenant.

**School use cases / required results:** UC1: new school has name but no active session/classes; readiness shows deficiencies. UC2: school has no operator yet because existing provisioning requires ACTIVE school — activation must not deadlock. UC3: legacy ACTIVE school missing session remains operational in compatibility mode until migrated. UC4: activation review confirms optional vs mandatory criteria.

**Rules, permissions and policy boundaries:** Client must classify each criterion mandatory/warning. Current code requires school ACTIVE *before* creating operator, so requirement 'operator before activation' contradicts existing order. Design must resolve with safe provisional operator (INACTIVE until school active) or revised activation protocol; never strand first tenant. Existing ACTIVE schools grandfathered with warnings, not suddenly disabled.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** SchoolReadinessCheck view/dto, derived from authoritative School, AcademicSession, classes/sections, operators, logo/principal if required. Optional audit row SchoolActivationReview(schoolId,version,criteriaVersion,blockingCodes,warnings,acknowledgedBy,time); no redundant mutable 'readiness' flag in school unless cached revisioned projection.

**API contract, validation and status/errors:** GET /platform/schools/:id/readiness; POST /platform/schools/:id/activate {expectedVersion,readinessVersion,confirmWarnings}; preserve existing status route with compatible validation. Use the already implemented TASK-007 **Platform Admin session bootstrap** for DRAFT schools. For operator readiness, choose a consistent approved path: (A) a secure **provisional operator** created with PlatformAdminGuard while School DRAFT and unable to authenticate until School ACTIVE, OR (B) mark NO_OPERATOR as a **warning** until after school activation, when existing operator provisioning works. Do not make it a blocker unless path A is fully implemented and tested.

**Backend/service algorithm, module/public facades and FE binding:** Readiness composer uses school-owned data and AcademicsPublicFacade; returns codes e.g. MISSING_ACTIVE_YEAR / NO_ACTIVE_CLASS / NO_SECTION / NO_OPERATOR (if supported), minRequired true/false per config. Platform admin UI card with checklist, links to fix, warning vs blocker, confirm; atomic activation re-evaluates readiness under school row lock.

**Failures, concurrency, idempotency and edge cases:** Avoid false-negative when deliberate school without transport/fee configs; readiness should not require features the school won't use. School deactivation/reactivation uses same logic but legacy access policy agreed. Operator-creation deadlock is P0; test the exact DRAFT→ACTIVE→first-operator/login sequence and both decision variants. Existing ACTIVE school must not become unavailable if it predates session setup.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TASK-011-FE01 missing active year and class readiness blocking/warnings display; FE02 add missing sections/entry then re-evaluate; FE03 first operator can be provisioned through approved bootstrap path; FE04 stale readiness refresh and activate retry; FE05 responsive/accessible setup page.

**Backend BE cases:** TASK-011-BE01 activation cannot bypass hard blockers; BE02 guarded platform-admin only; BE03 race before activation and class deletion; BE04 old school compatible; BE05 no cross-tenant leakage; BE06 at least one bootstrap path tested.

**Nonfunctional NFR cases:** TASK-011-NFR01 readiness query batched p95 measured; NFR02 availability no cutover lockout; NFR03 audit/observability; NFR04 staging new school creation scenario.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.

## Mandatory backward compatibility

TASK-011 **must not retroactively lock out any existing ACTIVE school** because it lacks a newly mandatory academic year, principal photo, class or operator. The first rollout should report warnings to legacy tenants and require readiness for newly onboarded schools only after a reviewed migration/backfill. Keep existing `POST /platform/schools/:id/status` behavior through a compatibility adapter or versioned new readiness API, with a tested first-operator bootstrap path. If policy A is chosen, use a dedicated *provisionally active-after-school* state that never permits login until School ACTIVE; if policy B, keep operator count advisory until provisioned after activation.
