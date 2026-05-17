CREATE TABLE IF NOT EXISTS user_notifications (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  related_id   INTEGER,
  related_type VARCHAR(50),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifs_employee ON user_notifications(employee_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifs_company  ON user_notifications(company_id);
