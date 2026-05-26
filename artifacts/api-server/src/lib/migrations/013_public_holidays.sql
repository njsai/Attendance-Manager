CREATE TABLE IF NOT EXISTS public_holidays (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  date         DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_company ON public_holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date    ON public_holidays(date);
