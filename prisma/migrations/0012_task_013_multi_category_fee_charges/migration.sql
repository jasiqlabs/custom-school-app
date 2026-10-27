-- AlterTable: add optional transport_id to fee_rules
ALTER TABLE "fee_rules" ADD COLUMN "transport_id" UUID;

-- CreateIndex
CREATE INDEX "fee_rules_school_id_transport_id_status_idx" ON "fee_rules"("school_id", "transport_id", "status");

-- AddForeignKey
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_transport_id_fkey" FOREIGN KEY ("transport_id") REFERENCES "transports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: make due_id optional in fee_payments
ALTER TABLE "fee_payments" ALTER COLUMN "due_id" DROP NOT NULL;

-- CreateTable: fee_charges
CREATE TABLE "fee_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" VARCHAR NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_session_id" UUID,
    "class_id" UUID,
    "category_id" UUID NOT NULL,
    "rule_id" UUID,
    "source_key" VARCHAR(128) NOT NULL,
    "origin_ref" VARCHAR(64),
    "description" VARCHAR(255),
    "due_date" DATE,
    "period_start" DATE,
    "period_end" DATE,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "concession_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fine_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "FeeDueStatus" NOT NULL DEFAULT 'UNPAID',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_charges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_charges_net_amount_check" CHECK ("net_amount" >= 0),
    CONSTRAINT "fee_charges_paid_amount_check" CHECK ("paid_amount" >= 0),
    CONSTRAINT "fee_charges_balance_check" CHECK ("balance" >= 0)
);

-- CreateTable: fee_payment_allocations
CREATE TABLE "fee_payment_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" VARCHAR NOT NULL,
    "payment_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "void_reversed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_payment_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_payment_allocations_amount_check" CHECK ("amount" > 0)
);

-- Indexes for fee_charges
CREATE UNIQUE INDEX "fee_charges_school_id_source_key_key" ON "fee_charges"("school_id", "source_key");
CREATE INDEX "fee_charges_school_id_student_id_status_idx" ON "fee_charges"("school_id", "student_id", "status");
CREATE INDEX "fee_charges_school_id_category_id_status_idx" ON "fee_charges"("school_id", "category_id", "status");
CREATE INDEX "fee_charges_school_id_academic_session_id_status_idx" ON "fee_charges"("school_id", "academic_session_id", "status");
CREATE INDEX "fee_charges_school_id_class_id_status_idx" ON "fee_charges"("school_id", "class_id", "status");

-- Indexes for fee_payment_allocations
CREATE UNIQUE INDEX "fee_payment_allocations_payment_id_charge_id_key" ON "fee_payment_allocations"("payment_id", "charge_id");
CREATE INDEX "fee_payment_allocations_school_id_charge_id_idx" ON "fee_payment_allocations"("school_id", "charge_id");
CREATE INDEX "fee_payment_allocations_payment_id_idx" ON "fee_payment_allocations"("payment_id");

-- Foreign keys for fee_charges
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "fee_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys for fee_payment_allocations
ALTER TABLE "fee_payment_allocations" ADD CONSTRAINT "fee_payment_allocations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_payment_allocations" ADD CONSTRAINT "fee_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "fee_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_payment_allocations" ADD CONSTRAINT "fee_payment_allocations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "fee_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
