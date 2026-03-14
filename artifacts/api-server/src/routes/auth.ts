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
      res.status(400).json({ message: "Username and password required" });
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
      .where(eq(employeesTable.username, username));

    if (!employee) {
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      return;
    }

    if (!employee.isActive) {
      res.status(401).json({ message: "الحساب غير مفعل" });
      return;
    }

    const hashed = hashPassword(password);
    if (employee.passwordHash !== hashed) {
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      return;
    }

    req.session.userId = employee.id;
    req.session.role = employee.role;

    const { passwordHash: _, ...employeeData } = employee;
    res.json({ employee: employeeData, message: "تم تسجيل الدخول بنجاح" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "تم تسجيل الخروج" });
  });
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
      .where(eq(employeesTable.id, req.session.userId!));

    if (!employee) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
