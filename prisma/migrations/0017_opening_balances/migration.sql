BEGIN;

CREATE TABLE opening_balance_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 checksum varchar(64) NOT NULL,
 file_name varchar(255) NOT NULL,
 as_of_date date NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'PREVIEW',
 total_rows int NOT NULL DEFAULT 0,
 valid_rows int NOT NULL DEFAULT 0,
 error_rows int NOT NULL DEFAULT 0,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT opening_balance_batch_unique UNIQUE(school_id,checksum,as_of_date)
);
CREATE INDEX opening_balance_batches_status_idx ON opening_balance_batches(school_id,status,created_at);
CREATE TABLE opening_balance_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 batch_id uuid NOT NULL REFERENCES opening_balance_batches(id) ON DELETE RESTRICT,
 row_number int NOT NULL,
 student_id uuid REFERENCES students(id) ON DELETE RESTRICT,
 student_code varchar(64) NOT NULL,
 origin_month varchar(7) NOT NULL,
 kind varchar(16) NOT NULL CHECK (kind IN ('DUE','EXTERNAL_PAID')),
 amount numeric(12,2) NOT NULL CHECK (amount >= 0),
 external_ref varchar(128) NOT NULL,
 source_key varchar(128) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'VALID',
 error_text text,
 charge_id uuid REFERENCES fee_charges(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT opening_balance_row_unique UNIQUE(batch_id,row_number)
);
CREATE INDEX opening_balance_rows_status_idx ON opening_balance_rows(batch_id,status);

COMMIT;
