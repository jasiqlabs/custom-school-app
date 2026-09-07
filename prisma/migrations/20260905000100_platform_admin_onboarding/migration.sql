-- MOD-001 Migration: Platform Admin & School Onboarding

-- 1. Alter Schools Table
ALTER TABLE "schools" 
  ADD COLUMN IF NOT EXISTS "school_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "logo_file_id" UUID;

ALTER TABLE "schools" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX IF NOT EXISTS "schools_school_uuid_key" ON "schools"("school_uuid");

-- Prevent school_uuid mutation trigger
CREATE OR REPLACE FUNCTION prevent_school_uuid_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_uuid <> OLD.school_uuid THEN
    RAISE EXCEPTION 'school_uuid is immutable and cannot be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_school_uuid_update ON "schools";
CREATE TRIGGER trg_prevent_school_uuid_update
BEFORE UPDATE OF school_uuid ON "schools"
FOR EACH ROW
EXECUTE FUNCTION prevent_school_uuid_update();

-- 2. Alter Users Table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(255) NOT NULL DEFAULT 'User';

-- 3. Create school_principals Table
CREATE TABLE IF NOT EXISTS "school_principals" (
  "school_id" UUID PRIMARY KEY REFERENCES "schools"("id") ON DELETE CASCADE,
  "principal_name" VARCHAR(255),
  "contact_number" VARCHAR(32),
  "signature_file_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 4. Create classes Table
CREATE TABLE IF NOT EXISTS "classes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL REFERENCES "schools"("id") ON DELETE RESTRICT,
  "name" VARCHAR(64) NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "classes_school_id_name_key" UNIQUE ("school_id", "name")
);

-- 5. Create sections Table
CREATE TABLE IF NOT EXISTS "sections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL REFERENCES "schools"("id") ON DELETE RESTRICT,
  "class_id" UUID NOT NULL REFERENCES "classes"("id") ON DELETE RESTRICT,
  "name" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "sections_school_id_class_id_name_key" UNIQUE ("school_id", "class_id", "name")
);

-- 6. Create school_operators Table
CREATE TABLE IF NOT EXISTS "school_operators" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL REFERENCES "schools"("id") ON DELETE RESTRICT,
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "school_operators_school_id_idx" ON "school_operators"("school_id");

-- 7. Create tc_generation_logs Table
CREATE TABLE IF NOT EXISTS "tc_generation_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL REFERENCES "schools"("id") ON DELETE RESTRICT,
  "job_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "generated_by_user_id" UUID NOT NULL,
  "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "tc_generation_logs_school_id_idx" ON "tc_generation_logs"("school_id");
