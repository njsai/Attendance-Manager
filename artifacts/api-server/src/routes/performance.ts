import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const isAdmin = req.session.role === "admin";

    let whereClause = "WHERE pr.company_id = $1";
    const params: any[] = [companyId];

    if (!isAdmin) {
      params.push(req.session.userId);
      whereClause += " AND pr.employee_id = $2";
    } else if (req.query.employeeId) {
      params.push(parseInt(req.query.employeeId as string));
      whereClause += " AND pr.employee_id = $2";
    }

    const { rows } = await pool.query(
      `SELECT pr.*,
              e.full_name as employee_name,
              e.job_title as employee_job_title,
              r.full_name as reviewer_name
       FROM performance_reviews pr
       LEFT JOIN employees e ON pr.employee_id = e.id
       LEFT JOIN employees r ON pr.reviewer_id = r.id
       ${whereClause}
       ORDER BY pr.period_year DESC, pr.period_month DESC NULLS LAST, pr.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { employee_id, period_type, period_month, period_year, commitment, performance, cooperation, achievement, behavior, comments } = req.body;
    if (!employee_id || !period_year) {
      res.status(400).json({ message: "الموظف والسنة مطلوبان" });
      return;
    }
    const { rows: empCheck } = await pool.query(
      `SELECT id FROM employees WHERE id = $1 AND company_id = $2`,
      [employee_id, companyId]
    );
    if (!empCheck[0]) {
      res.status(403).json({ message: "الموظف غير موجود في شركتك" });
      return;
    }
    const clamp = (v: any) => Math.min(5, Math.max(1, parseInt(v) || 3));
    const c = clamp(commitment), p = clamp(performance), co = clamp(cooperation),
          a = clamp(achievement), b = clamp(behavior);
    const overall = (c + p + co + a + b) / 5;
    const { rows } = await pool.query(
      `INSERT INTO performance_reviews
         (company_id, employee_id, reviewer_id, period_type, period_month, period_year,
          commitment, performance, cooperation, achievement, behavior, overall_score, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [companyId, employee_id, req.session.userId, period_type || "monthly",
       period_month || null, period_year,
       c, p, co, a, b,
       overall, comments || null]
    );

    const { rows: full } = await pool.query(
      `SELECT pr.*, e.full_name as employee_name, e.job_title as employee_job_title, r.full_name as reviewer_name
       FROM performance_reviews pr
       LEFT JOIN employees e ON pr.employee_id = e.id
       LEFT JOIN employees r ON pr.reviewer_id = r.id
       WHERE pr.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    const { commitment, performance, cooperation, achievement, behavior, comments, employee_id } = req.body;
    if (employee_id) {
      const { rows: empCheck } = await pool.query(
        `SELECT id FROM employees WHERE id = $1 AND company_id = $2`,
        [employee_id, companyId]
      );
      if (!empCheck[0]) {
        res.status(403).json({ message: "الموظف غير موجود في شركتك" });
        return;
      }
    }
    const clamp = (v: any) => Math.min(5, Math.max(1, parseInt(v) || 3));
    const c = clamp(commitment), p = clamp(performance), co = clamp(cooperation),
          a = clamp(achievement), b = clamp(behavior);
    const overall = (c + p + co + a + b) / 5;
    const { rows } = await pool.query(
      `UPDATE performance_reviews
       SET commitment=$1, performance=$2, cooperation=$3, achievement=$4, behavior=$5,
           overall_score=$6, comments=$7
       WHERE id=$8 AND company_id=$9
       RETURNING *`,
      [c, p, co, a, b, overall, comments || null, id, companyId]
    );
    if (!rows[0]) { res.status(404).json({ message: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
