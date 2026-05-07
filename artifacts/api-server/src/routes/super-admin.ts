import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, employeesTable, superAdminsTable, branchesTable, departmentsTable, shiftsTable, companyLocationTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireSuperAdmin, hashPassword } from "../lib/auth.js";
import { hashPasswordBcrypt } from "../lib/security.js";

const router = Router();

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

    // Create company
    const [company] = await db.insert(companiesTable)
      .values({ name, address, phone, email, isActive: true })
      .returning();

    // Create default branch
    await db.insert(branchesTable).values({ companyId: company.id, name: "الفرع الرئيسي", isActive: true });

    // Create default department
    await db.insert(departmentsTable).values({ companyId: company.id, name: "الإدارة العامة" });

    // Create default shift
    await db.insert(shiftsTable).values({
      companyId: company.id, name: "الدوام الصباحي", startTime: "08:00", endTime: "16:00",
      workDays: "0,1,2,3,4", lateGraceMinutes: 15,
    });

    // Create default company location
    await db.insert(companyLocationTable).values({
      companyId: company.id, name: "المقر الرئيسي", latitude: 33.3152, longitude: 44.3661, radiusMeters: 200,
    });

    // Create admin user for this company (bcrypt hash)
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

// ─── Change employee password (from any company) ──────────────────────────────
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

export default router;
