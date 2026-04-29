import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, employeesTable, departmentsTable, shiftsTable, companyLocationTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseTime(timeStr: string, referenceDate: Date): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(referenceDate);
  d.setHours(h, m, 0, 0);
  return d;
}

const recordSelect = {
  id: attendanceTable.id,
  employeeId: attendanceTable.employeeId,
  date: attendanceTable.date,
  checkInTime: attendanceTable.checkInTime,
  checkOutTime: attendanceTable.checkOutTime,
  breakStartTime: attendanceTable.breakStartTime,
  breakEndTime: attendanceTable.breakEndTime,
  checkInLat: attendanceTable.checkInLat,
  checkInLng: attendanceTable.checkInLng,
  checkOutLat: attendanceTable.checkOutLat,
  checkOutLng: attendanceTable.checkOutLng,
  workingHours: attendanceTable.workingHours,
  breakHours: attendanceTable.breakHours,
  lateMinutes: attendanceTable.lateMinutes,
  overtimeMinutes: attendanceTable.overtimeMinutes,
  status: attendanceTable.status,
  notes: attendanceTable.notes,
  createdAt: attendanceTable.createdAt,
  employeeName: employeesTable.fullName,
  departmentName: departmentsTable.name,
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { employeeId, date, startDate, endDate } = req.query;
    const conditions: any[] = [eq(employeesTable.companyId, companyId)];

    if (req.session.role === "employee") {
      conditions.push(eq(attendanceTable.employeeId, req.session.userId!));
    } else if (employeeId) {
      conditions.push(eq(attendanceTable.employeeId, parseInt(employeeId as string)));
    }

    if (date) conditions.push(eq(attendanceTable.date, date as string));
    if (startDate) conditions.push(gte(attendanceTable.date, startDate as string));
    if (endDate) conditions.push(lte(attendanceTable.date, endDate as string));

    const records = await db.select(recordSelect).from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(...conditions)).orderBy(desc(attendanceTable.date));

    res.json(records);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.get("/today", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db.select(recordSelect).from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(
        eq(attendanceTable.employeeId, req.session.userId!),
        eq(attendanceTable.date, today),
        eq(employeesTable.companyId, companyId)
      ));
    res.json(record || null);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/check-in", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { latitude, longitude, faceVerified } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Validate location
    const [location] = await db.select().from(companyLocationTable)
      .where(eq(companyLocationTable.companyId, companyId));

    if (location && latitude && longitude) {
      const dist = calculateDistance(latitude, longitude, location.latitude, location.longitude);
      if (dist > location.radiusMeters) {
        res.status(400).json({ message: `أنت خارج النطاق المسموح به (${Math.round(dist)} م)` });
        return;
      }
    }

    const [existing] = await db.select({ id: attendanceTable.id }).from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));
    if (existing) {
      res.status(400).json({ message: "تم تسجيل الحضور مسبقاً لهذا اليوم" });
      return;
    }

    // Calculate late minutes
    const [shift] = await db.select({ startTime: shiftsTable.startTime, lateGraceMinutes: shiftsTable.lateGraceMinutes })
      .from(employeesTable)
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .where(eq(employeesTable.id, req.session.userId!));

    let lateMinutes = 0;
    if (shift?.startTime) {
      const shiftStart = parseTime(shift.startTime, now);
      const graceEnd = new Date(shiftStart.getTime() + (shift.lateGraceMinutes || 15) * 60000);
      if (now > graceEnd) lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
    }

    const [record] = await db.insert(attendanceTable).values({
      employeeId: req.session.userId!,
      date: today,
      checkInTime: now,
      checkInLat: latitude || null,
      checkInLng: longitude || null,
      lateMinutes,
      status: lateMinutes > 0 ? "late" : "present",
    }).returning();

    const [full] = await db.select(recordSelect).from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, record.id));
    res.status(201).json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/check-out", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const [record] = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));
    if (!record) { res.status(404).json({ message: "لم يتم تسجيل حضور لهذا اليوم" }); return; }
    if (record.checkOutTime) { res.status(400).json({ message: "تم تسجيل الانصراف مسبقاً" }); return; }

    const checkIn = new Date(record.checkInTime!);
    let breakMs = 0;
    if (record.breakStartTime && record.breakEndTime) {
      breakMs = new Date(record.breakEndTime).getTime() - new Date(record.breakStartTime).getTime();
    }
    const totalMs = now.getTime() - checkIn.getTime() - breakMs;
    const workingHours = Math.max(0, totalMs / 3600000);
    const breakHours = breakMs / 3600000;

    const [updated] = await db.update(attendanceTable).set({
      checkOutTime: now,
      checkOutLat: latitude || null,
      checkOutLng: longitude || null,
      workingHours: Math.round(workingHours * 100) / 100,
      breakHours: Math.round(breakHours * 100) / 100,
      status: record.lateMinutes! > 0 ? "late" : "present",
    }).where(eq(attendanceTable.id, record.id)).returning();

    const [full] = await db.select(recordSelect).from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, updated.id));
    res.json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/break-start", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));
    if (!record || record.checkOutTime) { res.status(400).json({ message: "لا يوجد حضور نشط" }); return; }
    if (record.breakStartTime) { res.status(400).json({ message: "الاستراحة بدأت مسبقاً" }); return; }
    await db.update(attendanceTable).set({ breakStartTime: new Date() }).where(eq(attendanceTable.id, record.id));
    res.json({ message: "بدأت الاستراحة" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/break-end", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));
    if (!record || !record.breakStartTime || record.breakEndTime) {
      res.status(400).json({ message: "لا توجد استراحة نشطة" });
      return;
    }
    await db.update(attendanceTable).set({ breakEndTime: new Date() }).where(eq(attendanceTable.id, record.id));
    res.json({ message: "انتهت الاستراحة" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.get("/my-stats", requireAuth, async (req, res) => {
  try {
    const employeeId = req.session.userId!;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    const records = await db.select().from(attendanceTable)
      .where(and(
        eq(attendanceTable.employeeId, employeeId),
        gte(attendanceTable.date, startDate),
        lte(attendanceTable.date, endDate)
      )).orderBy(desc(attendanceTable.date));

    const presentDays = records.filter(r => r.status === "present").length;
    const lateDays = records.filter(r => r.status === "late").length;
    const absentDays = records.filter(r => r.status === "absent").length;
    const totalWorkingHours = records.reduce((s, r) => s + (r.workingHours || 0), 0);
    const totalLateMinutes = records.reduce((s, r) => s + (r.lateMinutes || 0), 0);

    res.json({
      presentDays,
      lateDays,
      absentDays,
      totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
      totalLateMinutes,
      recentRecords: records.slice(0, 10).map(r => ({
        id: r.id,
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        workingHours: r.workingHours,
        lateMinutes: r.lateMinutes,
        status: r.status,
      })),
      month: `${year}-${String(month).padStart(2, "0")}`,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.get("/all-today", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const today = new Date().toISOString().split("T")[0];
    const records = await db.select({
      ...recordSelect,
      branchId: employeesTable.branchId,
    }).from(attendanceTable)
      .leftJoin(employeesTable, and(eq(attendanceTable.employeeId, employeesTable.id), eq(employeesTable.companyId, companyId)))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.date, today))
      .orderBy(desc(attendanceTable.checkInTime));
    res.json(records);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
