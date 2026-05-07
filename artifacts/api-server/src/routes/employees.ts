import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, shiftsTable, branchesTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";
import { requireAuth, requireAdmin, requireCompanyAuth } from "../lib/auth.js";
import { hashPasswordBcrypt } from "../lib/security.js";

const router = Router();

const employeeSelect = {
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
  hasFace: employeesTable.faceDescriptor,
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
    const companyId = req.session.companyId!;
    const { departmentId, branchId, search, status } = req.query;
    const conditions: any[] = [eq(employeesTable.companyId, companyId)];
    if (departmentId) conditions.push(eq(employeesTable.departmentId, parseInt(departmentId as string)));
    if (branchId) conditions.push(eq(employeesTable.branchId, parseInt(branchId as string)));
    if (status === "active") conditions.push(eq(employeesTable.isActive, true));
    if (status === "inactive") conditions.push(eq(employeesTable.isActive, false));
    if (search) conditions.push(or(ilike(employeesTable.fullName, `%${search}%`), ilike(employeesTable.username, `%${search}%`))!);

    const employees = await db.select(employeeSelect).from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(and(...conditions)).orderBy(employeesTable.fullName);

    res.json(employees.map(e => ({ ...e, hasFace: !!e.hasFace })));
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const [employee] = await db.select(employeeSelect).from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    if (!employee) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ ...employee, hasFace: !!employee.hasFace });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { username, password, fullName, email, phone, address, role, departmentId, shiftId, branchId, jobTitle, salary } = req.body;
    if (!username || !password || !fullName) {
      res.status(400).json({ message: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
      return;
    }
    const passwordHash = await hashPasswordBcrypt(password);
    const [emp] = await db.insert(employeesTable).values({
      companyId, username: username.trim().toLowerCase(), passwordHash, fullName, email, phone, address,
      role: role || "employee", departmentId: departmentId || null, shiftId: shiftId || null,
      branchId: branchId || null, jobTitle, salary: salary || null,
    }).returning({ id: employeesTable.id });

    const [created] = await db.select(employeeSelect).from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, emp.id));
    res.status(201).json({ ...created, hasFace: false });
  } catch (err: any) {
    console.error(err);
    if (err.code === "23505") res.status(409).json({ message: "اسم المستخدم موجود مسبقاً" });
    else res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const { username, password, fullName, email, phone, address, role, departmentId, shiftId, branchId, jobTitle, salary, isActive } = req.body;
    const updateData: any = { fullName, email, phone, address, role, jobTitle, salary: salary || null, isActive };
    if (username) updateData.username = username.trim().toLowerCase();
    if (password) updateData.passwordHash = await hashPasswordBcrypt(password);
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (shiftId !== undefined) updateData.shiftId = shiftId || null;
    if (branchId !== undefined) updateData.branchId = branchId || null;
    await db.update(employeesTable).set(updateData).where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    const [updated] = await db.select(employeeSelect).from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, id));
    if (!updated) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ ...updated, hasFace: !!updated.hasFace });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    if (id === req.session.userId) { res.status(400).json({ message: "لا يمكن حذف حسابك الخاص" }); return; }
    await db.delete(employeesTable).where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.put("/:id/toggle-status", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const [current] = await db.select({ isActive: employeesTable.isActive }).from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    if (!current) { res.status(404).json({ message: "Not found" }); return; }
    await db.update(employeesTable).set({ isActive: !current.isActive }).where(eq(employeesTable.id, id));
    const [updated] = await db.select(employeeSelect).from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .where(eq(employeesTable.id, id));
    res.json({ ...updated, hasFace: !!updated?.hasFace });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Face descriptor CRUD ──────────────────────────────────────────────────────
router.put("/:id/face-descriptor", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const { faceDescriptor } = req.body;
    if (!faceDescriptor) { res.status(400).json({ message: "بيانات الوجه مطلوبة" }); return; }
    await db.update(employeesTable).set({ faceDescriptor: JSON.stringify(faceDescriptor) })
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    res.json({ message: "تم حفظ بصمة الوجه بنجاح" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id/face-descriptor", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    await db.update(employeesTable).set({ faceDescriptor: null })
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    res.json({ message: "تم حذف بصمة الوجه" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// All face descriptors for the company (used for face recognition clock-in)
router.get("/face-descriptors/all", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const employees = await db.select({
      id: employeesTable.id, fullName: employeesTable.fullName, faceDescriptor: employeesTable.faceDescriptor,
    }).from(employeesTable).where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.isActive, true)));
    res.json(employees.filter(e => e.faceDescriptor).map(e => ({
      id: e.id, fullName: e.fullName, faceDescriptor: JSON.parse(e.faceDescriptor!),
    })));
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// Admin changes another employee's password
router.put("/:id/change-password", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) { res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }); return; }
    const newHash = await hashPasswordBcrypt(newPassword);
    await db.update(employeesTable)
      .set({ passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null })
      .where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId)));
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
