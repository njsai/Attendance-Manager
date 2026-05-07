import { Router } from "express";
import { db } from "@workspace/db";
import { leavesTable, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

const leaveSelect = {
  id: leavesTable.id,
  employeeId: leavesTable.employeeId,
  leaveType: leavesTable.leaveType,
  startDate: leavesTable.startDate,
  endDate: leavesTable.endDate,
  reason: leavesTable.reason,
  status: leavesTable.status,
  rejectionReason: leavesTable.rejectionReason,
  totalDays: leavesTable.totalDays,
  createdAt: leavesTable.createdAt,
  employeeName: employeesTable.fullName,
  departmentName: departmentsTable.name,
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const conditions: any[] = [eq(employeesTable.companyId, companyId)];

    if (req.session.role === "employee") {
      conditions.push(eq(leavesTable.employeeId, req.session.userId!));
    } else if (req.query.employeeId) {
      conditions.push(eq(leavesTable.employeeId, parseInt(req.query.employeeId as string)));
    }
    if (req.query.status) {
      conditions.push(eq(leavesTable.status, req.query.status as string));
    }

    const leaves = await db.select(leaveSelect).from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(...conditions)).orderBy(desc(leavesTable.createdAt));
    res.json(leaves);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, totalDays } = req.body;
    if (!startDate || !endDate) { res.status(400).json({ message: "تواريخ الإجازة مطلوبة" }); return; }
    const [leave] = await db.insert(leavesTable).values({
      employeeId: req.session.userId!,
      leaveType: leaveType || "annual",
      startDate, endDate, reason, totalDays: totalDays || 1, status: "pending",
    }).returning();
    const [full] = await db.select(leaveSelect).from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(leavesTable.id, leave.id));
    res.status(201).json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.put("/:id/approve", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.update(leavesTable).set({ status: "approved" }).where(eq(leavesTable.id, id));
    const [full] = await db.select(leaveSelect).from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(leavesTable.id, id));
    res.json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.put("/:id/reject", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { reason } = req.body;
    await db.update(leavesTable).set({ status: "rejected", rejectionReason: reason }).where(eq(leavesTable.id, id));
    const [full] = await db.select(leaveSelect).from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(leavesTable.id, id));
    res.json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [leave] = await db.select({ employeeId: leavesTable.employeeId, status: leavesTable.status })
      .from(leavesTable).where(eq(leavesTable.id, id));
    if (!leave) { res.status(404).json({ message: "Not found" }); return; }
    if (req.session.role === "employee" && (leave.employeeId !== req.session.userId || leave.status !== "pending")) {
      res.status(403).json({ message: "لا يمكنك حذف هذه الإجازة" }); return;
    }
    await db.delete(leavesTable).where(eq(leavesTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
