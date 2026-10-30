-- Additive, append-only adjustment history. No old payments or charges are deleted.
CREATE TABLE IF NOT EXISTS fee_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  charge_id uuid NOT NULL REFERENCES fee_charges(id) ON DELETE RESTRICT,
  before_net_amount numeric(12,2) NOT NULL,
  delta_amount numeric(12,2) NOT NULL,
  after_net_amount numeric(12,2) NOT NULL,
  reason text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_adjustment_reconciled CHECK (before_net_amount + delta_amount = after_net_amount)
);
CREATE INDEX IF NOT EXISTS fee_adjustments_school_student_date_idx
  ON fee_adjustments(school_id, student_id, created_at);
CREATE INDEX IF NOT EXISTS fee_adjustments_school_charge_idx
  ON fee_adjustments(school_id, charge_id);
