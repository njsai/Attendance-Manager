import { Router } from "express";
import { db } from "@workspace/db";
import {
  attendanceTable,
  employeesTable,
  departmentsTable,
  leavesTable,
} from "@workspace/db";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const today = new Date().toISOString().split("T")[0];

    const [totalResult] = await db.select({ count: count() }).from(employeesTable)
      .where(and(eq(employeesTable.isActive, true), eq(employeesTable.companyId, companyId)));
    const totalEmployees = totalResult?.count ?? 0;

    const todayRecords = await db
      .select({ status: attendanceTable.status })
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(and(eq(attendanceTable.date, today), eq(employeesTable.companyId, companyId)));

    const presentToday = todayRecords.filter((r) => r.status === "present" || r.status === "late").length;
    const lateToday = todayRecords.filter((r) => r.status === "late").length;
    const onLeaveToday = todayRecords.filter((r) => r.status === "on_leave").length;
    const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);

    const [pendingResult] = await db
      .select({ count: count() })
      .from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .where(and(eq(leavesTable.status, "pending"), eq(employeesTable.companyId, companyId)));
    const pendingLeaves = pendingResult?.count ?? 0;

    const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
      pendingLeaves,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/daily", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const records = await db
      .select({
        id: attendanceTable.id,
        employeeId: attendanceTable.employeeId,
        date: attendanceTable.date,
        checkInTime: attendanceTable.checkInTime,
        checkOutTime: attendanceTable.checkOutTime,
        workingHours: attendanceTable.workingHours,
        breakHours: attendanceTable.breakHours,
        lateMinutes: attendanceTable.lateMinutes,
        overtimeMinutes: attendanceTable.overtimeMinutes,
        status: attendanceTable.status,
        notes: attendanceTable.notes,
        createdAt: attendanceTable.createdAt,
        employeeName: employeesTable.fullName,
        departmentName: departmentsTable.name,
      })
      .from(attendanceTable)
      .leftJoin(employeesTable, and(eq(attendanceTable.employeeId, employeesTable.id), eq(employeesTable.companyId, companyId)))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(eq(attendanceTable.date, date), eq(employeesTable.companyId, companyId)));

    const summary = {
      present: records.filter((r) => r.status === "present").length,
      absent: records.filter((r) => r.status === "absent").length,
      late: records.filter((r) => r.status === "late").length,
      onLeave: records.filter((r) => r.status === "on_leave").length,
    };

    res.json({ date, records, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/monthly", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const month = parseInt((req.query.month as string) || String(new Date().getMonth() + 1));
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));
    const employeeIdFilter = req.query.employeeId ? parseInt(req.query.employeeId as string) : null;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    const employees = await db
      .select({
        id: employeesTable.id,
        fullName: employeesTable.fullName,
        departmentName: departmentsTable.name,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(eq(employeesTable.isActive, true), eq(employeesTable.companyId, companyId)));

    const empIds = employees.map(e => e.id);
    const records = empIds.length > 0 ? await db
      .select({
        employeeId: attendanceTable.employeeId,
        status: attendanceTable.status,
        workingHours: attendanceTable.workingHours,
        overtimeMinutes: attendanceTable.overtimeMinutes,
        lateMinutes: attendanceTable.lateMinutes,
      })
      .from(attendanceTable)
      .where(and(gte(attendanceTable.date, startDate), lte(attendanceTable.date, endDate))) : [];

    const totalWorkDays = endDay;

    const result = employees
      .filter((e) => !employeeIdFilter || e.id === employeeIdFilter)
      .map((emp) => {
        const empRecords = records.filter((r) => r.employeeId === emp.id);
        const presentDays = empRecords.filter((r) => r.status === "present").length;
        const lateDays = empRecords.filter((r) => r.status === "late").length;
        const absentDays = empRecords.filter((r) => r.status === "absent").length;
        const onLeaveDays = empRecords.filter((r) => r.status === "on_leave").length;
        const totalWorkingHours = empRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
        const totalOvertimeMinutes = empRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);
        const totalLateMinutes = empRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);

        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          departmentName: emp.departmentName,
          totalWorkDays,
          presentDays: presentDays + lateDays,
          absentDays,
          lateDays,
          onLeaveDays,
          totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
          totalOvertimeMinutes,
          totalLateMinutes,
        };
      });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
