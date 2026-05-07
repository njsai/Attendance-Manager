/**
 * DB initialization script - creates all tables + seed data
 * Run: node scripts/src/init-db.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pg = require("/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js");
const { Pool } = pg;
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
});

function sha256(p) {
  return crypto.createHash("sha256").update(p + "salt_attend_2024").digest("hex");
}

async function run(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function main() {
  console.log("🚀 Starting DB initialization...");

  // ─── Create Tables ─────────────────────────────────────────────────────────
  await run(`
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
  `);
  console.log("✅ companies");

  await run(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ super_admins");

  await run(`
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
  `);
  console.log("✅ branches");

  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ departments");

  await run(`
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
  `);
  console.log("✅ shifts");

  await run(`
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
  `);
  console.log("✅ employees");

  await run(`
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
  `);
  console.log("✅ attendance");

  await run(`
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
  `);
  console.log("✅ leaves");

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ settings");

  await run(`
    CREATE TABLE IF NOT EXISTS company_location (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'المقر الرئيسي',
      latitude REAL NOT NULL DEFAULT 33.3152,
      longitude REAL NOT NULL DEFAULT 44.3661,
      radius_meters INTEGER NOT NULL DEFAULT 200,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ company_location");

  await run(`
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
  `);
  console.log("✅ messages");

  await run(`
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
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ payroll");

  await run(`
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
  `);
  console.log("✅ payroll_logs");

  // ─── Seed Data ─────────────────────────────────────────────────────────────
  console.log("\n📦 Seeding initial data...");

  // Super admin
  const saHash = sha256("superadmin123");
  await run(`
    INSERT INTO super_admins (username, password_hash, full_name, email)
    VALUES ('superadmin', $1, 'مدير النظام الرئيسي', 'superadmin@system.iq')
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `, [saHash]);
  console.log("✅ Super admin: superadmin / superadmin123");

  // Default company
  const compRes = await run(`
    INSERT INTO companies (name, address, phone, email, is_active, currency)
    VALUES ('شركة الحضور النموذجية', 'بغداد، العراق', '07700000000', 'admin@attendance.iq', TRUE, 'IQD')
    ON CONFLICT DO NOTHING
    RETURNING id;
  `);

  let companyId;
  if (compRes.rows.length > 0) {
    companyId = compRes.rows[0].id;
    console.log(`✅ Created company, id=${companyId}`);
  } else {
    const existing = await run(`SELECT id FROM companies ORDER BY id LIMIT 1;`);
    companyId = existing.rows[0].id;
    console.log(`ℹ️  Using existing company, id=${companyId}`);
  }

  // Default department
  const deptRes = await run(`
    INSERT INTO departments (company_id, name, description)
    VALUES ($1, 'الإدارة', 'قسم الإدارة العامة')
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [companyId]);
  let deptId = deptRes.rows[0]?.id;
  if (!deptId) {
    const ex = await run(`SELECT id FROM departments WHERE company_id=$1 LIMIT 1`, [companyId]);
    deptId = ex.rows[0]?.id;
  }
  console.log(`✅ Department id=${deptId}`);

  // Default shift
  const shiftRes = await run(`
    INSERT INTO shifts (company_id, name, start_time, end_time, work_days, late_grace_minutes)
    VALUES ($1, 'الدوام الصباحي', '08:00', '16:00', '0,1,2,3,4', 15)
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [companyId]);
  let shiftId = shiftRes.rows[0]?.id;
  if (!shiftId) {
    const ex = await run(`SELECT id FROM shifts WHERE company_id=$1 LIMIT 1`, [companyId]);
    shiftId = ex.rows[0]?.id;
  }
  console.log(`✅ Shift id=${shiftId}`);

  // Admin employee
  const adminHash = sha256("admin123");
  const adminRes = await run(`
    INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
    VALUES ($1, 'admin', $2, 'مدير الشركة', 'admin@company.iq', 'admin', $3, $4, 1500000, TRUE)
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [companyId, adminHash, deptId, shiftId]);
  console.log(`✅ Admin: admin / admin123 (id=${adminRes.rows[0]?.id ?? 'exists'})`);

  // Manager employee
  const managerHash = sha256("manager123");
  const managerRes = await run(`
    INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
    VALUES ($1, 'manager1', $2, 'المدير التنفيذي', 'manager@company.iq', 'manager', $3, $4, 1200000, TRUE)
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [companyId, managerHash, deptId, shiftId]);
  console.log(`✅ Manager: manager1 / manager123 (id=${managerRes.rows[0]?.id ?? 'exists'})`);

  // Employee
  const empHash = sha256("emp123");
  const empRes = await run(`
    INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
    VALUES ($1, 'emp1', $2, 'موظف تجريبي', 'emp1@company.iq', 'employee', $3, $4, 800000, TRUE)
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [companyId, empHash, deptId, shiftId]);
  console.log(`✅ Employee: emp1 / emp123 (id=${empRes.rows[0]?.id ?? 'exists'})`);

  // Company location
  await run(`
    INSERT INTO company_location (company_id, name, latitude, longitude, radius_meters)
    VALUES ($1, 'المقر الرئيسي', 33.3152, 44.3661, 200)
    ON CONFLICT DO NOTHING;
  `, [companyId]);
  console.log("✅ Company location");

  // Verify
  const empCount = await run(`SELECT COUNT(*) FROM employees WHERE company_id=$1`, [companyId]);
  const saCount = await run(`SELECT COUNT(*) FROM super_admins`);
  console.log(`\n📊 Summary: ${empCount.rows[0].count} employees, ${saCount.rows[0].count} super admins`);
  console.log("\n✅ DB initialization complete!");
  console.log("\n🔑 Test accounts:");
  console.log("   Super Admin: superadmin / superadmin123  → /super-admin/login");
  console.log("   Admin:       admin / admin123");
  console.log("   Manager:     manager1 / manager123");
  console.log("   Employee:    emp1 / emp123");

  await pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
