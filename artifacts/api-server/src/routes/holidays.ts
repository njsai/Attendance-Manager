import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

// ── Weekly off days ────────────────────────────────────────────────────────

router.get("/weekly", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT weekly_off_days FROM companies WHERE id = $1`,
      [req.session.companyId]
    );
    const raw: string = rows[0]?.weekly_off_days ?? "5,6";
    const days = raw ? raw.split(",").map(Number).filter((n: number) => n >= 0 && n <= 6) : [];
    res.json({ weeklyOffDays: days });
  } catch (err) {
    console.error("GET /holidays/weekly:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.put("/weekly", requireAdmin, async (req, res) => {
  try {
    const { weeklyOffDays } = req.body;
    if (!Array.isArray(weeklyOffDays)) {
      res.status(400).json({ message: "weeklyOffDays يجب أن يكون مصفوفة" }); return;
    }
    const valid = weeklyOffDays.filter((d: any) => Number.isInteger(d) && d >= 0 && d <= 6);
    await pool.query(
      `UPDATE companies SET weekly_off_days = $1 WHERE id = $2`,
      [valid.join(","), req.session.companyId]
    );
    res.json({ weeklyOffDays: valid });
  } catch (err) {
    console.error("PUT /holidays/weekly:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ── Public holidays CRUD ───────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { rows } = await pool.query(
      `SELECT id, company_id, name, date::text AS date, is_recurring, notes, created_at
       FROM public_holidays
       WHERE company_id = $1
       ORDER BY date ASC`,
      [companyId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /holidays:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { name, date, isRecurring, notes } = req.body;
    if (!name || !date) {
      res.status(400).json({ message: "الاسم والتاريخ مطلوبان" }); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ message: "تنسيق التاريخ غير صالح — استخدم YYYY-MM-DD" }); return;
    }
    const { rows } = await pool.query(
      `INSERT INTO public_holidays (company_id, name, date, is_recurring, notes)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, company_id, name, date::text AS date, is_recurring, notes, created_at`,
      [companyId, name.trim(), date, !!isRecurring, notes?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /holidays:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: "معرّف غير صالح" }); return; }
    const { name, date, isRecurring, notes } = req.body;
    if (!name || !date) { res.status(400).json({ message: "الاسم والتاريخ مطلوبان" }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ message: "تنسيق التاريخ غير صالح" }); return;
    }
    const { rows } = await pool.query(
      `UPDATE public_holidays
       SET name=$1, date=$2, is_recurring=$3, notes=$4
       WHERE id=$5 AND company_id=$6
       RETURNING id, company_id, name, date::text AS date, is_recurring, notes, created_at`,
      [name.trim(), date, !!isRecurring, notes?.trim() || null, id, companyId]
    );
    if (!rows.length) { res.status(404).json({ message: "العطلة غير موجودة" }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /holidays/:id:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: "معرّف غير صالح" }); return; }
    const { rowCount } = await pool.query(
      `DELETE FROM public_holidays WHERE id=$1 AND company_id=$2`,
      [id, companyId]
    );
    if (!rowCount) { res.status(404).json({ message: "العطلة غير موجودة" }); return; }
    res.json({ message: "تم الحذف" });
  } catch (err) {
    console.error("DELETE /holidays/:id:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
