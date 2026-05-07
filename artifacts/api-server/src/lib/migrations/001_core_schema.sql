-- Migration 001: Core schema tables
-- Safe: uses CREATE TABLE IF NOT EXISTS — never drops data
-- Applied once, tracked in schema_migrations

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  attendance_location_mode TEXT NOT NULL DEFAULT 'disabled',
  currency TEXT NOT NULL DEFAULT 'IQD',
  overtime_rate REAL NOT NULL DEFAULT 1.5,
  late_deduction_rate REAL NOT NULL DEFAULT 1.0,
  absence_deduction_rate REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  latitude REAL,
  longitude REAL,
  radius_meters INTEGER DEFAULT 200,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  work_days TEXT NOT NULL DEFAULT '0,1,2,3,4',
  late_grace_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  job_title TEXT,
  role TEXT NOT NULL DEFAULT 'employee',
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  salary REAL,
  face_descriptor TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip TEXT,
  password_changed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_employees_company_active ON employees(company_id, is_active);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  break_start_time TIMESTAMP,
  break_end_time TIMESTAMP,
  check_in_lat REAL,
  check_in_lng REAL,
  check_out_lat REAL,
  check_out_lng REAL,
  working_hours REAL,
  break_hours REAL,
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'absent',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  total_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_location (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'المقر الرئيسي',
  latitude REAL NOT NULL DEFAULT 33.3152,
  longitude REAL NOT NULL DEFAULT 44.3661,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_id INTEGER,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary REAL NOT NULL DEFAULT 0,
  incentives REAL NOT NULL DEFAULT 0,
  overtime_pay REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  advances REAL NOT NULL DEFAULT 0,
  late_deduction REAL NOT NULL DEFAULT 0,
  absence_deduction REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  status TEXT NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMP,
  work_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  leave_days INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_company_id_employee_id_month_year_key UNIQUE (company_id, employee_id, month, year),
  CONSTRAINT payroll_month_check CHECK (month >= 1 AND month <= 12)
);

CREATE INDEX IF NOT EXISTS idx_payroll_company_id ON payroll(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON payroll(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(company_id, status);

CREATE TABLE IF NOT EXISTS payroll_logs (
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
