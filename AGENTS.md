# Custom School Management Web Application — Agent Contract

**Project ID:** `custom-school-app`  
**Harness Repository:** `../jasiq-harness`  
**Status:** Canonical Application Repository  

## 1. Authority Boundary
This repository contains application source code and test suites for `custom-school-app`. Specifications, detailed level designs (DLD), delivery plans, user stories, and ASDLC harness validators reside in `jasiq-harness`.

## 2. Mandatory Bootstrap Documents
Before modifying or inspecting this repository, all agents must read:
1. `../jasiq-harness/AI-OPERATING-CONTRACT.md`
2. `../jasiq-harness/jasiq-asdlc/workflow-manifest.yaml`
3. `../jasiq-harness/jasiq-specs/projects/custom-school-app/project.yaml`
4. Target module DLD: `../jasiq-harness/jasiq-specs/projects/custom-school-app/design/dld/00-platform-foundation-infrastructure-dld.md`

## 3. Architecture & Tenancy Invariants
- **Multi-Tenancy:** All operator queries must filter by `school_id` derived exclusively from trusted server-side `TenantContext`. Cross-tenant data access is strictly forbidden and must fail closed with HTTP 404 `ERR_TENANT_CROSS_SCHOOL`.
- **Sessions:** Opaque server-side tokens stored with Argon2id hashing in PostgreSQL. Cookies must be `HttpOnly; Secure; SameSite=Strict`.
- **Audit:** Append-only audit records for all security, tenant, and financial events. Zero SQL `UPDATE`/`DELETE` paths.
- **Storage:** MinIO object storage keys must follow `tenants/{school_id}/{category}/{uuid}-{filename}`.
- **Background Jobs:** Trusted job pattern — BullMQ payloads contain only `{ jobId: string }`. Worker loads state from PostgreSQL.
