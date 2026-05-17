-- Add emergency contact fields to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_rel   TEXT;

-- Employee documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_data     TEXT NOT NULL,
  file_mime     TEXT NOT NULL DEFAULT 'application/octet-stream',
  status        TEXT NOT NULL DEFAULT 'pending',
  uploaded_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMP,
  reviewed_by   INTEGER REFERENCES employees(id) ON DELETE SET NULL
);

-- Profile audit logs table (separate from security audit_logs)
CREATE TABLE IF NOT EXISTS profile_audit_logs (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id      INTEGER NOT NULL,
  actor_name    TEXT NOT NULL,
  target_id     INTEGER,
  target_name   TEXT,
  action        TEXT NOT NULL,
  field         TEXT,
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_company  ON employee_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_company  ON profile_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_target   ON profile_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_actor    ON profile_audit_logs(actor_id);
