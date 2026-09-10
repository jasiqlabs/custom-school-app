# Get Digital Your School — Agent Contract

Project ID: `custom-school-app`. Canonical specifications live in `jasiqlabs/jasiq-harness/jasiq-specs/projects/custom-school-app`.

Before code changes, read the Harness AI operating contract, workflow manifest, project registry, approved target module stories/UIUX and DLD. During implementation, approved DLD/UIUX/stories/HLD are authoritative over the older application.

Greenfield v2 invariants:
- Operator school scope comes only from the authenticated server session.
- Internal relational UUIDs are immutable; displayed Student ID/SR is a later mutable business identifier owned by MOD-003.
- Opaque session tokens are stored only as keyed hashes; cookies are HttpOnly/Secure/SameSite=Strict in production.
- CSRF is required for state changes.
- Audit is append-only and sensitive values are redacted.
- School files are private; access is authorized before short-lived signed URLs.
- BullMQ payloads contain only `{jobId}`; workers reload authoritative state.
- Domain modules do not read sibling persistence directly; use public ports/facades.
- Never weaken tenancy, auth, privacy, audit, financial/document integrity to make a test pass.
