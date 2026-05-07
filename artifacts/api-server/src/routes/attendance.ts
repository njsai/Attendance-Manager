import { Router } from "express";
import { db } from "@workspace/db";
import {
  attendanceTable, employeesTable, departmentsTable,
  shiftsTable, companyLocationTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, requireCompanyAuth } from "../lib/auth.js";

const router = Router();

// ─── Utilities ────────────────────────────────────────────────────────────────
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseTime(timeStr: string, referenceDate: Date): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(referenceDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Validates YYYY-MM-DD */
function isValidDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

/** Validates ISO datetime or HH:MM */
function isValidDatetime(s: unknown): boolean {
  if (typeof s !== "string") return false;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return !isNaN(Date.parse(s));
  if (/^\d{2}:\d{2}$/.test(s)) return true;
  return !isNaN(Date.parse(s));
}

/** Convert HH:MM or ISO to full Date on given date */
function toDatetime(val: string, dateStr: string): Date {
  if (/^\d{2}:\d{2}$/.test(val)) {
    const [h, m] = val.split(":").map(Number);
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d;
  }
  return new Date(val);
}

const VALID_STATUSES = ["present", "late", "absent", "on_leave", "half_day"] as const;

/** Full record select (joins employee + department) */
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

/**
 * Verify that an attendance record belongs to the requesting company.
 * Returns the raw attendance row or null.
 */
async function getOwnedRecord(recordId: number, companyId: number) {
  const [row] = await db
    .select({
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
    })
    .from(attendanceTable)
    .innerJoin(
      employeesTable,
      and(
        eq(attendanceTable.employeeId, employeesTable.id),
        eq(employeesTable.companyId, companyId),
      ),
    )
    .where(eq(attendanceTable.id, recordId));
  return row ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ADMIN CRUD ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/attendance
 * Fetch all records for a company.  Admins see all; employees see only their own.
 * Query: employeeId, date, startDate, endDate
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { employeeId, date, startDate, endDate } = req.query;

    const conditions: ReturnType<typeof eq>[] = [
      eq(employeesTable.companyId, companyId) as any,
    ];

    if (req.session.role === "employee") {
      conditions.push(eq(attendanceTable.employeeId, req.session.userId!) as any);
    } else if (employeeId) {
      const eid = parseInt(employeeId as string);
      if (isNaN(eid) || eid <= 0) {
        res.status(400).json({ message: "employeeId غير صالح" });
        return;
      }
      conditions.push(eq(attendanceTable.employeeId, eid) as any);
    }

    if (date) {
      if (!isValidDate(date)) {
        res.status(400).json({ message: "تنسيق التاريخ غير صالح — استخدم YYYY-MM-DD" });
        return;
      }
      conditions.push(eq(attendanceTable.date, date as string) as any);
    }
    if (startDate) {
      if (!isValidDate(startDate)) {
        res.status(400).json({ message: "تنسيق startDate غير صالح" });
        return;
      }
      conditions.push(gte(attendanceTable.date, startDate as string) as any);
    }
    if (endDate) {
      if (!isValidDate(endDate)) {
        res.status(400).json({ message: "تنسيق endDate غير صالح" });
        return;
      }
      conditions.push(lte(attendanceTable.date, endDate as string) as any);
    }

    const records = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceTable.date), desc(attendanceTable.checkInTime));

    res.json(records);
  } catch (err) {
    console.error("GET /attendance:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * POST /api/attendance   (Admin / Manager only)
 * Create an attendance record manually.
 *
 * Required body: { employeeId, date, checkIn }
 * Optional:      { checkOut, status, lateMinutes, notes, checkInLat, checkInLng }
 */
router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const body = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    const errors: string[] = [];

    if (body.employeeId === undefined || body.employeeId === null || body.employeeId === "") {
      errors.push("employeeId مطلوب");
    } else {
      const eid = parseInt(body.employeeId);
      if (isNaN(eid) || eid <= 0) errors.push("employeeId يجب أن يكون رقماً موجباً");
    }

    if (!body.date) {
      errors.push("date مطلوب (YYYY-MM-DD)");
    } else if (!isValidDate(body.date)) {
      errors.push("تنسيق date غير صالح — استخدم YYYY-MM-DD");
    }

    if (!body.checkIn) {
      errors.push("checkIn مطلوب (وقت تسجيل الدخول)");
    } else if (!isValidDatetime(body.checkIn)) {
      errors.push("تنسيق checkIn غير صالح");
    }

    if (errors.length > 0) {
      res.status(400).json({ message: "بيانات غير مكتملة أو غير صالحة", errors });
      return;
    }

    const employeeId = parseInt(body.employeeId);
    const dateStr: string = body.date;

    // ── Validate employee belongs to this company ─────────────────────────────
    const [emp] = await db
      .select({ id: employeesTable.id, companyId: employeesTable.companyId })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId)));

    if (!emp) {
      res.status(404).json({ message: "الموظف غير موجود في هذه الشركة" });
      return;
    }

    // ── Prevent duplicate record for same employee+date ───────────────────────
    const [existing] = await db
      .select({ id: attendanceTable.id })
      .from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, dateStr)));

    if (existing) {
      res.status(409).json({
        message: `يوجد سجل حضور مسبق لهذا الموظف في تاريخ ${dateStr} (ID: ${existing.id})`,
        existingId: existing.id,
      });
      return;
    }

    // ── Optional fields ───────────────────────────────────────────────────────
    const checkInTime = toDatetime(body.checkIn, dateStr);
    let checkOutTime: Date | null = null;
    let workingHours: number | null = null;
    let breakHours: number | null = null;

    if (body.checkOut) {
      if (!isValidDatetime(body.checkOut)) {
        res.status(400).json({ message: "تنسيق checkOut غير صالح" });
        return;
      }
      checkOutTime = toDatetime(body.checkOut, dateStr);
      if (checkOutTime <= checkInTime) {
        res.status(400).json({ message: "وقت الخروج يجب أن يكون بعد وقت الدخول" });
        return;
      }
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      workingHours = Math.round((diffMs / 3600000) * 100) / 100;
      breakHours = 0;
    }

    const lateMinutes =
      body.lateMinutes !== undefined ? Math.max(0, parseInt(body.lateMinutes) || 0) : 0;

    const overtimeMinutes =
      body.overtimeMinutes !== undefined ? Math.max(0, parseInt(body.overtimeMinutes) || 0) : 0;

    let status: string = body.status || (lateMinutes > 0 ? "late" : checkInTime ? "present" : "absent");
    if (!VALID_STATUSES.includes(status as any)) {
      res.status(400).json({
        message: `الحالة "${status}" غير صالحة`,
        validValues: VALID_STATUSES,
      });
      return;
    }

    const checkInLat =
      body.checkInLat !== undefined ? parseFloat(body.checkInLat) || null : null;
    const checkInLng =
      body.checkInLng !== undefined ? parseFloat(body.checkInLng) || null : null;

    // ── Insert ────────────────────────────────────────────────────────────────
    const [inserted] = await db
      .insert(attendanceTable)
      .values({
        employeeId,
        date: dateStr,
        checkInTime,
        checkOutTime,
        checkInLat,
        checkInLng,
        workingHours,
        breakHours,
        lateMinutes,
        overtimeMinutes,
        status,
        notes: body.notes?.trim() || null,
      })
      .returning();

    // Return full record with employee info
    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, inserted.id));

    res.status(201).json(full);
  } catch (err: any) {
    console.error("POST /attendance:", err);
    if (err?.code === "23503") {
      res.status(400).json({ message: "الموظف غير موجود" });
      return;
    }
    if (err?.code === "23505") {
      res.status(409).json({ message: "يوجد سجل مكرر لهذا الموظف في نفس التاريخ" });
      return;
    }
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * PUT /api/attendance/:id   (Admin / Manager only)
 * Update an existing attendance record.
 * Only updates fields provided in the body; others remain unchanged.
 */
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);

    if (isNaN(id) || id <= 0) {
      res.status(400).json({ message: "معرّف السجل غير صالح" });
      return;
    }

    // ── Verify record exists and belongs to company ───────────────────────────
    const existing = await getOwnedRecord(id, companyId);
    if (!existing) {
      res.status(404).json({ message: "السجل غير موجود" });
      return;
    }

    const body = req.body;
    const errors: string[] = [];
    const updates: Partial<typeof attendanceTable.$inferInsert> = {};

    // ── Validate and apply fields ─────────────────────────────────────────────
    if (body.date !== undefined) {
      if (!isValidDate(body.date)) {
        errors.push("تنسيق date غير صالح — استخدم YYYY-MM-DD");
      } else {
        (updates as any).date = body.date;
      }
    }

    if (body.checkIn !== undefined) {
      if (body.checkIn === null || body.checkIn === "") {
        errors.push("لا يمكن حذف وقت الدخول — استخدم DELETE لحذف السجل كاملاً");
      } else if (!isValidDatetime(body.checkIn)) {
        errors.push("تنسيق checkIn غير صالح");
      } else {
        updates.checkInTime = toDatetime(body.checkIn, (updates as any).date || existing.date);
      }
    }

    if (body.checkOut !== undefined) {
      if (body.checkOut === null || body.checkOut === "") {
        updates.checkOutTime = null as any;
      } else if (!isValidDatetime(body.checkOut)) {
        errors.push("تنسيق checkOut غير صالح");
      } else {
        updates.checkOutTime = toDatetime(body.checkOut, (updates as any).date || existing.date);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ message: "بيانات غير صالحة", errors });
      return;
    }

    // Track whether times were explicitly provided in the request
    const timesExplicitlyChanged = body.checkIn !== undefined || body.checkOut !== undefined;

    // Validate checkout is after checkin (only when times are changing)
    if (timesExplicitlyChanged) {
      const finalCheckIn = updates.checkInTime ?? existing.checkInTime;
      const finalCheckOut = updates.checkOutTime !== undefined ? updates.checkOutTime : existing.checkOutTime;
      if (finalCheckIn && finalCheckOut && new Date(finalCheckOut) <= new Date(finalCheckIn!)) {
        res.status(400).json({ message: "وقت الخروج يجب أن يكون بعد وقت الدخول" });
        return;
      }
      // Re-calculate working hours only when times explicitly changed
      if (finalCheckIn && finalCheckOut) {
        const diffMs = new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime();
        updates.workingHours = Math.round((Math.max(0, diffMs) / 3600000) * 100) / 100;
      }
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        res.status(400).json({ message: `الحالة "${body.status}" غير صالحة`, validValues: VALID_STATUSES });
        return;
      }
      updates.status = body.status;
    }

    if (body.lateMinutes !== undefined) {
      const v = parseInt(body.lateMinutes);
      if (isNaN(v) || v < 0) {
        res.status(400).json({ message: "lateMinutes يجب أن يكون رقماً غير سالب" });
        return;
      }
      updates.lateMinutes = v;
    }

    if (body.overtimeMinutes !== undefined) {
      const v = parseInt(body.overtimeMinutes);
      if (isNaN(v) || v < 0) {
        res.status(400).json({ message: "overtimeMinutes يجب أن يكون رقماً غير سالب" });
        return;
      }
      updates.overtimeMinutes = v;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes?.trim() || null;
    }

    if (body.checkInLat !== undefined) {
      updates.checkInLat = body.checkInLat === null ? null : parseFloat(body.checkInLat) || null;
    }
    if (body.checkInLng !== undefined) {
      updates.checkInLng = body.checkInLng === null ? null : parseFloat(body.checkInLng) || null;
    }

    // Nothing to update?
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: "لا توجد حقول لتحديثها" });
      return;
    }

    // ── Apply update ──────────────────────────────────────────────────────────
    const [updated] = await db
      .update(attendanceTable)
      .set(updates)
      .where(eq(attendanceTable.id, id))
      .returning();

    if (!updated) {
      res.status(500).json({ message: "فشل تحديث السجل" });
      return;
    }

    // Return full record with employee info
    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, updated.id));

    res.json(full);
  } catch (err) {
    console.error("PUT /attendance/:id:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * DELETE /api/attendance/:id   (Admin only)
 * Delete a specific attendance record.
 * 404 if not found. 403 if record belongs to another company.
 */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);

    if (isNaN(id) || id <= 0) {
      res.status(400).json({ message: "معرّف السجل غير صالح" });
      return;
    }

    // ── Verify ownership ──────────────────────────────────────────────────────
    const record = await getOwnedRecord(id, companyId);
    if (!record) {
      res.status(404).json({ message: "السجل غير موجود" });
      return;
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    const [deleted] = await db
      .delete(attendanceTable)
      .where(eq(attendanceTable.id, id))
      .returning({ id: attendanceTable.id });

    if (!deleted) {
      res.status(500).json({ message: "فشل حذف السجل" });
      return;
    }

    res.json({
      message: "تم حذف سجل الحضور بنجاح",
      deletedId: deleted.id,
    });
  } catch (err) {
    console.error("DELETE /attendance/:id:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EMPLOYEE SELF-SERVICE ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/attendance/today
 * Current employee's attendance record for today.
 */
router.get("/today", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const today = new Date().toISOString().split("T")[0];

    const [record] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(
        and(
          eq(attendanceTable.employeeId, req.session.userId!),
          eq(attendanceTable.date, today),
          eq(employeesTable.companyId, companyId),
        ),
      );

    res.json(record ?? null);
  } catch (err) {
    console.error("GET /attendance/today:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * POST /api/attendance/check-in
 * Employee clocks in for today.
 */
router.post("/check-in", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { latitude, longitude, faceVerified } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Location validation: check company's attendance_location_mode
    const locationModeResult = await db.execute(
      sql`SELECT attendance_location_mode FROM companies WHERE id = ${companyId}`
    );
    const locationMode = (locationModeResult.rows[0] as any)?.attendance_location_mode ?? "disabled";

    if (locationMode === "enabled") {
      if (latitude == null || longitude == null) {
        res.status(400).json({ message: "يجب تفعيل الموقع الجغرافي لتسجيل الحضور. تحقق من أذونات الموقع في المتصفح." });
        return;
      }
      // Get employee's branch GPS
      const empBranchResult = await db.execute(
        sql`SELECT b.latitude, b.longitude, b.radius_meters, b.name
            FROM employees e
            LEFT JOIN branches b ON e.branch_id = b.id
            WHERE e.id = ${req.session.userId!}`
      );
      const branch = empBranchResult.rows[0] as any;
      if (branch && branch.latitude != null && branch.longitude != null) {
        const dist = calculateDistance(
          Number(latitude), Number(longitude),
          Number(branch.latitude), Number(branch.longitude),
        );
        const radius = Number(branch.radius_meters ?? 200);
        if (dist > radius) {
          res.status(400).json({
            message: `أنت خارج نطاق فرع "${branch.name}" (${Math.round(dist)} م — المسموح ${radius} م)`,
            distanceMeters: Math.round(dist),
            radiusMeters: radius,
          });
          return;
        }
      }
    }

    // Duplicate check
    const [existing] = await db
      .select({ id: attendanceTable.id })
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, req.session.userId!),
          eq(attendanceTable.date, today),
        ),
      );

    if (existing) {
      res.status(409).json({ message: "تم تسجيل الحضور مسبقاً لهذا اليوم" });
      return;
    }

    // Calculate late minutes
    const [shift] = await db
      .select({ startTime: shiftsTable.startTime, lateGraceMinutes: shiftsTable.lateGraceMinutes })
      .from(employeesTable)
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .where(eq(employeesTable.id, req.session.userId!));

    let lateMinutes = 0;
    if (shift?.startTime) {
      const shiftStart = parseTime(shift.startTime, now);
      const graceEnd = new Date(shiftStart.getTime() + (shift.lateGraceMinutes || 15) * 60000);
      if (now > graceEnd) {
        lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
      }
    }

    const [record] = await db
      .insert(attendanceTable)
      .values({
        employeeId: req.session.userId!,
        date: today,
        checkInTime: now,
        checkInLat: latitude != null ? Number(latitude) : null,
        checkInLng: longitude != null ? Number(longitude) : null,
        lateMinutes,
        status: lateMinutes > 0 ? "late" : "present",
      })
      .returning();

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, record.id));

    res.status(201).json(full);
  } catch (err) {
    console.error("POST /attendance/check-in:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * POST /api/attendance/check-out
 */
router.post("/check-out", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, req.session.userId!),
          eq(attendanceTable.date, today),
        ),
      );

    if (!record) {
      res.status(404).json({ message: "لم يتم تسجيل حضور لهذا اليوم" });
      return;
    }
    if (record.checkOutTime) {
      res.status(409).json({ message: "تم تسجيل الانصراف مسبقاً" });
      return;
    }

    const checkIn = new Date(record.checkInTime!);
    let breakMs = 0;
    if (record.breakStartTime && record.breakEndTime) {
      breakMs = new Date(record.breakEndTime).getTime() - new Date(record.breakStartTime).getTime();
    }
    const totalMs = now.getTime() - checkIn.getTime() - breakMs;
    const workingHours = Math.max(0, totalMs / 3600000);
    const breakHours = breakMs / 3600000;

    const [updated] = await db
      .update(attendanceTable)
      .set({
        checkOutTime: now,
        checkOutLat: latitude != null ? Number(latitude) : null,
        checkOutLng: longitude != null ? Number(longitude) : null,
        workingHours: Math.round(workingHours * 100) / 100,
        breakHours: Math.round(breakHours * 100) / 100,
        status: (record.lateMinutes ?? 0) > 0 ? "late" : "present",
      })
      .where(eq(attendanceTable.id, record.id))
      .returning();

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, updated.id));

    res.json(full);
  } catch (err) {
    console.error("POST /attendance/check-out:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * POST /api/attendance/break-start
 */
router.post("/break-start", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, req.session.userId!),
          eq(attendanceTable.date, today),
        ),
      );

    if (!record) {
      res.status(404).json({ message: "لا يوجد سجل حضور لهذا اليوم" });
      return;
    }
    if (record.checkOutTime) {
      res.status(409).json({ message: "تم تسجيل الانصراف مسبقاً" });
      return;
    }
    if (record.breakStartTime) {
      res.status(409).json({ message: "الاستراحة بدأت مسبقاً" });
      return;
    }

    await db
      .update(attendanceTable)
      .set({ breakStartTime: new Date() })
      .where(eq(attendanceTable.id, record.id));

    res.json({ message: "بدأت الاستراحة" });
  } catch (err) {
    console.error("POST /attendance/break-start:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * POST /api/attendance/break-end
 */
router.post("/break-end", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, req.session.userId!),
          eq(attendanceTable.date, today),
        ),
      );

    if (!record) {
      res.status(404).json({ message: "لا يوجد سجل حضور لهذا اليوم" });
      return;
    }
    if (!record.breakStartTime) {
      res.status(409).json({ message: "لم تبدأ الاستراحة بعد" });
      return;
    }
    if (record.breakEndTime) {
      res.status(409).json({ message: "الاستراحة انتهت مسبقاً" });
      return;
    }

    await db
      .update(attendanceTable)
      .set({ breakEndTime: new Date() })
      .where(eq(attendanceTable.id, record.id));

    res.json({ message: "انتهت الاستراحة" });
  } catch (err) {
    console.error("POST /attendance/break-end:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * GET /api/attendance/my-stats
 * Current month stats for logged-in employee.
 */
router.get("/my-stats", requireAuth, async (req, res) => {
  try {
    const employeeId = req.session.userId!;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    const records = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, employeeId),
          gte(attendanceTable.date, startDate),
          lte(attendanceTable.date, endDate),
        ),
      )
      .orderBy(desc(attendanceTable.date));

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
  } catch (err) {
    console.error("GET /attendance/my-stats:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * GET /api/attendance/all-today   (Admin / Manager)
 * All employees' attendance for today.
 */
router.get("/all-today", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const today = new Date().toISOString().split("T")[0];

    const records = await db
      .select({ ...recordSelect, branchId: employeesTable.branchId })
      .from(attendanceTable)
      .leftJoin(
        employeesTable,
        and(
          eq(attendanceTable.employeeId, employeesTable.id),
          eq(employeesTable.companyId, companyId),
        ),
      )
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.date, today))
      .orderBy(desc(attendanceTable.checkInTime));

    res.json(records);
  } catch (err) {
    console.error("GET /attendance/all-today:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

/**
 * GET /api/attendance/:id
 * Fetch a single attendance record by numeric ID.
 * NOTE: must be registered AFTER all named routes (/today, /my-stats, /all-today)
 * to prevent Express from matching string paths as this param.
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);

    if (isNaN(id) || id <= 0) {
      res.status(400).json({ message: "معرّف السجل غير صالح" });
      return;
    }

    const record = await getOwnedRecord(id, companyId);
    if (!record) {
      res.status(404).json({ message: "السجل غير موجود" });
      return;
    }

    if (req.session.role === "employee" && record.employeeId !== req.session.userId) {
      res.status(403).json({ message: "غير مصرح لك بمشاهدة هذا السجل" });
      return;
    }

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, id));

    res.json(full);
  } catch (err) {
    console.error("GET /attendance/:id:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
