-- CreateEnum
CREATE TYPE "ChargeKind" AS ENUM ('ONE_TIME', 'RECURRING', 'EVENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "RecurrencePolicy" AS ENUM ('MONTHLY', 'ANNUAL', 'TERM', 'ONE_TIME');

-- CreateTable
CREATE TABLE "fee_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "charge_kind" "ChargeKind" NOT NULL DEFAULT 'RECURRING',
    "description" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "academic_session_id" UUID,
    "class_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "valid_until" DATE,
    "recurrence_policy" "RecurrencePolicy" NOT NULL DEFAULT 'MONTHLY',
    "payment_due_offset" INTEGER,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_rules_amount_check" CHECK ("amount" >= 0),
    CONSTRAINT "fee_rules_dates_check" CHECK ("valid_until" IS NULL OR "valid_until" >= "effective_from")
);

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_school_id_code_key" ON "fee_categories"("school_id", "code");
CREATE UNIQUE INDEX "fee_categories_school_id_id_key" ON "fee_categories"("school_id", "id");
CREATE INDEX "fee_categories_school_id_status_idx" ON "fee_categories"("school_id", "status");

-- CreateIndex
CREATE INDEX "fee_rules_school_id_category_id_status_idx" ON "fee_rules"("school_id", "category_id", "status");
CREATE INDEX "fee_rules_school_id_class_id_status_idx" ON "fee_rules"("school_id", "class_id", "status");
CREATE INDEX "fee_rules_school_id_academic_session_id_status_idx" ON "fee_rules"("school_id", "academic_session_id", "status");
CREATE INDEX "fee_rules_school_id_effective_from_valid_until_idx" ON "fee_rules"("school_id", "effective_from", "valid_until");

-- AddForeignKey
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
