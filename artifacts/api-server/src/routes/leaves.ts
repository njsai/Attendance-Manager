import { Router } from "express";
import { db } from "@workspace/db";
import { leavesTable, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { createNotification } from "../lib/createNotification.js";

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

// ── My leave summary (employee self) — must be before /:id routes ─────────────
router.get("/my-summary", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const now = new Date();
    const year = now.getFullYear();
    const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const monthEnd = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const { pool } = await import("@workspace/db");
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')                          AS pending_count,
         COUNT(*) FILTER (WHERE status = 'approved')                         AS approved_total,
         COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'
           AND start_date >= $2::date AND start_date <= $3::date), 0)        AS approved_days_month,
         COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'
           AND EXTRACT(YEAR FROM start_date) = $4), 0)                      AS approved_days_year
       FROM leaves WHERE employee_id = $1`,
      [userId, monthStart, monthEnd, year]
    );
    const r = rows[0] as any;
    res.json({
      pendingCount: Number(r.pending_count ?? 0),
      approvedTotal: Number(r.approved_total ?? 0),
      approvedDaysMonth: Number(r.approved_days_month ?? 0),
      approvedDaysYear: Number(r.approved_days_year ?? 0),
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

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
    if (full?.employeeId) {
      void createNotification(
        full.employeeId, req.session.companyId!,
        "leave_approved",
        "تمت الموافقة على طلب الإجازة",
        `تمت الموافقة على طلب إجازتك من ${full.startDate} إلى ${full.endDate}`,
        id, "leave"
      ).catch(err => console.warn("[Notification]", err));
    }
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
    if (full?.employeeId) {
      void createNotification(
        full.employeeId, req.session.companyId!,
        "leave_rejected",
        "تم رفض طلب الإجازة",
        reason
          ? `تم رفض طلب إجازتك. السبب: ${reason}`
          : `تم رفض طلب إجازتك من ${full.startDate} إلى ${full.endDate}`,
        id, "leave"
      ).catch(err => console.warn("[Notification]", err));
    }
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
