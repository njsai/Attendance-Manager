import { Router } from "express";
import { db } from "@workspace/db";
import {
  payrollTable, payrollLogsTable, employeesTable, departmentsTable,
  attendanceTable, companiesTable, loansTable, loanInstallmentsTable,
} from "@workspace/db";
import { eq, and, sql, desc, gte, lte, count } from "drizzle-orm";
import { requireAuth, requireAdmin, requireCompanyAuth } from "../lib/auth.js";
import { createNotification } from "../lib/createNotification.js";

// Type that covers both the main db connection and a Drizzle transaction object
type DbOrTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const router = Router();

// ─── Helper: log payroll change ───────────────────────────────────────────────
async function logPayrollChange(
  payrollId: number, companyId: number, changedBy: number,
  field: string, oldVal: any, newVal: any
) {
  if (String(oldVal) === String(newVal)) return;
  await db.insert(payrollLogsTable).values({
    payrollId, companyId, changedBy,
    fieldName: field,
    oldValue: String(oldVal ?? ""),
    newValue: String(newVal ?? ""),
  });
}

// ─── Helper: recalculate net salary ──────────────────────────────────────────
function calcNet(p: {
  basicSalary: any; incentives: any; overtimePay: any;
  deductions: any; advances: any; lateDeduction: any; absenceDeduction: any;
  leaveDeduction?: any; loanDeduction?: any;
}) {
  return (
    Number(p.basicSalary)   + Number(p.incentives)   + Number(p.overtimePay)
    - Number(p.deductions)  - Number(p.advances)
    - Number(p.lateDeduction) - Number(p.absenceDeduction)
    - Number(p.leaveDeduction ?? 0) - Number(p.loanDeduction ?? 0)
  );
}

// ─── Helper: compute leave deduction for employee in a month ─────────────────
// Deducts ALL approved leaves (any type) that overlap the target month.
// Correctly handles leaves that span month boundaries.
async function buildLeaveDeduction(employeeId: number, month: number, year: number, dailyRate: number): Promise<number> {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // For each overlapping leave, compute the number of days that fall within
  // this month using GREATEST/LEAST to clip the leave range to [monthStart, monthEnd].
  const rows = await db.execute(
    sql`SELECT
          (LEAST(end_date, ${monthEnd}::date) - GREATEST(start_date, ${monthStart}::date) + 1) AS overlap_days
        FROM leaves
        WHERE employee_id = ${employeeId}
          AND status = 'approved'
          AND start_date <= ${monthEnd}::date
          AND end_date   >= ${monthStart}::date`
  );

  let unpaidDays = 0;
  for (const r of rows.rows as any[]) {
    const days = Number(r.overlap_days ?? 0);
    if (days > 0) unpaidDays += days;
  }

  return Math.round(unpaidDays * dailyRate * 100) / 100;
}

// ─── Helper: apply loan installments for ALL active loans (within a transaction)
async function applyLoanInstallment(
  tx: DbOrTx,
  employeeId: number, companyId: number,
  month: number, year: number,
  payrollId: number
): Promise<number> {
  // Find ALL approved loans with remaining installments
  const rows = await tx.execute(
    sql`SELECT id, amount, monthly_deduction, installments_paid, installments_count
        FROM loans
        WHERE employee_id = ${employeeId}
          AND company_id = ${companyId}
          AND status = 'approved'
          AND installments_paid < installments_count
        ORDER BY created_at ASC`
  );

  if (rows.rows.length === 0) return 0;

  let totalDeduction = 0;

  for (const loan of rows.rows as any[]) {
    const paid = Number(loan.installments_paid);
    const total = Number(loan.installments_count);
    const isFinal = paid + 1 >= total;

    // Final installment: settle exact remaining balance to eliminate rounding drift
    const deductionAmount = isFinal
      ? Math.round((Number(loan.amount) - Number(loan.monthly_deduction) * paid) * 100) / 100
      : Number(loan.monthly_deduction);

    // Record the installment
    await tx.insert(loanInstallmentsTable).values({
      loanId: loan.id,
      payrollId,
      month,
      year,
      amount: deductionAmount,
    });

    // Increment installments_paid
    await tx.update(loansTable).set({
      installmentsPaid: paid + 1,
      updatedAt: new Date(),
    }).where(eq(loansTable.id, loan.id));

    totalDeduction += deductionAmount;
  }

  return Math.round(totalDeduction * 100) / 100;
}

