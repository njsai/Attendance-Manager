import { Router } from "express";
import { db, pool } from "@workspace/db";
import { employeesTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { hashPassword } from "../lib/auth.js";

const router = Router();

// Check if system is set up (has any users)
router.get("/status", async (_req, res) => {
  try {
    const [result] = await db.select({ count: count() }).from(employeesTable);
    res.json({ isSetup: (result?.count ?? 0) > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Full DB initialization (dev only) ────────────────────────────────────────
router.post("/db-init", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ message: "Not available in production" });
    return;
  }
  const client = await pool.connect();
  try {
    const log: string[] = [];
    const run = async (sql: string) => { await client.query(sql); };

    // Core schema tables
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
      );`); log.push("companies ✓");

    await run(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );`); log.push("super_admins ✓");

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
      );`); log.push("branches ✓");

    await run(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );`); log.push("departments ✓");

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
      );`); log.push("shifts ✓");

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
      );`); log.push("employees ✓");

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
      );`); log.push("attendance ✓");

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
      );`); log.push("leaves ✓");

    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );`); log.push("settings ✓");

    await run(`
      CREATE TABLE IF NOT EXISTS company_location (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'المقر الرئيسي',
        latitude REAL NOT NULL DEFAULT 33.3152,
        longitude REAL NOT NULL DEFAULT 44.3661,
        radius_meters INTEGER NOT NULL DEFAULT 200,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );`); log.push("company_location ✓");

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
      );`); log.push("messages ✓");

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
      );`); log.push("payroll ✓");

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
      );`); log.push("payroll_logs ✓");

    // Security tables (not in drizzle schema — created via raw SQL)
    await run(`
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
      );`); log.push("audit_logs ✓");

    await run(`
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
      );`); log.push("security_events ✓");

    await run(`
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
    `); log.push("login_attempts ✓");

    await run(`
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
      );`); log.push("active_sessions ✓");

    // ─── Seed Data ─────────────────────────────────────────────────────────
    const saHash = hashPassword("superadmin123");
    await client.query(`
      INSERT INTO super_admins (username, password_hash, full_name, email)
      VALUES ('superadmin', $1, 'مدير النظام الرئيسي', 'superadmin@system.iq')
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [saHash]);
    log.push("super_admin seeded ✓");

    const compRes = await client.query(`
      INSERT INTO companies (name, address, phone, email, is_active, currency)
      VALUES ('شركة الحضور النموذجية', 'بغداد، العراق', '07700000000', 'admin@attendance.iq', TRUE, 'IQD')
      ON CONFLICT DO NOTHING RETURNING id;
    `);
    let companyId: number;
    if (compRes.rows.length > 0) {
      companyId = compRes.rows[0].id;
    } else {
      const ex = await client.query(`SELECT id FROM companies ORDER BY id LIMIT 1;`);
      companyId = ex.rows[0]?.id;
    }
    log.push(`company id=${companyId} ✓`);

    const deptRes = await client.query(`
      INSERT INTO departments (company_id, name, description)
      VALUES ($1, 'الإدارة العامة', 'قسم الإدارة') ON CONFLICT DO NOTHING RETURNING id;
    `, [companyId]);
    let deptId = deptRes.rows[0]?.id;
    if (!deptId) {
      const ex = await client.query(`SELECT id FROM departments WHERE company_id=$1 LIMIT 1`, [companyId]);
      deptId = ex.rows[0]?.id;
    }

    const shiftRes = await client.query(`
      INSERT INTO shifts (company_id, name, start_time, end_time, work_days, late_grace_minutes)
      VALUES ($1, 'الدوام الصباحي', '08:00', '16:00', '0,1,2,3,4', 15) ON CONFLICT DO NOTHING RETURNING id;
    `, [companyId]);
    let shiftId = shiftRes.rows[0]?.id;
    if (!shiftId) {
      const ex = await client.query(`SELECT id FROM shifts WHERE company_id=$1 LIMIT 1`, [companyId]);
      shiftId = ex.rows[0]?.id;
    }

    await client.query(`
      INSERT INTO branches (company_id, name, is_active)
      VALUES ($1, 'الفرع الرئيسي', TRUE) ON CONFLICT DO NOTHING;
    `, [companyId]);

    await client.query(`
      INSERT INTO company_location (company_id, name, latitude, longitude, radius_meters)
      VALUES ($1, 'المقر الرئيسي', 33.3152, 44.3661, 200) ON CONFLICT DO NOTHING;
    `, [companyId]);

    const adminHash = hashPassword("admin123");
    await client.query(`
      INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
      VALUES ($1, 'admin', $2, 'مدير الشركة', 'admin@company.iq', 'admin', $3, $4, 1500000, TRUE)
      ON CONFLICT DO NOTHING;
    `, [companyId, adminHash, deptId, shiftId]);

    const managerHash = hashPassword("manager123");
    await client.query(`
      INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
      VALUES ($1, 'manager1', $2, 'المدير التنفيذي', 'manager@company.iq', 'manager', $3, $4, 1200000, TRUE)
      ON CONFLICT DO NOTHING;
    `, [companyId, managerHash, deptId, shiftId]);

    const empHash = hashPassword("emp123");
    await client.query(`
      INSERT INTO employees (company_id, username, password_hash, full_name, email, role, department_id, shift_id, salary, is_active)
      VALUES ($1, 'emp1', $2, 'موظف تجريبي', 'emp1@company.iq', 'employee', $3, $4, 800000, TRUE)
      ON CONFLICT DO NOTHING;
    `, [companyId, empHash, deptId, shiftId]);
    log.push("seed employees ✓");

    const empCount = await client.query(`SELECT COUNT(*) FROM employees WHERE company_id=$1`, [companyId]);
    res.json({
      success: true,
      message: "تمت تهيئة قاعدة البيانات بنجاح",
      tables: log,
      companyId,
      employeeCount: Number(empCount.rows[0].count),
      accounts: {
        superAdmin: "superadmin / superadmin123",
        admin: "admin / admin123",
        manager: "manager1 / manager123",
        employee: "emp1 / emp123",
      }
    });
  } catch (err: any) {
    console.error("DB init error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

export default router;
