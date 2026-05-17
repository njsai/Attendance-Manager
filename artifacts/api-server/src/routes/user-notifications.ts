import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// ─── GET /api/user-notifications ─────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId    = req.session.userId!;
    const limit     = Math.min(parseInt(req.query.limit as string) || 30, 100);

    const { rows } = await pool.query(
      `SELECT id, type, title, message, is_read, related_id, related_type, created_at
         FROM user_notifications
        WHERE company_id = $1 AND employee_id = $2
        ORDER BY created_at DESC
        LIMIT $3`,
      [companyId, userId, limit]
    );

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM user_notifications
        WHERE company_id = $1 AND employee_id = $2 AND is_read = FALSE`,
      [companyId, userId]
    );

    res.json({ notifications: rows, unreadCount: Number(cnt[0].cnt) });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── PUT /api/user-notifications/read-all  (must be before /:id/read) ────────
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId    = req.session.userId!;

    await pool.query(
      `UPDATE user_notifications
          SET is_read = TRUE
        WHERE company_id = $1 AND employee_id = $2 AND is_read = FALSE`,
      [companyId, userId]
    );

    res.json({ message: "تم تحديد الكل كمقروء" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

// ─── PUT /api/user-notifications/:id/read ────────────────────────────────────
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId    = req.session.userId!;
    const id        = parseInt(req.params.id);

    if (isNaN(id)) { res.status(400).json({ message: "معرف غير صالح" }); return; }

    await pool.query(
      `UPDATE user_notifications
          SET is_read = TRUE
        WHERE id = $1 AND company_id = $2 AND employee_id = $3`,
      [id, companyId, userId]
    );

    res.json({ message: "تم التحديث" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

export default router;
