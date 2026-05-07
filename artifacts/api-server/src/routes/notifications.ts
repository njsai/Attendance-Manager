import { Router } from "express";
import { pool } from "@workspace/db";
import { requireSuperAdmin } from "../lib/auth.js";

const router = Router();

async function query(sql: string, params: any[] = []) {
  const client = await pool.connect();
  try { return (await client.query(sql, params)).rows; }
  finally { client.release(); }
}

// ─── GET notifications (super admin) ──────────────────────────────────────────
router.get("/", requireSuperAdmin, async (req, res) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    const where = unreadOnly === "true" ? "WHERE is_read = FALSE" : "";
    const rows = await query(
      `SELECT sn.*, c.name AS company_name FROM system_notifications sn
       LEFT JOIN companies c ON c.id = sn.company_id
       ${where} ORDER BY sn.created_at DESC LIMIT $1`,
      [parseInt(String(limit))]
    );
    const [{ cnt }] = await query(`SELECT COUNT(*) AS cnt FROM system_notifications WHERE is_read = FALSE`);
    res.json({ notifications: rows, unreadCount: Number(cnt) });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── PUT mark as read ─────────────────────────────────────────────────────────
router.put("/:id/read", requireSuperAdmin, async (req, res) => {
  try {
    await query(`UPDATE system_notifications SET is_read = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ message: "تم التحديث" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

// ─── PUT mark all as read ──────────────────────────────────────────────────────
router.put("/read-all", requireSuperAdmin, async (_req, res) => {
  try {
    await query(`UPDATE system_notifications SET is_read = TRUE WHERE is_read = FALSE`);
    res.json({ message: "تم تحديد الكل كمقروء" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

// ─── DELETE notification ───────────────────────────────────────────────────────
router.delete("/:id", requireSuperAdmin, async (req, res) => {
  try {
    await query(`DELETE FROM system_notifications WHERE id = $1`, [req.params.id]);
    res.json({ message: "تم الحذف" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

// ─── DELETE all read notifications ────────────────────────────────────────────
router.delete("/clear-read", requireSuperAdmin, async (_req, res) => {
  try {
    await query(`DELETE FROM system_notifications WHERE is_read = TRUE`);
    res.json({ message: "تم مسح الإشعارات المقروءة" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

// ─── POST create notification (internal use) ──────────────────────────────────
router.post("/", requireSuperAdmin, async (req, res) => {
  try {
    const { type, severity, title, message, companyId } = req.body;
    const [notif] = await query(
      `INSERT INTO system_notifications (type, severity, title, message, company_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [type, severity || "info", title, message, companyId || null]
    );
    res.status(201).json(notif);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

export default router;