// ─── Helper: check if error is a duplicate key violation ─────────────────────
function isDuplicateKey(err: any): boolean {
  return err?.code === "23505" || err?.cause?.code === "23505";
}

// ─── Helper: build attendance stats for employee in a month ──────────────────
async function buildAttendanceStats(employeeId: number, month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  const rows = await db.execute(
    sql`SELECT status, late_minutes, overtime_minutes FROM attendance
        WHERE employee_id = ${employeeId}
        AND date >= ${start}::date AND date <= ${end}::date`
  );

  let workDays = 0, absentDays = 0, lateMinutes = 0, overtimeMinutes = 0, leaveDays = 0;
  for (const r of rows.rows as any[]) {
    if (r.status === "present" || r.status === "late") workDays++;
    if (r.status === "absent") absentDays++;
    if (r.status === "leave") leaveDays++;
    lateMinutes += r.late_minutes ?? 0;
    overtimeMinutes += r.overtime_minutes ?? 0;
  }
  return { workDays, absentDays, lateMinutes, overtimeMinutes, leaveDays };
}

// ─── GET /my - employee views their own payroll (must be before /:id routes) ──
router.get("/my", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const rows = await db.select().from(payrollTable)
      .where(and(eq(payrollTable.companyId, companyId), eq(payrollTable.employeeId, userId)))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month));
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET / - list payroll ─────────────────────────────────────────────────────
router.get("/", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const role = req.session.role!;
    const { month, year, employeeId, status } = req.query;

    // Employees see only their own payroll
    if (role === "employee") {
      const rows = await db.select({
        id: payrollTable.id,
        month: payrollTable.month,
        year: payrollTable.year,
        basicSalary: payrollTable.basicSalary,
        incentives: payrollTable.incentives,
        overtimePay: payrollTable.overtimePay,
        deductions: payrollTable.deductions,
        advances: payrollTable.advances,
        lateDeduction: payrollTable.lateDeduction,
        absenceDeduction: payrollTable.absenceDeduction,
        leaveDeduction: payrollTable.leaveDeduction,
        loanDeduction: payrollTable.loanDeduction,
        netSalary: payrollTable.netSalary,
        currency: payrollTable.currency,
        status: payrollTable.status,
        paidAt: payrollTable.paidAt,
        workDays: payrollTable.workDays,
        absentDays: payrollTable.absentDays,
        lateMinutes: payrollTable.lateMinutes,
        overtimeMinutes: payrollTable.overtimeMinutes,
        leaveDays: payrollTable.leaveDays,
        notes: payrollTable.notes,
        createdAt: payrollTable.createdAt,
      }).from(payrollTable)
        .where(and(eq(payrollTable.companyId, companyId), eq(payrollTable.employeeId, userId)))
        .orderBy(desc(payrollTable.year), desc(payrollTable.month));
      res.json(rows);
      return;
    }

    // Build conditions for admin/manager
    const conditions: any[] = [eq(payrollTable.companyId, companyId)];
    if (month) conditions.push(eq(payrollTable.month, parseInt(month as string)));
    if (year) conditions.push(eq(payrollTable.year, parseInt(year as string)));
    if (employeeId) conditions.push(eq(payrollTable.employeeId, parseInt(employeeId as string)));
    if (status) conditions.push(eq(payrollTable.status, status as string));

    const rows = await db.select({
      id: payrollTable.id,
      employeeId: payrollTable.employeeId,
      employeeName: employeesTable.fullName,
      jobTitle: employeesTable.jobTitle,
      departmentName: departmentsTable.name,
      month: payrollTable.month,
      year: payrollTable.year,
      basicSalary: payrollTable.basicSalary,
      incentives: payrollTable.incentives,
      overtimePay: payrollTable.overtimePay,
      deductions: payrollTable.deductions,
      advances: payrollTable.advances,
      lateDeduction: payrollTable.lateDeduction,
      absenceDeduction: payrollTable.absenceDeduction,
      leaveDeduction: payrollTable.leaveDeduction,
      loanDeduction: payrollTable.loanDeduction,
      netSalary: payrollTable.netSalary,
      currency: payrollTable.currency,
      status: payrollTable.status,
      paidAt: payrollTable.paidAt,
      workDays: payrollTable.workDays,
      absentDays: payrollTable.absentDays,
      lateMinutes: payrollTable.lateMinutes,
      overtimeMinutes: payrollTable.overtimeMinutes,
      leaveDays: payrollTable.leaveDays,
      notes: payrollTable.notes,
      createdAt: payrollTable.createdAt,
      updatedAt: payrollTable.updatedAt,
    }).from(payrollTable)
      .leftJoin(employeesTable, eq(payrollTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(and(...conditions))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month), employeesTable.fullName);

    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET /stats ───────────────────────────────────────────────────────────────
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { month, year } = req.query;
    const conditions: any[] = [eq(payrollTable.companyId, companyId)];
    if (month) conditions.push(eq(payrollTable.month, parseInt(month as string)));
    if (year) conditions.push(eq(payrollTable.year, parseInt(year as string)));

    const rows = await db.select({
      status: payrollTable.status,
      netSalary: payrollTable.netSalary,
      deductions: payrollTable.deductions,
      overtimePay: payrollTable.overtimePay,
      advances: payrollTable.advances,
      lateDeduction: payrollTable.lateDeduction,
      absenceDeduction: payrollTable.absenceDeduction,
      leaveDeduction: payrollTable.leaveDeduction,
      loanDeduction: payrollTable.loanDeduction,
    }).from(payrollTable).where(and(...conditions));

    const totalNet = rows.reduce((s, r) => s + (r.netSalary ?? 0), 0);
    const totalPaid = rows.filter(r => r.status === "paid").reduce((s, r) => s + (r.netSalary ?? 0), 0);
    const totalDeductions = rows.reduce((s, r) =>
      s + (r.deductions ?? 0) + (r.lateDeduction ?? 0) + (r.absenceDeduction ?? 0)
        + (r.leaveDeduction ?? 0) + (r.loanDeduction ?? 0), 0);
    const totalOvertime = rows.reduce((s, r) => s + (r.overtimePay ?? 0), 0);
    const totalAdvances = rows.reduce((s, r) => s + (r.advances ?? 0), 0);
    const unpaidCount = rows.filter(r => r.status === "unpaid").length;
    const paidCount = rows.filter(r => r.status === "paid").length;

    res.json({ totalNet, totalPaid, totalDeductions, totalOvertime, totalAdvances, unpaidCount, paidCount, total: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET /:id/logs - audit trail ─────────────────────────────────────────────
router.get("/:id/logs", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const rows = await db.select({
      id: payrollLogsTable.id,
      fieldName: payrollLogsTable.fieldName,
      oldValue: payrollLogsTable.oldValue,
      newValue: payrollLogsTable.newValue,
      changedAt: payrollLogsTable.changedAt,
      changedByName: employeesTable.fullName,
    }).from(payrollLogsTable)
      .leftJoin(employeesTable, eq(payrollLogsTable.changedBy, employeesTable.id))
      .where(and(eq(payrollLogsTable.payrollId, id), eq(payrollLogsTable.companyId, companyId)))
      .orderBy(desc(payrollLogsTable.changedAt));
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── POST / - create single payroll ──────────────────────────────────────────
router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const {
      employeeId, month, year, basicSalary = 0, incentives = 0,
      overtimePay = 0, deductions = 0, advances = 0,
      lateDeduction = 0, absenceDeduction = 0,
      currency = "IQD", notes = "",
    } = req.body;

    if (!employeeId || !month || !year) {
      res.status(400).json({ message: "الموظف والشهر والسنة مطلوبة" });
      return;
    }

    // Get attendance stats
    const stats = await buildAttendanceStats(employeeId, month, year);

    const m = parseInt(month);
    const y = parseInt(year);
    const empId = parseInt(employeeId);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyRate = daysInMonth > 0 ? parseFloat(basicSalary) / daysInMonth : 0;

    // Auto-compute leave and loan deductions (same as /generate)
    const leaveDeduction = await buildLeaveDeduction(empId, m, y, dailyRate);

    const netBeforeLoan = calcNet({ basicSalary, incentives, overtimePay, deductions, advances, lateDeduction, absenceDeduction, leaveDeduction, loanDeduction: 0 });

    let p: any;
    await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(payrollTable).values({
        companyId, employeeId: empId,
        month: m, year: y,
        basicSalary: parseFloat(basicSalary), incentives: parseFloat(incentives),
        overtimePay: parseFloat(overtimePay), deductions: parseFloat(deductions),
        advances: parseFloat(advances), lateDeduction: parseFloat(lateDeduction),
        absenceDeduction: parseFloat(absenceDeduction),
        leaveDeduction, loanDeduction: 0,
        netSalary: netBeforeLoan, currency, notes,
        workDays: stats.workDays, absentDays: stats.absentDays,
        lateMinutes: stats.lateMinutes, overtimeMinutes: stats.overtimeMinutes,
        leaveDays: stats.leaveDays,
        createdBy: userId,
      }).returning();

      const loanDeduction = await applyLoanInstallment(tx, empId, companyId, m, y, inserted.id);

      if (loanDeduction > 0) {
        const netSalary = netBeforeLoan - loanDeduction;
        const [updated] = await tx.update(payrollTable)
          .set({ loanDeduction, netSalary })
          .where(eq(payrollTable.id, inserted.id))
          .returning();
        p = updated;
      } else {
        p = inserted;
      }
    });

    res.status(201).json(p);
  } catch (err: any) {
    if (isDuplicateKey(err)) res.status(409).json({ message: "راتب هذا الموظف لهذا الشهر موجود مسبقاً" });
    else { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
  }
});

