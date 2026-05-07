import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, employeesTable, superAdminsTable, branchesTable, departmentsTable, shiftsTable, companyLocationTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireSuperAdmin, hashPassword } from "../lib/auth.js";
import { hashPasswordBcrypt } from "../lib/security.js";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdirSync, existsSync, statSync, readdirSync, unlinkSync, createReadStream } from "fs";
import { join } from "path";

const router = Router();
const execAsync = promisify(exec);
const BACKUP_DIR = "/tmp/sa_backups";

// ─── Get all companies with stats ────────────────────────────────────────────
router.get("/companies", requireSuperAdmin, async (_req, res) => {
  try {
    const companies = await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
    const result = await Promise.all(companies.map(async (c) => {
      const [{ count: empCount }] = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.companyId, c.id));
      return { ...c, employeeCount: Number(empCount) };
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Get single company ───────────────────────────────────────────────────────
router.get("/companies/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
    if (!company) { res.status(404).json({ message: "Company not found" }); return; }
    const employees = await db.select({
      id: employeesTable.id, username: employeesTable.username, fullName: employeesTable.fullName,
      role: employeesTable.role, isActive: employeesTable.isActive,
    }).from(employeesTable).where(eq(employeesTable.companyId, id));
    res.json({ ...company, employees });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Create company ───────────────────────────────────────────────────────────
router.post("/companies", requireSuperAdmin, async (req, res) => {
  try {
    const { name, address, phone, email, adminUsername, adminPassword, adminFullName } = req.body;
    if (!name || !adminUsername || !adminPassword || !adminFullName) {
      res.status(400).json({ message: "اسم الشركة وبيانات المدير مطلوبة" });
      return;
    }

    const [company] = await db.insert(companiesTable)
      .values({ name, address, phone, email, isActive: true })
      .returning();

    await db.insert(branchesTable).values({ companyId: company.id, name: "الفرع الرئيسي", isActive: true });
    await db.insert(departmentsTable).values({ companyId: company.id, name: "الإدارة العامة" });
    await db.insert(shiftsTable).values({
      companyId: company.id, name: "الدوام الصباحي", startTime: "08:00", endTime: "16:00",
      workDays: "0,1,2,3,4", lateGraceMinutes: 15,
    });
    await db.insert(companyLocationTable).values({
      companyId: company.id, name: "المقر الرئيسي", latitude: 33.3152, longitude: 44.3661, radiusMeters: 200,
    });

    const adminHash = await hashPasswordBcrypt(adminPassword);
    const [admin] = await db.insert(employeesTable).values({
      companyId: company.id,
      username: adminUsername,
      passwordHash: adminHash,
      fullName: adminFullName,
      role: "admin",
      isActive: true,
    }).returning({ id: employeesTable.id, username: employeesTable.username });

    res.status(201).json({ company, admin, message: "تم إنشاء الشركة بنجاح" });
  } catch (err: any) {
    console.error(err);
    if (err.code === "23505") res.status(409).json({ message: "اسم المستخدم موجود مسبقاً" });
    else res.status(500).json({ message: "Server error" });
  }
});

// ─── Update company ───────────────────────────────────────────────────────────
router.put("/companies/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, phone, email, isActive } = req.body;
    const [updated] = await db.update(companiesTable)
      .set({ name, address, phone, email, isActive })
      .where(eq(companiesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ message: "Not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Delete company ───────────────────────────────────────────────────────────
router.delete("/companies/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    res.json({ message: "تم حذف الشركة وجميع بياناتها" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Get employees of a company ───────────────────────────────────────────────
router.get("/companies/:id/employees", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const employees = await db.select({
      id: employeesTable.id, username: employeesTable.username, fullName: employeesTable.fullName,
      role: employeesTable.role, isActive: employeesTable.isActive, jobTitle: employeesTable.jobTitle,
    }).from(employeesTable).where(eq(employeesTable.companyId, id)).orderBy(employeesTable.fullName);
    res.json(employees);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Add employee to company ──────────────────────────────────────────────────
router.post("/companies/:id/employees", requireSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) { res.status(400).json({ message: "البيانات مطلوبة" }); return; }
    const empHash = await hashPasswordBcrypt(password);
    const [emp] = await db.insert(employeesTable).values({
      companyId, username, passwordHash: empHash, fullName,
      role: role || "employee", isActive: true,
    }).returning();
    res.status(201).json(emp);
  } catch (err: any) {
    if (err.code === "23505") res.status(409).json({ message: "اسم المستخدم موجود" });
    else res.status(500).json({ message: "Server error" });
  }
});

// ─── Change employee password ─────────────────────────────────────────────────
router.put("/companies/:companyId/employees/:empId/change-password", requireSuperAdmin, async (req, res) => {
  try {
    const empId = parseInt(req.params.empId);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) { res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }); return; }
    const newHash = await hashPasswordBcrypt(newPassword);
    await db.execute(sql`UPDATE employees SET password_hash = ${newHash}, failed_login_attempts = 0, locked_until = NULL WHERE id = ${empId}`);
    res.json({ message: "تم تغيير كلمة المرور" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Toggle company active status ─────────────────────────────────────────────
router.put("/companies/:id/toggle", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ isActive: companiesTable.isActive }).from(companiesTable).where(eq(companiesTable.id, id));
    if (!current) { res.status(404).json({ message: "Not found" }); return; }
    const [updated] = await db.update(companiesTable).set({ isActive: !current.isActive }).where(eq(companiesTable.id, id)).returning();
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Super admin profile ──────────────────────────────────────────────────────
router.get("/profile", requireSuperAdmin, async (req, res) => {
  try {
    const [sa] = await db.select({
      id: superAdminsTable.id, username: superAdminsTable.username,
      fullName: superAdminsTable.fullName, email: superAdminsTable.email,
    }).from(superAdminsTable).where(eq(superAdminsTable.id, req.session.superAdminId!));
    if (!sa) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ ...sa, role: "super_admin" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Change super admin password ──────────────────────────────────────────────
router.post("/change-password", requireSuperAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) { res.status(400).json({ message: "جميع الحقول مطلوبة" }); return; }
    const [sa] = await db.select({ passwordHash: superAdminsTable.passwordHash }).from(superAdminsTable)
      .where(eq(superAdminsTable.id, req.session.superAdminId!));
    if (!sa || sa.passwordHash !== hashPassword(oldPassword)) {
      res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    await db.update(superAdminsTable).set({ passwordHash: hashPassword(newPassword) })
      .where(eq(superAdminsTable.id, req.session.superAdminId!));
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── BACKUP SYSTEM ────────────────────────────────────────────────────────────

// List all backups
router.get("/backups", requireSuperAdmin, async (_req, res) => {
  try {
    if (!existsSync(BACKUP_DIR)) { res.json([]); return; }
    const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json"));
    const backups = files.map(f => {
      const filePath = join(BACKUP_DIR, f);
      const stat = statSync(filePath);
      const [, companyIdStr, , dateStr] = f.replace(".json", "").split("_");
      return {
        id: f,
        filename: f,
        companyId: companyIdStr ? parseInt(companyIdStr) : null,
        createdAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        dateStr,
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(backups);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// Create backup for a company (or all: companyId = 0)
router.post("/backups", requireSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.body; // 0 = all companies
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = companyId
      ? `backup_${companyId}_company_${dateStr}.json`
      : `backup_0_all_${dateStr}.json`;
    const filePath = join(BACKUP_DIR, filename);

    // Export data via SQL
    const tables = ["companies", "branches", "departments", "shifts", "employees", "attendance", "leaves", "company_location"];
    const backup: Record<string, any[]> = {
      _meta: { createdAt: new Date().toISOString(), companyId: companyId || "all", version: "1.0" },
    } as any;

    for (const table of tables) {
      const whereClause = companyId && table !== "companies"
        ? `WHERE company_id = ${parseInt(companyId)}`
        : companyId && table === "companies"
        ? `WHERE id = ${parseInt(companyId)}`
        : "";
      const result = await db.execute(sql.raw(`SELECT * FROM ${table} ${whereClause}`));
      backup[table] = result.rows as any[];
    }

    const { writeFileSync } = await import("fs");
    writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf8");
    const stat = statSync(filePath);

    res.status(201).json({
      id: filename, filename, companyId: companyId || 0,
      createdAt: new Date().toISOString(), sizeBytes: stat.size,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "فشل إنشاء النسخة الاحتياطية" }); }
});

// Download a backup
router.get("/backups/:filename/download", requireSuperAdmin, (req, res) => {
  try {
    const filePath = join(BACKUP_DIR, req.params.filename);
    if (!existsSync(filePath)) { res.status(404).json({ message: "الملف غير موجود" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
    res.setHeader("Content-Type", "application/json");
    createReadStream(filePath).pipe(res);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// Delete a backup
router.delete("/backups/:filename", requireSuperAdmin, (req, res) => {
  try {
    const filePath = join(BACKUP_DIR, req.params.filename);
    if (!existsSync(filePath)) { res.status(404).json({ message: "الملف غير موجود" }); return; }
    unlinkSync(filePath);
    res.json({ message: "تم حذف النسخة الاحتياطية" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// Stats summary for super admin
router.get("/stats", requireSuperAdmin, async (_req, res) => {
  try {
    const companies = await db.select().from(companiesTable);
    const totalEmps = await db.select({ count: count() }).from(employeesTable);
    res.json({
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.isActive).length,
      totalEmployees: Number(totalEmps[0]?.count ?? 0),
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
