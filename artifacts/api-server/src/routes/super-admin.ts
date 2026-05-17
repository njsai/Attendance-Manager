import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, employeesTable, superAdminsTable, branchesTable, departmentsTable, shiftsTable, companyLocationTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireSuperAdmin, hashPassword, verifyPassword } from "../lib/auth.js";
import { hashPasswordBcrypt } from "../lib/security.js";
import { existsSync, statSync, readdirSync, unlinkSync, createReadStream } from "fs";
import { join } from "path";
import { BACKUP_DIR, createBackupForCompany } from "../lib/backup-scheduler.js";

const router = Router();

// ─── Generate a unique company code ──────────────────────────────────────────
function generateCompanyCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // skip I and O to avoid confusion
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
  code += "-";
  for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
  return code;
}

async function generateUniqueCompanyCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCompanyCode();
    const [existing] = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.companyCode, code));
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique company code");
}

// ─── Get all companies with stats + subscription info ────────────────────────
router.get("/companies", requireSuperAdmin, async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        c.*,
        COUNT(e.id)::int AS employee_count,
        cs.id          AS sub_id,
        cs.plan_name,
        cs.plan_type,
        cs.status      AS sub_status,
        cs.end_date,
        CASE
          WHEN cs.end_date IS NULL THEN NULL
          ELSE (cs.end_date - CURRENT_DATE)::int
        END AS days_remaining
      FROM companies c
      LEFT JOIN employees e ON e.company_id = c.id
      LEFT JOIN LATERAL (
        SELECT id, plan_name, plan_type, status, end_date
        FROM company_subscriptions
        WHERE company_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) cs ON TRUE
      GROUP BY c.id, cs.id, cs.plan_name, cs.plan_type, cs.status, cs.end_date
      ORDER BY
        CASE
          WHEN cs.end_date IS NOT NULL AND cs.status = 'active' THEN cs.end_date
          ELSE '9999-12-31'::date
        END ASC,
        c.created_at DESC
    `);
    const result = (rows.rows as any[]).map(r => ({
      id: r.id, name: r.name, address: r.address, phone: r.phone, email: r.email,
      isActive: r.is_active, companyCode: r.company_code, currency: r.currency,
      createdAt: r.created_at, employeeCount: Number(r.employee_count),
      subId: r.sub_id, planName: r.plan_name, planType: r.plan_type,
      subStatus: r.sub_status, endDate: r.end_date,
      daysRemaining: r.days_remaining !== null ? Number(r.days_remaining) : null,
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Get single company ───────────────────────────────────────────────────────
router.get("/companies/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
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

    const companyCode = await generateUniqueCompanyCode();

    const [company] = await db.insert(companiesTable)
      .values({ name, address, phone, email, isActive: true, companyCode })
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
      username: adminUsername.trim().toLowerCase(),
      passwordHash: adminHash,
      fullName: adminFullName,
      role: "admin",
      isActive: true,
    }).returning({ id: employeesTable.id, username: employeesTable.username });

    // Auto-assign full-access lifetime subscription
    await db.execute(sql`
      INSERT INTO company_subscriptions
        (company_id, plan_id, plan_name, plan_type, price, currency,
         start_date, end_date, status, auto_renew,
         max_employees, max_branches, storage_gb, notes)
      VALUES
        (${company.id}, NULL, 'الوصول الكامل', 'lifetime', 0, 'IQD',
         CURRENT_DATE, NULL, 'active', false,
         999999, 999999, 999, 'مضاف تلقائياً عند إنشاء الشركة')
    `);

    await db.execute(sql`
      INSERT INTO system_notifications (type, severity, title, message, company_id)
      VALUES ('company_created', 'success', 'شركة جديدة', ${'تم إنشاء شركة "' + name + '" وتفعيل اشتراكها الكامل'}, ${company.id})
    `);

    res.status(201).json({
      company,
      admin,
      companyCode,
      message: `تم إنشاء الشركة بنجاح. كود الشركة: ${companyCode}`,
    });
  } catch (err: any) {
    console.error(err);
    const isDupe2 = err.code === "23505" || err.cause?.code === "23505";
    if (isDupe2) res.status(409).json({ message: "اسم المستخدم موجود مسبقاً في هذه الشركة" });
    else res.status(500).json({ message: "Server error" });
  }
});

// ─── Update company ───────────────────────────────────────────────────────────
router.put("/companies/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { name, address, phone, email, isActive } = req.body;
    const [updated] = await db.update(companiesTable)
      .set({ name, address, phone, email, isActive })
      .where(eq(companiesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ message: "Not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Regenerate company code ──────────────────────────────────────────────────
router.post("/companies/:id/regenerate-code", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const newCode = await generateUniqueCompanyCode();
    const [updated] = await db.update(companiesTable)
      .set({ companyCode: newCode })
      .where(eq(companiesTable.id, id))
      .returning({ id: companiesTable.id, name: companiesTable.name, companyCode: companiesTable.companyCode });
    if (!updated) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ ...updated, message: `تم تجديد كود الشركة: ${newCode}` });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Delete company ───────────────────────────────────────────────────────────
router.delete("/companies/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    res.json({ message: "تم حذف الشركة وجميع بياناتها" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Get employees of a company ───────────────────────────────────────────────
router.get("/companies/:id/employees", requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
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
    const companyId = parseInt(String(req.params.id));
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) { res.status(400).json({ message: "البيانات مطلوبة" }); return; }

    // Check username uniqueness within this company
    const [existing] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId));

    const empHash = await hashPasswordBcrypt(password);
    const [emp] = await db.insert(employeesTable).values({
      companyId, username: username.trim().toLowerCase(), passwordHash: empHash, fullName,
      role: role || "employee", isActive: true,
    }).returning();
    res.status(201).json(emp);
  } catch (err: any) {
    const isDupe = err.code === "23505" || err.cause?.code === "23505";
    if (isDupe) res.status(409).json({ message: "اسم المستخدم موجود مسبقاً في هذه الشركة" });
    else { console.error(err); res.status(500).json({ message: "Server error" }); }
  }
});

// ─── Change employee password ─────────────────────────────────────────────────
router.put("/companies/:companyId/employees/:empId/change-password", requireSuperAdmin, async (req, res) => {
  try {
    const empId = parseInt(String(req.params.empId));
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
    const id = parseInt(String(req.params.id));
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
    if (newPassword.length < 6) { res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }); return; }
    const [sa] = await db.select({ passwordHash: superAdminsTable.passwordHash }).from(superAdminsTable)
      .where(eq(superAdminsTable.id, req.session.superAdminId!));
    const valid = sa ? await verifyPassword(oldPassword, sa.passwordHash) : false;
    if (!valid) {
      res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    const newHash = await hashPasswordBcrypt(newPassword);
    await db.update(superAdminsTable).set({ passwordHash: newHash })
      .where(eq(superAdminsTable.id, req.session.superAdminId!));
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Update super admin username ───────────────────────────────────────────────
router.put("/profile", requireSuperAdmin, async (req, res) => {
  try {
    const { newUsername, currentPassword } = req.body;
    if (!newUsername || !currentPassword) {
      res.status(400).json({ message: "اسم المستخدم الجديد وكلمة المرور الحالية مطلوبان" });
      return;
    }
    const trimmed = newUsername.trim().toLowerCase();
    if (trimmed.length < 3) {
      res.status(400).json({ message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" });
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(trimmed)) {
      res.status(400).json({ message: "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" });
      return;
    }
    // Verify current password using bcrypt
    const [sa] = await db.select({ id: superAdminsTable.id, passwordHash: superAdminsTable.passwordHash })
      .from(superAdminsTable).where(eq(superAdminsTable.id, req.session.superAdminId!));
    const valid = sa ? await verifyPassword(currentPassword, sa.passwordHash) : false;
    if (!valid) {
      res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    // Check uniqueness
    const [existing] = await db.select({ id: superAdminsTable.id }).from(superAdminsTable)
      .where(eq(superAdminsTable.username, trimmed));
    if (existing && existing.id !== sa.id) {
      res.status(409).json({ message: "اسم المستخدم مستخدم بالفعل" });
      return;
    }
    const [updated] = await db.update(superAdminsTable)
      .set({ username: trimmed })
      .where(eq(superAdminsTable.id, sa.id))
      .returning({ id: superAdminsTable.id, username: superAdminsTable.username, fullName: superAdminsTable.fullName, email: superAdminsTable.email });
    res.json({ ...updated, message: "تم تغيير اسم المستخدم بنجاح" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── BACKUP SYSTEM ────────────────────────────────────────────────────────────

router.get("/backups", requireSuperAdmin, async (_req, res) => {
  try {
    if (!existsSync(BACKUP_DIR)) { res.json([]); return; }
    const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json"));
    const backups = files.map(f => {
      const filePath = join(BACKUP_DIR, f);
      const stat = statSync(filePath);
      const [, companyIdStr, , dateStr] = f.replace(".json", "").split("_");
      return {
        id: f, filename: f,
        companyId: companyIdStr ? parseInt(companyIdStr) : null,
        createdAt: stat.mtime.toISOString(), sizeBytes: stat.size, dateStr,
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(backups);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/backups", requireSuperAdmin, async (req, res) => {
  try {
    const rawId = req.body.companyId;
    const companyId = rawId ? parseInt(rawId) : null;
    const { filename, sizeBytes } = await createBackupForCompany(companyId);
    res.status(201).json({ id: filename, filename, companyId: companyId ?? 0, createdAt: new Date().toISOString(), sizeBytes });
  } catch (err) { console.error(err); res.status(500).json({ message: "فشل إنشاء النسخة الاحتياطية" }); }
});

router.get("/backups/:filename/download", requireSuperAdmin, (req, res) => {
  try {
    const filePath = join(BACKUP_DIR, String(req.params.filename));
    if (!existsSync(filePath)) { res.status(404).json({ message: "الملف غير موجود" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${String(req.params.filename)}"`);
    res.setHeader("Content-Type", "application/json");
    createReadStream(filePath).pipe(res);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.delete("/backups/:filename", requireSuperAdmin, (req, res) => {
  try {
    const filePath = join(BACKUP_DIR, String(req.params.filename));
    if (!existsSync(filePath)) { res.status(404).json({ message: "الملف غير موجود" }); return; }
    unlinkSync(filePath);
    res.json({ message: "تم حذف النسخة الاحتياطية" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

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
