import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, shiftsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, requireAuth } from "../lib/auth.js";

const router = Router();

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
        username: employeesTable.username,
        passwordHash: employeesTable.passwordHash,
        fullName: employeesTable.fullName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        role: employeesTable.role,
        departmentId: employeesTable.departmentId,
        shiftId: employeesTable.shiftId,
        jobTitle: employeesTable.jobTitle,
        isActive: employeesTable.isActive,
        createdAt: employeesTable.createdAt,
        departmentName: departmentsTable.name,
        shiftName: shiftsTable.name,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .where(eq(employeesTable.username, username.trim()));

    if (!employee) {
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    if (!employee.isActive) {
      res.status(401).json({ message: "الحساب غير مفعّل، تواصل مع المدير" });
      return;
    }

    const hashed = hashPassword(password);
    if (employee.passwordHash !== hashed) {
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    req.session.userId = employee.id;
    req.session.role = employee.role;

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Session save error:", saveErr);
        res.status(500).json({ message: "خطأ في حفظ الجلسة" });
        return;
      }
      const { passwordHash: _, ...employeeData } = employee;
      res.json({ employee: employeeData, message: "تم تسجيل الدخول بنجاح" });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.clearCookie("connect.sid");
    res.json({ message: "تم تسجيل الخروج" });
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
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

    const [employee] = await db
      .select({ passwordHash: employeesTable.passwordHash })
      .from(employeesTable)
      .where(eq(employeesTable.id, req.session.userId!));

    if (!employee || employee.passwordHash !== hashPassword(oldPassword)) {
      res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }

    await db
      .update(employeesTable)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(employeesTable.id, req.session.userId!));

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [employee] = await db
      .select({
        id: employeesTable.id,
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
        createdAt: employeesTable.createdAt,
        departmentName: departmentsTable.name,
        shiftName: shiftsTable.name,
        shiftStart: shiftsTable.startTime,
        shiftEnd: shiftsTable.endTime,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .where(eq(employeesTable.id, req.session.userId!));

    if (!employee) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!employee.isActive) {
      req.session.destroy(() => {});
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json(employee);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
