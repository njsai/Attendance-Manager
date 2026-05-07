-- Migration 002: Security, audit, and session tracking tables

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  user_id INTEGER,
  user_role TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs
  ADD CONSTRAINT IF NOT EXISTS audit_logs_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
  NOT VALID;

CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT NOT NULL,
  ip_address TEXT,
  user_id INTEGER,
  user_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  username TEXT,
  company_id INTEGER,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created ON login_attempts(ip_address, created_at);

CREATE TABLE IF NOT EXISTS active_sessions (
  session_id TEXT PRIMARY KEY,
  user_id INTEGER,
  company_id INTEGER,
  super_admin_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  device_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMP NOT NULL DEFAULT NOW()
);
