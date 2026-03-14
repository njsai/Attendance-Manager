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
  const a =
    Math.sin(dLat / 2) ** 2 +
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
    const { employeeId, date, startDate, endDate, departmentId } = req.query;
    const conditions: any[] = [];

    // Non-admin can only see their own records
    if (req.session.role === "employee") {
      conditions.push(eq(attendanceTable.employeeId, req.session.userId!));
    } else if (employeeId) {
      conditions.push(eq(attendanceTable.employeeId, parseInt(employeeId as string)));
    }

    if (date) conditions.push(eq(attendanceTable.date, date as string));
    if (startDate) conditions.push(gte(attendanceTable.date, startDate as string));
    if (endDate) conditions.push(lte(attendanceTable.date, endDate as string));

    let query = db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id));

    let records;
    if (conditions.length > 0) {
      records = await query.where(and(...conditions)).orderBy(desc(attendanceTable.date));
    } else {
      records = await query.orderBy(desc(attendanceTable.date));
    }

    if (departmentId) {
      const deptId = parseInt(departmentId as string);
      records = records.filter((r) => {
        const emp = r as any;
        return emp.departmentId === deptId;
      });
    }

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/today", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));

    res.json(record || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/check-in", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, notes } = req.body;
    const today = new Date().toISOString().split("T")[0];

    // Check if already checked in today
    const [existing] = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));

    if (existing) {
      res.status(400).json({ message: "لقد سجلت حضورك اليوم مسبقاً" });
      return;
    }

    // Check location if provided
    if (latitude && longitude) {
      const [location] = await db.select().from(companyLocationTable).limit(1);
      if (location) {
        const dist = calculateDistance(latitude, longitude, location.latitude, location.longitude);
        if (dist > location.radiusMeters) {
          res.status(400).json({
            message: `أنت خارج نطاق الشركة (المسافة: ${Math.round(dist)} متر، المسموح: ${location.radiusMeters} متر)`,
          });
          return;
        }
      }
    }

    // Get employee shift to calculate late minutes
    const [emp] = await db
      .select({ shiftId: employeesTable.shiftId })
      .from(employeesTable)
      .where(eq(employeesTable.id, req.session.userId!));

    let lateMinutes = 0;
    let status = "present";
    const now = new Date();

    if (emp?.shiftId) {
      const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, emp.shiftId));
      if (shift) {
        const shiftStart = parseTime(shift.startTime, now);
        const diffMs = now.getTime() - shiftStart.getTime() - shift.lateGraceMinutes * 60000;
        if (diffMs > 0) {
          lateMinutes = Math.floor(diffMs / 60000);
          status = "late";
        }
      }
    }

    const [record] = await db
      .insert(attendanceTable)
      .values({
        employeeId: req.session.userId!,
        date: today,
        checkInTime: now,
        checkInLat: latitude || null,
        checkInLng: longitude || null,
        lateMinutes,
        status,
        notes,
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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/check-out", requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));

    if (!record) {
      res.status(400).json({ message: "لم تسجل حضورك اليوم بعد" });
      return;
    }

    if (record.checkOutTime) {
      res.status(400).json({ message: "لقد سجلت انصرافك مسبقاً" });
      return;
    }

    // Calculate working hours
    let workingHours = 0;
    if (record.checkInTime) {
      const diffMs = now.getTime() - record.checkInTime.getTime();
      workingHours = diffMs / 3600000;
    }

    // Calculate overtime
    let overtimeMinutes = 0;
    const [emp] = await db.select({ shiftId: employeesTable.shiftId }).from(employeesTable).where(eq(employeesTable.id, req.session.userId!));
    if (emp?.shiftId) {
      const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, emp.shiftId));
      if (shift) {
        const shiftEnd = parseTime(shift.endTime, now);
        const diffMs = now.getTime() - shiftEnd.getTime();
        if (diffMs > 0) {
          overtimeMinutes = Math.floor(diffMs / 60000);
        }
      }
    }

    await db
      .update(attendanceTable)
      .set({
        checkOutTime: now,
        checkOutLat: latitude || null,
        checkOutLng: longitude || null,
        workingHours,
        overtimeMinutes,
      })
      .where(eq(attendanceTable.id, record.id));

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, record.id));

    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/break-start", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));

    if (!record || !record.checkInTime) {
      res.status(400).json({ message: "يجب تسجيل الحضور أولاً" });
      return;
    }

    await db.update(attendanceTable).set({ breakStartTime: new Date() }).where(eq(attendanceTable.id, record.id));

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, record.id));

    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/break-end", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, req.session.userId!), eq(attendanceTable.date, today)));

    if (!record || !record.breakStartTime) {
      res.status(400).json({ message: "لم تبدأ الاستراحة بعد" });
      return;
    }

    const now = new Date();
    const breakHours = (now.getTime() - record.breakStartTime.getTime()) / 3600000;

    await db
      .update(attendanceTable)
      .set({ breakEndTime: now, breakHours })
      .where(eq(attendanceTable.id, record.id));

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, record.id));

    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { checkInTime, checkOutTime, status, notes } = req.body;
    await db.update(attendanceTable).set({ checkInTime: checkInTime ? new Date(checkInTime) : undefined, checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined, status, notes }).where(eq(attendanceTable.id, id));

    const [full] = await db
      .select(recordSelect)
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(attendanceTable.id, id));

    if (!full) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
