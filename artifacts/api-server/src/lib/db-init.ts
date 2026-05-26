/**
 * Database auto-initialization — runs on server startup with retry.
 * Creates all tables (IF NOT EXISTS) and seeds initial data only when DB is empty.
 * Safe to run multiple times (idempotent).
 */
import { pool } from "@workspace/db";
import { hashPasswordSync } from "./security.js";

async function runSql(sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

async function tryInitOnce(): Promise<void> {
  // ─── Core schema tables ──────────────────────────────────────────────────
  await runSql(`CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, logo TEXT, address TEXT,
    phone TEXT, email TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
    company_code TEXT,
    attendance_location_mode TEXT NOT NULL DEFAULT 'disabled',
    currency TEXT NOT NULL DEFAULT 'IQD',
    overtime_rate REAL NOT NULL DEFAULT 1.5,
    late_deduction_rate REAL NOT NULL DEFAULT 1.0,
    absence_deduction_rate REAL NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, full_name TEXT NOT NULL, email TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, address TEXT, city TEXT, phone TEXT,
    latitude REAL, longitude REAL, radius_meters INTEGER DEFAULT 200,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
    work_days TEXT NOT NULL DEFAULT '0,1,2,3,4',
    late_grace_minutes INTEGER NOT NULL DEFAULT 15, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    username TEXT NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL,
    email TEXT, phone TEXT, address TEXT, job_title TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    salary REAL, face_descriptor TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0, locked_until TIMESTAMP,
    last_login_at TIMESTAMP, last_login_ip TEXT, password_changed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL, check_in_time TIMESTAMP, check_out_time TIMESTAMP,
    break_start_time TIMESTAMP, break_end_time TIMESTAMP,
    check_in_lat REAL, check_in_lng REAL, check_out_lat REAL, check_out_lng REAL,
    working_hours REAL, break_hours REAL, late_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'absent',
    notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL DEFAULT 'annual', start_date DATE NOT NULL, end_date DATE NOT NULL,
    reason TEXT, status TEXT NOT NULL DEFAULT 'pending', rejection_reason TEXT,
    total_days INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    key TEXT NOT NULL, value TEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS company_location (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'المقر الرئيسي',
    latitude REAL NOT NULL DEFAULT 33.3152, longitude REAL NOT NULL DEFAULT 44.3661,
    radius_meters INTEGER NOT NULL DEFAULT 200, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sender_id INTEGER, sender_type TEXT NOT NULL, sender_name TEXT NOT NULL,
    channel TEXT NOT NULL, content TEXT NOT NULL, is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL, year INTEGER NOT NULL,
    basic_salary REAL NOT NULL DEFAULT 0, incentives REAL NOT NULL DEFAULT 0,
    overtime_pay REAL NOT NULL DEFAULT 0, deductions REAL NOT NULL DEFAULT 0,
    advances REAL NOT NULL DEFAULT 0, late_deduction REAL NOT NULL DEFAULT 0,
    absence_deduction REAL NOT NULL DEFAULT 0, net_salary REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IQD', status TEXT NOT NULL DEFAULT 'unpaid',
    paid_at TIMESTAMP, work_days INTEGER NOT NULL DEFAULT 0,
    absent_days INTEGER NOT NULL DEFAULT 0, late_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_minutes INTEGER NOT NULL DEFAULT 0, leave_days INTEGER NOT NULL DEFAULT 0,
    notes TEXT, created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT payroll_unique_period UNIQUE (company_id, employee_id, month, year)
  )`);

  // Add unique constraint to existing payroll table if it doesn't have one (idempotent)
  await runSql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_unique_period'
      ) THEN
        ALTER TABLE payroll ADD CONSTRAINT payroll_unique_period
          UNIQUE (company_id, employee_id, month, year);
      END IF;
    END $$
  `);

  await runSql(`CREATE TABLE IF NOT EXISTS payroll_logs (
    id SERIAL PRIMARY KEY,
    payroll_id INTEGER NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL, old_value TEXT, new_value TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  // ─── Security tables ─────────────────────────────────────────────────────
  await runSql(`CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY, company_id INTEGER, user_id INTEGER,
    user_role TEXT, user_name TEXT, action TEXT NOT NULL, resource TEXT NOT NULL,
    resource_id TEXT, details JSONB, ip_address TEXT, user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success', created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY, company_id INTEGER, event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'low', description TEXT NOT NULL,
    ip_address TEXT, user_id INTEGER, user_name TEXT, metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY, ip_address TEXT NOT NULL, username TEXT,
    company_id INTEGER, success BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created
    ON login_attempts(ip_address, created_at)`);

  await runSql(`CREATE TABLE IF NOT EXISTS active_sessions (
    session_id TEXT PRIMARY KEY, user_id INTEGER, company_id INTEGER,
    super_admin_id INTEGER, ip_address TEXT, user_agent TEXT, device_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), last_active_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  // ─── Subscription system tables ──────────────────────────────────────────
  await runSql(`CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('monthly','semi_annual','annual','lifetime')),
    price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    max_employees INTEGER NOT NULL DEFAULT 10,
    max_branches INTEGER NOT NULL DEFAULT 1,
    storage_gb REAL NOT NULL DEFAULT 1,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS company_subscriptions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','trial')),
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    max_employees INTEGER NOT NULL DEFAULT 10,
    max_branches INTEGER NOT NULL DEFAULT 1,
    storage_gb REAL NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS payment_records (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES company_subscriptions(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_method TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','failed','refunded')),
    plan_type TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    notes TEXT,
    paid_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE TABLE IF NOT EXISTS system_notifications (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await runSql(`CREATE INDEX IF NOT EXISTS idx_system_notifications_created ON system_notifications(created_at DESC)`);
  await runSql(`CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions(company_id)`);
  await runSql(`CREATE INDEX IF NOT EXISTS idx_payment_records_company ON payment_records(company_id)`);

  await runSql(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS _dummy INT`);
  await runSql(`ALTER TABLE subscription_plans DROP COLUMN IF EXISTS _dummy`);
  await runSql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_type ON subscription_plans(type)
  `);
  await runSql(`INSERT INTO subscription_plans (name, type, price, currency, max_employees, max_branches, storage_gb, features)
    VALUES
      ('الشهري',     'monthly',      99,   'USD', 20,  3,  5,  '["حضور وانصراف","تقارير أساسية","دعم البريد"]'),
      ('نصف سنوي',  'semi_annual',  400,  'USD', 50,  5,  15, '["حضور وانصراف","تقارير متقدمة","رسائل","دعم أولوية"]'),
      ('السنوي',     'annual',       799,  'USD', 150, 15, 50, '["حضور وانصراف","تقارير متقدمة","رسائل","رواتب","دعم أولوية","نسخ احتياطي"]'),
      ('مدى الحياة', 'lifetime',     5000, 'USD', 999, 99, 200,'["جميع الميزات","موظفون غير محدودون","دعم VIP","تحديثات مجانية"]')
    ON CONFLICT (type) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      max_employees = EXCLUDED.max_employees,
      max_branches = EXCLUDED.max_branches,
      storage_gb = EXCLUDED.storage_gb,
      features = EXCLUDED.features
  `);

  // ─── Public holidays table ────────────────────────────────────────────────
  await runSql(`CREATE TABLE IF NOT EXISTS public_holidays (
    id           SERIAL PRIMARY KEY,
    company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    date         DATE NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    notes        TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
  )`);
  await runSql(`CREATE INDEX IF NOT EXISTS idx_holidays_company ON public_holidays(company_id)`);
  await runSql(`CREATE INDEX IF NOT EXISTS idx_holidays_date    ON public_holidays(date)`);

  // ─── Add preference columns if missing (idempotent) ─────────────────────
  await runSql(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferred_theme TEXT NOT NULL DEFAULT 'dark'`);
  await runSql(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferred_lang  TEXT NOT NULL DEFAULT 'ar'`);

  // ─── Add company_code column if missing (idempotent) ─────────────────────
  await runSql(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_code TEXT`);

  // ─── Weekly off days per company (idempotent) ─────────────────────────────
  // "5,6" = Friday+Saturday (common in Iraq/Middle East). 0=Sun…6=Sat.
  await runSql(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS weekly_off_days TEXT NOT NULL DEFAULT '5,6'`);

  console.log("[DB-Init] All tables verified ✓");

  // ─── Seed super admin ONLY if none exist ─────────────────────────────────
  // Uses "ANY super admin" check so renamed accounts are not overwritten.
  const client = await pool.connect();
  try {
    const { rows: existingSAs } = await client.query(`SELECT id FROM super_admins LIMIT 1`);
    if (existingSAs.length === 0) {
      const saHash = hashPasswordSync("superadmin123");
      await client.query(`
        INSERT INTO super_admins (username, password_hash, full_name, email)
        VALUES ('gaffr20000', '${saHash}', 'مدير النظام الرئيسي', 'gaffr@system.iq')
      `);
      console.log("[DB-Init] ✓ Super admin seeded: gaffr20000 / superadmin123");
    } else {
      console.log("[DB-Init] ✓ Super admin account exists (preserved)");
    }

    // ─── Seed default company + test accounts ONLY if no companies exist ────
    const { rows: existing } = await client.query(`SELECT id FROM companies LIMIT 1`);
    if (existing.length === 0) {
      const adminHash   = hashPasswordSync("admin123");
      const managerHash = hashPasswordSync("manager123");
      const empHash     = hashPasswordSync("emp123");

      const { rows: [{ id: cId }] } = await client.query(`
        INSERT INTO companies (name, address, phone, email, is_active, currency)
        VALUES ('شركة الحضور النموذجية', 'بغداد، العراق', '07700000000', 'admin@attendance.iq', TRUE, 'IQD')
        RETURNING id`);

      const { rows: [{ id: dId }] } = await client.query(
        `INSERT INTO departments (company_id, name) VALUES ($1, 'الإدارة العامة') RETURNING id`, [cId]);

      const { rows: [{ id: sId }] } = await client.query(
        `INSERT INTO shifts (company_id, name, start_time, end_time, work_days, late_grace_minutes)
         VALUES ($1, 'الدوام الصباحي', '08:00', '16:00', '0,1,2,3,4', 15) RETURNING id`, [cId]);

      await client.query(
        `INSERT INTO branches (company_id, name, is_active) VALUES ($1, 'الفرع الرئيسي', TRUE)`, [cId]);

      await client.query(
        `INSERT INTO company_location (company_id, name, latitude, longitude, radius_meters)
         VALUES ($1, 'المقر الرئيسي', 33.3152, 44.3661, 200)`, [cId]);

      await client.query(`
        INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
        VALUES
          ($1,'admin','${adminHash}','مدير الشركة','admin@co.iq','admin',$2,$3,1500000,TRUE),
          ($1,'manager1','${managerHash}','المدير التنفيذي','mgr@co.iq','manager',$2,$3,1200000,TRUE),
          ($1,'emp1','${empHash}','موظف تجريبي','emp1@co.iq','employee',$2,$3,800000,TRUE)
      `, [cId, dId, sId]);

      console.log(`[DB-Init] ✓ Default company (id=${cId}) + test accounts created`);
    } else {
      console.log("[DB-Init] ✓ Companies exist (preserved)");
    }
  } finally {
    client.release();
  }

  console.log("[DB-Init] Database initialization complete ✓");
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
export async function initializeDatabase(): Promise<void> {
  console.log("[DB-Init] Initializing database schema...");
  let attempt = 0;
  const RETRY_MS = 30_000;

  const tryInit = async () => {
    attempt++;
    try {
      await tryInitOnce();
    } catch (err: any) {
      console.error(`[DB-Init] Attempt ${attempt} failed: ${err.message}. Retrying in ${RETRY_MS / 1000}s...`);
      setTimeout(tryInit, RETRY_MS);
    }
  };

  await tryInit();
}
