-- AlterEnum
ALTER TYPE "FileType" ADD VALUE IF NOT EXISTS 'ADMIT_CARD';
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'ADMIT_CARD_PDF';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ExamContextStatus" AS ENUM ('DRAFT', 'READY', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdmitCardStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "exam_card_contexts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_session_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "exam_code" VARCHAR(32),
  "exam_start" DATE NOT NULL,
  "exam_end" DATE NOT NULL,
  "venue" VARCHAR(200),
  "instructions" TEXT,
  "status" "ExamContextStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "exam_card_contexts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_card_contexts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_card_contexts_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_card_contexts_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admit_card_issues" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "exam_context_id" UUID NOT NULL,
  "request_key" VARCHAR(64) NOT NULL,
  "template_version" VARCHAR(64) NOT NULL DEFAULT 'standard-v1',
  "snapshot_ciphertext" TEXT NOT NULL,
  "snapshot_iv" VARCHAR(64) NOT NULL,
  "snapshot_tag" VARCHAR(64) NOT NULL,
  "key_version" VARCHAR(32) NOT NULL,
  "status" "AdmitCardStatus" NOT NULL DEFAULT 'QUEUED',
  "file_id" UUID,
  "job_id" UUID NOT NULL,
  "issued_by" UUID NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),

  CONSTRAINT "admit_card_issues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admit_card_issues_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "admit_card_issues_exam_context_id_fkey" FOREIGN KEY ("exam_context_id") REFERENCES "exam_card_contexts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "admit_card_issues_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indices
CREATE UNIQUE INDEX IF NOT EXISTS "exam_card_contexts_school_id_academic_session_id_class_id_exam_code_key"
  ON "exam_card_contexts"("school_id", "academic_session_id", "class_id", "exam_code");
CREATE INDEX IF NOT EXISTS "exam_card_contexts_school_id_academic_session_id_class_id_idx"
  ON "exam_card_contexts"("school_id", "academic_session_id", "class_id");
CREATE INDEX IF NOT EXISTS "exam_card_contexts_school_id_status_idx"
  ON "exam_card_contexts"("school_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "admit_card_issues_card_uuid_key" ON "admit_card_issues"("card_uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "admit_card_issues_job_id_key" ON "admit_card_issues"("job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "admit_card_issues_school_id_request_key_key" ON "admit_card_issues"("school_id", "request_key");
CREATE UNIQUE INDEX IF NOT EXISTS "admit_card_issues_school_id_exam_context_id_student_id_key" ON "admit_card_issues"("school_id", "exam_context_id", "student_id");
CREATE INDEX IF NOT EXISTS "admit_card_issues_school_id_exam_context_id_status_idx" ON "admit_card_issues"("school_id", "exam_context_id", "status");
CREATE INDEX IF NOT EXISTS "admit_card_issues_school_id_student_id_idx" ON "admit_card_issues"("school_id", "student_id");