// ─── POST /generate - bulk generate ──────────────────────────────────────────
router.post("/generate", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const { month, year } = req.body;
    if (!month || !year) { res.status(400).json({ message: "الشهر والسنة مطلوبان" }); return; }

    const m = parseInt(month);
    const y = parseInt(year);

    // Get company settings
    const [company] = await db.select({
      currency: companiesTable.currency,
      overtimeRate: companiesTable.overtimeRate,
      lateDeductionRate: companiesTable.lateDeductionRate,
      absenceDeductionRate: companiesTable.absenceDeductionRate,
    }).from(companiesTable).where(eq(companiesTable.id, companyId));

    const employees = await db.select({
      id: employeesTable.id,
      salary: employeesTable.salary,
    }).from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.isActive, true)));

    const daysInMonth = new Date(y, m, 0).getDate();
    let created = 0, skipped = 0;

    for (const emp of employees) {
      const basicSalary = emp.salary ?? 0;
      const stats = await buildAttendanceStats(emp.id, m, y);

      // Calculate deductions
      const dailyRate = daysInMonth > 0 ? basicSalary / daysInMonth : 0;
      const hourlyRate = dailyRate / 8;
      const lateDeduction = Math.round((stats.lateMinutes / 60) * hourlyRate * (company?.lateDeductionRate ?? 1) * 100) / 100;
      const absenceDeduction = Math.round(stats.absentDays * dailyRate * (company?.absenceDeductionRate ?? 1) * 100) / 100;
      const overtimePay = Math.round((stats.overtimeMinutes / 60) * hourlyRate * (company?.overtimeRate ?? 1.5) * 100) / 100;

      // Unpaid leave deduction
      const leaveDeduction = await buildLeaveDeduction(emp.id, m, y, dailyRate);

      // Compute net before loan (loan needs payroll ID)
      const netBeforeLoan = calcNet({ basicSalary, incentives: 0, overtimePay, deductions: 0, advances: 0, lateDeduction, absenceDeduction, leaveDeduction, loanDeduction: 0 });

      try {
        await db.transaction(async (tx) => {
          const [inserted] = await tx.insert(payrollTable).values({
            companyId, employeeId: emp.id,
            month: m, year: y,
            basicSalary, incentives: 0, overtimePay, deductions: 0, advances: 0,
            lateDeduction, absenceDeduction, leaveDeduction, loanDeduction: 0,
            netSalary: netBeforeLoan,
            currency: company?.currency ?? "IQD",
            workDays: stats.workDays, absentDays: stats.absentDays,
            lateMinutes: stats.lateMinutes, overtimeMinutes: stats.overtimeMinutes,
            leaveDays: stats.leaveDays, createdBy: userId,
          }).returning();

          // Apply loan installments inside the same transaction
          const loanDeduction = await applyLoanInstallment(tx, emp.id, companyId, m, y, inserted.id);

          if (loanDeduction > 0) {
            const netSalary = netBeforeLoan - loanDeduction;
            await tx.update(payrollTable).set({ loanDeduction, netSalary }).where(eq(payrollTable.id, inserted.id));
          }
        });

        // Notify employee that their payroll was generated (fire-and-forget)
        void createNotification(
          emp.id, companyId,
          "payroll_generated",
          "تم إصدار كشف الراتب",
          `تم إصدار راتب شهر ${m}/${y}. يمكنك مراجعته من قسم الرواتب`,
        ).catch(err => console.warn("[Notification]", err));
        created++;
      } catch (e: any) {
        if (isDuplicateKey(e)) skipped++;
        else throw e;
      }
    }
    res.status(201).json({ message: `تم إنشاء ${created} راتب، تم تخطي ${skipped} (موجودة مسبقاً)`, created, skipped });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── PUT /:id - update payroll ────────────────────────────────────────────────
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const id = parseInt(String(req.params.id));

    const [existing] = await db.select().from(payrollTable)
      .where(and(eq(payrollTable.id, id), eq(payrollTable.companyId, companyId)));
    if (!existing) { res.status(404).json({ message: "السجل غير موجود" }); return; }

    const updates: any = {};
    const loggable = ["basicSalary", "incentives", "overtimePay", "deductions", "advances", "lateDeduction", "absenceDeduction", "status", "notes", "currency"];

    for (const key of loggable) {
      if (req.body[key] !== undefined) {
        const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        const oldVal = (existing as any)[key];
        const newVal = ["status", "notes", "currency"].includes(key) ? req.body[key] : parseFloat(req.body[key]);
        updates[key] = newVal;
        await logPayrollChange(id, companyId, userId, key, oldVal, newVal);
      }
    }

    // Recalculate net
    const merged = { ...existing, ...updates };
    updates.netSalary = calcNet(merged);
    updates.updatedAt = new Date();

    const [updated] = await db.update(payrollTable).set(updates)
      .where(and(eq(payrollTable.id, id), eq(payrollTable.companyId, companyId)))
      .returning();

    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── POST /:id/pay - mark as paid ────────────────────────────────────────────
router.post("/:id/pay", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const id = parseInt(String(req.params.id));
    const { status = "paid" } = req.body;

    const [existing] = await db.select({ status: payrollTable.status })
      .from(payrollTable).where(and(eq(payrollTable.id, id), eq(payrollTable.companyId, companyId)));
    if (!existing) { res.status(404).json({ message: "السجل غير موجود" }); return; }

    await logPayrollChange(id, companyId, userId, "status", existing.status, status);

    const [updated] = await db.update(payrollTable)
      .set({ status, paidAt: status === "paid" ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(payrollTable.id, id), eq(payrollTable.companyId, companyId)))
      .returning();

    if (status === "paid" && updated) {
      void createNotification(
        updated.employeeId, companyId,
        "payroll_paid",
        "تم صرف الراتب",
        `تم صرف راتبك لشهر ${updated.month}/${updated.year} بمبلغ ${Number(updated.netSalary).toLocaleString()} ${updated.currency ?? ""}`,
        id, "payroll"
      ).catch(err => console.warn("[Notification]", err));
    }

    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    await db.delete(payrollTable).where(and(eq(payrollTable.id, id), eq(payrollTable.companyId, companyId)));
    res.json({ message: "تم حذف سجل الراتب" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
