import { Router } from "express";
import { db } from "@workspace/db";
import { loansTable, loanInstallmentsTable, employeesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, requireCompanyAuth } from "../lib/auth.js";
import { createNotification } from "../lib/createNotification.js";

const router = Router();

const loanSelect = {
  id: loansTable.id,
  companyId: loansTable.companyId,
  employeeId: loansTable.employeeId,
  amount: loansTable.amount,
  reason: loansTable.reason,
  status: loansTable.status,
  installmentsCount: loansTable.installmentsCount,
  installmentsPaid: loansTable.installmentsPaid,
  monthlyDeduction: loansTable.monthlyDeduction,
  approvedBy: loansTable.approvedBy,
  createdAt: loansTable.createdAt,
  updatedAt: loansTable.updatedAt,
  employeeName: employeesTable.fullName,
};

// ─── GET / ────────────────────────────────────────────────────────────────────
router.get("/", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const role = req.session.role!;
    const userId = req.session.userId!;

    const conditions: any[] = [eq(loansTable.companyId, companyId)];
    if (role === "employee") {
      conditions.push(eq(loansTable.employeeId, userId));
    } else if (req.query.employeeId) {
      conditions.push(eq(loansTable.employeeId, parseInt(req.query.employeeId as string)));
    }
    if (req.query.status) {
      conditions.push(eq(loansTable.status, req.query.status as string));
    }

    const loans = await db.select(loanSelect).from(loansTable)
      .leftJoin(employeesTable, eq(loansTable.employeeId, employeesTable.id))
      .where(and(...conditions))
      .orderBy(desc(loansTable.createdAt));

    res.json(loans);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── POST / — employee submits a loan request ─────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  if (req.session.role !== "employee") {
    res.status(403).json({ message: "يمكن للموظفين فقط تقديم طلبات السلف" });
    return;
  }
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const { amount, reason } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "المبلغ مطلوب ويجب أن يكون أكبر من صفر" });
      return;
    }

    const [loan] = await db.insert(loansTable).values({
      companyId,
      employeeId: userId,
      amount: parseFloat(amount),
      reason: reason || null,
      status: "pending",
      installmentsCount: 1,
      installmentsPaid: 0,
      monthlyDeduction: 0,
    }).returning();

    const [full] = await db.select(loanSelect).from(loansTable)
      .leftJoin(employeesTable, eq(loansTable.employeeId, employeesTable.id))
      .where(eq(loansTable.id, loan.id));

    res.status(201).json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── PUT /:id/approve — admin approves and sets installments ─────────────────
router.put("/:id/approve", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const id = parseInt(String(req.params.id));
    const { installmentsCount } = req.body;

    const count = parseInt(installmentsCount);
    if (!count || count < 1 || count > 120) {
      res.status(400).json({ message: "عدد الأقساط يجب أن يكون بين 1 و 120" });
      return;
    }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, id), eq(loansTable.companyId, companyId)));
    if (!loan) { res.status(404).json({ message: "الطلب غير موجود" }); return; }
    if (loan.status !== "pending") {
      res.status(409).json({ message: "لا يمكن الموافقة إلا على الطلبات المعلقة" });
      return;
    }

    const monthlyDeduction = Math.round((loan.amount / count) * 100) / 100;

    const [updated] = await db.update(loansTable).set({
      status: "approved",
      installmentsCount: count,
      monthlyDeduction,
      approvedBy: userId,
      updatedAt: new Date(),
    }).where(and(eq(loansTable.id, id), eq(loansTable.companyId, companyId))).returning();

    const [full] = await db.select(loanSelect).from(loansTable)
      .leftJoin(employeesTable, eq(loansTable.employeeId, employeesTable.id))
      .where(eq(loansTable.id, updated.id));

    void createNotification(
      updated.employeeId, companyId,
      "loan_approved",
      "تمت الموافقة على طلب السلفة",
      `تمت الموافقة على طلب سلفتك بمبلغ ${updated.monthlyDeduction} شهرياً على ${count} قسط`,
      id, "loan"
    ).catch(err => console.warn("[Notification]", err));

    res.json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── PUT /:id/reject — admin rejects ─────────────────────────────────────────
router.put("/:id/reject", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, id), eq(loansTable.companyId, companyId)));
    if (!loan) { res.status(404).json({ message: "الطلب غير موجود" }); return; }
    if (loan.status !== "pending") {
      res.status(409).json({ message: "لا يمكن رفض إلا الطلبات المعلقة" });
      return;
    }

    const [updated] = await db.update(loansTable).set({
      status: "rejected",
      updatedAt: new Date(),
    }).where(and(eq(loansTable.id, id), eq(loansTable.companyId, companyId))).returning();

    const [full] = await db.select(loanSelect).from(loansTable)
      .leftJoin(employeesTable, eq(loansTable.employeeId, employeesTable.id))
      .where(eq(loansTable.id, updated.id));

    void createNotification(
      updated.employeeId, companyId,
      "loan_rejected",
      "تم رفض طلب السلفة",
      `تم رفض طلب سلفتك بمبلغ ${Number(updated.amount).toLocaleString()}`,
      id, "loan"
    ).catch(err => console.warn("[Notification]", err));

    res.json(full);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET /:id/installments — list installments for a loan ────────────────────
router.get("/:id/installments", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, id), eq(loansTable.companyId, companyId)));
    if (!loan) { res.status(404).json({ message: "القرض غير موجود" }); return; }

    if (req.session.role === "employee" && loan.employeeId !== req.session.userId) {
      res.status(403).json({ message: "غير مصرح" }); return;
    }

    const installments = await db.select().from(loanInstallmentsTable)
      .where(eq(loanInstallmentsTable.loanId, id))
      .orderBy(loanInstallmentsTable.year, loanInstallmentsTable.month);

    res.json(installments);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
