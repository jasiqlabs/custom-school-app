CREATE TYPE "FeeDueStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('ACTIVE', 'VOIDED');

CREATE TABLE class_fee_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  effective_month varchar(7) NOT NULL,
  amount numeric(12,2) NOT NULL,
  status "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_class_fee_config_amount CHECK (amount > 0),
  UNIQUE (school_id, class_id, effective_month)
);

CREATE INDEX class_fee_configs_school_class_status_idx ON class_fee_configs(school_id, class_id, status);

CREATE TABLE fee_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  fee_config_id uuid REFERENCES class_fee_configs(id) ON DELETE SET NULL,
  fee_month varchar(7) NOT NULL,
  base_amount numeric(12,2) NOT NULL,
  concession_type_snapshot "ConcessionType" NOT NULL DEFAULT 'NONE',
  concession_value_snapshot numeric(12,2) NOT NULL DEFAULT 0,
  concession_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_due numeric(12,2) NOT NULL,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL,
  status "FeeDueStatus" NOT NULL DEFAULT 'UNPAID',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_fee_dues_amounts CHECK (
    base_amount >= 0 AND
    concession_amount >= 0 AND
    net_due >= 0 AND
    paid_amount >= 0 AND
    balance >= 0 AND
    (paid_amount + balance = net_due)
  ),
  UNIQUE (school_id, student_id, fee_month)
);

CREATE INDEX fee_dues_school_month_status_idx ON fee_dues(school_id, fee_month, status);
CREATE INDEX fee_dues_school_class_month_idx ON fee_dues(school_id, class_id, fee_month);

CREATE TABLE fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  due_id uuid NOT NULL REFERENCES fee_dues(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  receipt_number varchar(64) NOT NULL,
  student_code_snapshot varchar(64) NOT NULL,
  student_name_snapshot varchar(255) NOT NULL,
  amount numeric(12,2) NOT NULL,
  mode "PaymentMode" NOT NULL DEFAULT 'CASH',
  payment_date date NOT NULL,
  reference varchar(128),
  status "PaymentStatus" NOT NULL DEFAULT 'ACTIVE',
  idempotency_key varchar(128) NOT NULL,
  request_hash varchar(64),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text,
  voided_by uuid,
  CONSTRAINT check_fee_payment_amount CHECK (amount > 0),
  UNIQUE (school_id, receipt_number),
  UNIQUE (school_id, idempotency_key)
);

CREATE INDEX fee_payments_school_student_date_idx ON fee_payments(school_id, student_id, payment_date);
CREATE INDEX fee_payments_school_status_date_idx ON fee_payments(school_id, status, payment_date);

CREATE TABLE receipt_sequences (
  school_id varchar(36) PRIMARY KEY REFERENCES schools(id) ON DELETE RESTRICT,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
