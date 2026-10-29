-- CreateEnum
CREATE TYPE "AcademicSessionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSING', 'CLOSED');

-- CreateTable
CREATE TABLE "academic_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AcademicSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID NOT NULL,
    "activated_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "academic_sessions_dates_check" CHECK ("end_date" >= "start_date")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_school_id_code_key" ON "academic_sessions"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_school_id_id_key" ON "academic_sessions"("school_id", "id");

-- CreateIndex
CREATE INDEX "academic_sessions_school_id_status_idx" ON "academic_sessions"("school_id", "status");

-- Partial Unique Index for at most one ACTIVE or CLOSING session per school
CREATE UNIQUE INDEX "academic_session_active_closing_idx" ON "academic_sessions"("school_id") WHERE "status" IN ('ACTIVE', 'CLOSING');

-- AddForeignKey
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
