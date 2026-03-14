import { Router } from "express";
import { db } from "@workspace/db";
import { leavesTable, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
    const { employeeId, status } = req.query;
    const conditions: any[] = [];

    if (req.session.role === "employee") {
      conditions.push(eq(leavesTable.employeeId, req.session.userId!));
    } else if (employeeId) {
      conditions.push(eq(leavesTable.employeeId, parseInt(employeeId as string)));
    }

    if (status) conditions.push(eq(leavesTable.status, status as string));

    const query = db
      .select(leaveSelect)
      .from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id));

    let leaves;
    if (conditions.length > 0) {
      leaves = await query.where(and(...conditions)).orderBy(leavesTable.createdAt);
    } else {
      leaves = await query.orderBy(leavesTable.createdAt);
    }

    res.json(leaves.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate) {
      res.status(400).json({ message: "Required fields missing" });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

    const [leave] = await db
      .insert(leavesTable)
      .values({
        employeeId: req.session.userId!,
        leaveType,
        startDate,
        endDate,
        reason,
        totalDays,
        status: "pending",
      })
      .returning({ id: leavesTable.id });

    const [full] = await db
      .select(leaveSelect)
      .from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(leavesTable.id, leave.id));

    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/approve", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(leavesTable).set({ status: "approved" }).where(eq(leavesTable.id, id));

    const [full] = await db
      .select(leaveSelect)
      .from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(leavesTable.id, id));

    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/reject", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    await db.update(leavesTable).set({ status: "rejected", rejectionReason: reason }).where(eq(leavesTable.id, id));

    const [full] = await db
      .select(leaveSelect)
      .from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(leavesTable.id, id));

    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
