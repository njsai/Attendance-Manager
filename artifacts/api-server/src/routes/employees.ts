import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, shiftsTable, branchesTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";
import { requireAuth, requireAdmin, hashPassword } from "../lib/auth.js";

const router = Router();

const employeeSelect = {
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
  branchName: branchesTable.name,
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const { departmentId, branchId, search, status } = req.query;

    let query = db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id));

    const conditions = [];
    if (departmentId) conditions.push(eq(employeesTable.departmentId, parseInt(departmentId as string)));
    if (branchId) conditions.push(eq(employeesTable.branchId, parseInt(branchId as string)));
    if (status === "active") conditions.push(eq(employeesTable.isActive, true));
    if (status === "inactive") conditions.push(eq(employeesTable.isActive, false));
    if (search) {
      conditions.push(
        or(
          ilike(employeesTable.fullName, `%${search}%`),
          ilike(employeesTable.username, `%${search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      const employees = await query.where(and(...conditions)).orderBy(employeesTable.fullName);
      res.json(employees);
    } else {
      const employees = await query.orderBy(employeesTable.fullName);
      res.json(employees);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [employee] = await db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, id));

    if (!employee) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, phone, address, role, departmentId, shiftId, branchId, jobTitle, salary } = req.body;
    if (!username || !password || !fullName) {
      res.status(400).json({ message: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
      return;
    }

    const passwordHash = hashPassword(password);
    const [employee] = await db
      .insert(employeesTable)
      .values({
        username,
        passwordHash,
        fullName,
        email,
        phone,
        address,
        role: role || "employee",
        departmentId: departmentId || null,
        shiftId: shiftId || null,
        branchId: branchId || null,
        jobTitle,
        salary: salary || null,
      })
      .returning({ id: employeesTable.id });

    const [created] = await db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, employee.id));

    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      return;
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fullName, email, phone, address, role, departmentId, shiftId, branchId, jobTitle, salary, isActive, password } = req.body;

    const updateData: any = {
      fullName,
      email,
      phone,
      address,
      role,
      departmentId: departmentId || null,
      shiftId: shiftId || null,
      branchId: branchId || null,
      jobTitle,
      salary: salary || null,
      isActive,
    };
    if (password) {
      updateData.passwordHash = hashPassword(password);
    }

    await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, id));

    const [updated] = await db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, id));

    if (!updated) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.session.userId) {
      res.status(400).json({ message: "لا يمكن حذف حسابك الخاص" });
      return;
    }
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/toggle-status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ isActive: employeesTable.isActive }).from(employeesTable).where(eq(employeesTable.id, id));
    if (!current) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    await db.update(employeesTable).set({ isActive: !current.isActive }).where(eq(employeesTable.id, id));

    const [updated] = await db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, id));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
