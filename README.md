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

## Configurable private file storage (MinIO / Firebase Storage)

The API and transfer-certificate worker use the same `STORAGE_PROVIDER` setting from
`.env`. Without a setting, the existing **MinIO** behavior remains the default.

- `STORAGE_PROVIDER=minio`: requires `MINIO_ENDPOINT`, `MINIO_PORT`,
  `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_BUCKET`.
- `STORAGE_PROVIDER=firebase`: requires `FIREBASE_STORAGE_BUCKET`, the **Firebase
  Cloud Storage bucket name** (such as `project-id.firebasestorage.app`, not a URL).
  Authenticate the backend using `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line
  service account JSON; do not commit) or Google Application Default Credentials
  (`GOOGLE_APPLICATION_CREDENTIALS` pointing to a readable, securely mounted
  JSON file in both API and worker containers, or workload identity).
- Ensure the service account can read/create/delete private objects, inspect the
  bucket, and sign V4 download URLs (a private key or the appropriate IAM signing
  permission is required).
- The bucket must already exist and must remain private. This integration uses
  server-side Google Cloud Storage APIs for **Firebase Storage buckets**, not the
  public Firebase client SDK or public download tokens.
- When using Firebase in the existing Docker Compose stack, MinIO may still start;
  it is only needed to read historical MinIO objects. To serve old MinIO files,
  **keep the MinIO credentials/configuration populated** even while Firebase is
  active. If you later switch back to MinIO, keep the Firebase bucket and credentials
  configured to serve Firebase-era files.

**Existing files are not migrated or rewritten.** Older `schools/...` keys stay on
MinIO; new Firebase files use `firebase/schools/...` keys. The API and worker route
reads, downloads, and signed URLs by the persisted key, so changing provider does
not silently make historic files point to the wrong bucket. Existing file size/type
checks, school authorization, 5-minute signed URLs, and SHA-256 metadata remain
unchanged. No Prisma migration is needed.

After changing `.env`, recreate/restart **both** API and worker services. Test
logo/signature upload and view, then create/download a transfer certificate using
both new and pre-existing branding files. Perform a separate bucket migration if
you intend to decommission MinIO or Firebase permanently; switching the env value
does **not** copy stored files.
