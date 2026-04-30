import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, shiftsTable, superAdminsTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashPassword, requireCompanyAuth } from "../lib/auth.js";

const router = Router();

// ─── Company employee login ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      return;
    }

    const [employee] = await db
      .select({
        id: employeesTable.id,
        companyId: employeesTable.companyId,
        username: employeesTable.username,
        passwordHash: employeesTable.passwordHash,
        fullName: employeesTable.fullName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        address: employeesTable.address,
        role: employeesTable.role,
        departmentId: employeesTable.departmentId,
        shiftId: employeesTable.shiftId,
        branchId: employeesTable.branchId,
        jobTitle: employeesTable.jobTitle,
        salary: employeesTable.salary,
        isActive: employeesTable.isActive,
        createdAt: employeesTable.createdAt,
        departmentName: departmentsTable.name,
        shiftName: shiftsTable.name,
        shiftStart: shiftsTable.startTime,
        shiftEnd: shiftsTable.endTime,
        companyIsActive: companiesTable.isActive,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(eq(employeesTable.username, username.trim()));

    if (!employee) {
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    if (employee.companyIsActive === false) {
      res.status(403).json({ message: "الشركة موقوفة، تواصل مع مزود الخدمة" });
      return;
    }
    if (!employee.isActive) {
      res.status(401).json({ message: "الحساب غير مفعّل، تواصل مع المدير" });
      return;
    }
    if (employee.passwordHash !== hashPassword(password)) {
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    req.session.userId = employee.id;
    req.session.role = employee.role;
    req.session.companyId = employee.companyId;
    delete (req.session as any).superAdminId;

    req.session.save((err) => {
      if (err) { res.status(500).json({ message: "خطأ في حفظ الجلسة" }); return; }
      const { passwordHash: _, companyIsActive: __, ...data } = employee;
      res.json({ employee: data, message: "تم تسجيل الدخول بنجاح" });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super admin login ────────────────────────────────────────────────────────
router.post("/super-admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "البيانات مطلوبة" });
      return;
    }
    const [sa] = await db
      .select()
      .from(superAdminsTable)
      .where(eq(superAdminsTable.username, username.trim()));

    if (!sa || sa.passwordHash !== hashPassword(password)) {
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      return;
    }

    req.session.superAdminId = sa.id;
    delete (req.session as any).userId;
    delete (req.session as any).companyId;
    delete (req.session as any).role;

    req.session.save((err) => {
      if (err) { res.status(500).json({ message: "خطأ في حفظ الجلسة" }); return; }
      const { passwordHash: _, ...data } = sa;
      res.json({ superAdmin: data, message: "مرحباً بك في لوحة التحكم الرئيسية" });
    });
  } catch (err) {
    console.error("Super admin login error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.clearCookie("attend.sid");
    res.json({ message: "تم تسجيل الخروج" });
  });
});

// ─── Change password (company employee) ──────────────────────────────────────
router.post("/change-password", requireCompanyAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: "جميع الحقول مطلوبة" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    const [emp] = await db.select({ passwordHash: employeesTable.passwordHash })
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, req.session.userId!),
        eq(employeesTable.companyId, req.session.companyId!)
      ));
    if (!emp || emp.passwordHash !== hashPassword(oldPassword)) {
      res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    await db.update(employeesTable)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(employeesTable.id, req.session.userId!));
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Who am I? ────────────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    // Super admin session
    if (req.session?.superAdminId) {
      const [sa] = await db.select().from(superAdminsTable)
        .where(eq(superAdminsTable.id, req.session.superAdminId));
      if (!sa) { res.status(401).json({ message: "Unauthorized" }); return; }
      const { passwordHash: _, ...data } = sa;
      res.json({ ...data, role: "super_admin" });
      return;
    }

    // Company employee session
    if (!req.session?.userId || !req.session?.companyId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const [employee] = await db
      .select({
        id: employeesTable.id,
        companyId: employeesTable.companyId,
        username: employeesTable.username,
        fullName: employeesTable.fullName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        address: employeesTable.address,
        role: employeesTable.role,
        departmentId: employeesTable.departmentId,
        shiftId: employeesTable.shiftId,
        branchId: employeesTable.branchId,
        jobTitle: employeesTable.jobTitle,
        salary: employeesTable.salary,
        isActive: employeesTable.isActive,
        hasFace: employeesTable.faceDescriptor,
        createdAt: employeesTable.createdAt,
        departmentName: departmentsTable.name,
        shiftName: shiftsTable.name,
        shiftStart: shiftsTable.startTime,
        shiftEnd: shiftsTable.endTime,
        companyIsActive: companiesTable.isActive,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(and(
        eq(employeesTable.id, req.session.userId!),
        eq(employeesTable.companyId, req.session.companyId!)
      ));

    if (!employee) {
      req.session.destroy(() => {});
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Block if company is deactivated — destroy session immediately
    if (employee.companyIsActive === false) {
      req.session.destroy(() => {});
      res.status(403).json({ message: "company_inactive" });
      return;
    }

    if (!employee.isActive) {
      req.session.destroy(() => {});
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { companyIsActive: _, ...empData } = employee;
    res.json({
      ...empData,
      hasFace: !!employee.hasFace,
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
