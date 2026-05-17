import { Router } from "express";
import { pool } from "@workspace/db";
import { requireStrictAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireStrictAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { employeeId, page = "1", limit = "30" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 30);
    const offset = (pageNum - 1) * limitNum;

    let parsedEmployeeId: number | null = null;
    if (employeeId !== undefined) {
      parsedEmployeeId = parseInt(employeeId as string);
      if (isNaN(parsedEmployeeId) || parsedEmployeeId <= 0) {
        res.status(400).json({ message: "employeeId غير صالح" });
        return;
      }
    }

    let query = `
      SELECT id, actor_id, actor_name, target_id, target_name, action, field, old_value, new_value, created_at
      FROM profile_audit_logs
      WHERE company_id = $1
    `;
    const params: (string | number)[] = [companyId];

    if (parsedEmployeeId !== null) {
      params.push(parsedEmployeeId);
      query += ` AND target_id = $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM (${query}) AS sub`;
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const { rows } = await pool.query(query, params);

    res.json({
      logs: rows,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
