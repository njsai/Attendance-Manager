-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_type   TEXT NOT NULL DEFAULT 'event',
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  color        TEXT,
  created_by   INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON calendar_events(company_id, start_date);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id             SERIAL PRIMARY KEY,
  company_id     INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id    INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id    INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  period_type    TEXT NOT NULL DEFAULT 'monthly',
  period_month   INTEGER,
  period_year    INTEGER NOT NULL,
  commitment     INTEGER NOT NULL DEFAULT 3,
  performance    INTEGER NOT NULL DEFAULT 3,
  cooperation    INTEGER NOT NULL DEFAULT 3,
  achievement    INTEGER NOT NULL DEFAULT 3,
  behavior       INTEGER NOT NULL DEFAULT 3,
  overall_score  REAL,
  comments       TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON performance_reviews(employee_id, period_year);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_company  ON performance_reviews(company_id);

-- Knowledge Documents
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'general',
  file_name    TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_data    TEXT NOT NULL,
  file_size    INTEGER NOT NULL DEFAULT 0,
  uploaded_by  INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_company ON knowledge_docs(company_id);
