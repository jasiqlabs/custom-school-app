# Get Digital Your School — School ERP

Greenfield v2 implementation for the approved JASIQ Harness baseline. This repository intentionally does not preserve behavioral or schema compatibility with the earlier implementation.

Implemented scope in this baseline:

- MOD-000 Platform Foundation: PostgreSQL authority, opaque sessions, CSRF, tenant context, append-only audit, private MinIO files, sensitive-field AEAD crypto, trusted BullMQ job dispatch, health/readiness and shared web security.
- MOD-001 Platform Admin / School Onboarding / Academics / Operators / TC orchestration / Platform dashboard.
- MOD-002 School Operator login, logout and non-enumerating password-reset request.

MOD-003+ are intentionally not implemented yet. MOD-001's student read port is fail-closed until MOD-003 binds the approved `StudentsPublicFacade`.

## Local bootstrap

1. Copy `.env.example` to `.env` and replace every secret/default credential.
2. `npm install`
3. `npm run prisma:generate`
4. `docker compose up -d postgres redis minio`
5. `npm run prisma:migrate`
6. `npm run seed:admin`
7. `npm run dev`

No GitHub Actions/CI workflow is required by this project; validation is local/manual per project owner direction.
