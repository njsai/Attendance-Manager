import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, shiftsTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
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

// Create first user (only allowed if no users exist)
router.post("/init", async (req, res) => {
  try {
    const [result] = await db.select({ count: count() }).from(employeesTable);
    if ((result?.count ?? 0) > 0) {
      res.status(403).json({ message: "النظام مُعَد مسبقاً" });
      return;
    }

    const { fullName, username, password, role } = req.body;
    if (!fullName || !username || !password) {
      res.status(400).json({ message: "جميع الحقول مطلوبة" });
      return;
    }

    // Create default department and shift
    const [dept] = await db
      .insert(departmentsTable)
      .values({ name: "الإدارة العامة", description: "القسم الرئيسي" })
      .returning();

    const [shift] = await db
      .insert(shiftsTable)
      .values({ name: "الدوام الصباحي", startTime: "08:00", endTime: "16:00", workDays: "0,1,2,3,4", lateGraceMinutes: 15 })
      .returning();

    const passwordHash = hashPassword(password);
    const [employee] = await db
      .insert(employeesTable)
      .values({
        username,
        passwordHash,
        fullName,
        role: role || "admin",
        departmentId: dept.id,
        shiftId: shift.id,
        jobTitle: role === "admin" ? "مدير النظام" : "موظف",
        isActive: true,
      })
      .returning({ id: employeesTable.id });

    const [created] = await db
      .select({
        id: employeesTable.id,
        username: employeesTable.username,
        fullName: employeesTable.fullName,
        role: employeesTable.role,
      })
      .from(employeesTable)
      .where(eq(employeesTable.id, employee.id));

    res.status(201).json({ message: "تم إنشاء الحساب بنجاح", employee: created });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      return;
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
