import { Router } from "express";
import { pool } from "@workspace/db";
import { requireCompanyAuth } from "../lib/auth.js";

const router = Router();

async function query(sql: string, params: any[] = []) {
  const client = await pool.connect();
  try { return (await client.query(sql, params)).rows; }
  finally { client.release(); }
}

// GET /api/company/alerts
router.get("/", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId;
    const rows = await query(
      `SELECT id, type, severity, title, message, is_read, created_at
       FROM system_notifications
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [companyId]
    );

    const [sub] = await query(
      `SELECT cs.plan_name, cs.end_date, cs.status,
         CASE WHEN cs.end_date IS NULL THEN NULL
              ELSE (cs.end_date - CURRENT_DATE)::int END AS days_remaining
       FROM company_subscriptions cs
       WHERE cs.company_id = $1
       ORDER BY cs.created_at DESC LIMIT 1`,
      [companyId]
    );

    const unreadCount = rows.filter((r: any) => !r.is_read).length;
    res.json({ notifications: rows, unreadCount, subscription: sub ?? null });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// PUT /api/company/alerts/:id/read
router.put("/:id/read", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId;
    await query(
      `UPDATE system_notifications SET is_read = TRUE WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId]
    );
    res.json({ message: "ok" });
  } catch (err) { res.status(500).json({ message: "خطأ" }); }
});

// PUT /api/company/alerts/read-all
router.put("/read-all", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId;
    await query(
      `UPDATE system_notifications SET is_read = TRUE WHERE company_id = $1 AND is_read = FALSE`,
      [companyId]
    );
    res.json({ message: "ok" });
  } catch (err) { res.status(500).json({ message: "خطأ" }); }
});

export default router;
