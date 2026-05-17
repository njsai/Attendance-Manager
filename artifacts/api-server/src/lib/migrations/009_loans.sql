-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id         INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount              REAL NOT NULL,
  reason              TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  installments_count  INTEGER NOT NULL DEFAULT 1,
  installments_paid   INTEGER NOT NULL DEFAULT 0,
  monthly_deduction   REAL NOT NULL DEFAULT 0,
  approved_by         INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Loan installments table
CREATE TABLE IF NOT EXISTS loan_installments (
  id          SERIAL PRIMARY KEY,
  loan_id     INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payroll_id  INTEGER REFERENCES payroll(id) ON DELETE SET NULL,
  month       INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  amount      REAL NOT NULL,
  paid_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add missing payroll columns for enhanced breakdown
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS leave_deduction REAL NOT NULL DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS loan_deduction  REAL NOT NULL DEFAULT 0;
