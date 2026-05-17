import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { month, year } = req.query;

    const monthNum = month ? parseInt(month as string) : NaN;
    const yearNum  = year  ? parseInt(year  as string) : NaN;
    if ((month || year) && (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100)) {
      res.status(400).json({ message: "قيم الشهر أو السنة غير صالحة" });
      return;
    }

    let whereClause = "WHERE ce.company_id = $1";
    const params: any[] = [companyId];

    if (month && year) {
      params.push(year, month);
      whereClause += ` AND (
        (EXTRACT(YEAR FROM ce.start_date) = $2 AND EXTRACT(MONTH FROM ce.start_date) = $3)
        OR (EXTRACT(YEAR FROM ce.end_date) = $2 AND EXTRACT(MONTH FROM ce.end_date) = $3)
        OR (ce.start_date <= (DATE_TRUNC('month', TO_DATE($2||'-'||$3||'-01','YYYY-MM-DD')) + INTERVAL '1 month - 1 day')
            AND ce.end_date >= DATE_TRUNC('month', TO_DATE($2||'-'||$3||'-01','YYYY-MM-DD')))
      )`;
    }

    const { rows: events } = await pool.query(
      `SELECT ce.*, e.full_name as created_by_name
       FROM calendar_events ce
       LEFT JOIN employees e ON ce.created_by = e.id
       ${whereClause}
       ORDER BY ce.start_date ASC`,
      params
    );

    let leaveRows: any[] = [];
    if (month && year) {
      const { rows } = await pool.query(
        `SELECT l.id, l.start_date, l.end_date, l.leave_type,
                e.full_name as employee_name, l.employee_id
         FROM leaves l
         JOIN employees e ON l.employee_id = e.id
         WHERE e.company_id = $1
           AND l.status = 'approved'
           AND l.start_date <= (DATE_TRUNC('month', TO_DATE($2||'-'||$3||'-01','YYYY-MM-DD')) + INTERVAL '1 month - 1 day')
           AND l.end_date   >= DATE_TRUNC('month', TO_DATE($2||'-'||$3||'-01','YYYY-MM-DD'))
         ORDER BY l.start_date ASC`,
        [companyId, year, month]
      );
      leaveRows = rows;
    }

    res.json({ events, leaves: leaveRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { title, description, event_type, start_date, end_date, color } = req.body;
    if (!title || !start_date || !end_date) {
      res.status(400).json({ message: "العنوان والتواريخ مطلوبة" });
      return;
    }
    if (start_date > end_date) {
      res.status(400).json({ message: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" });
      return;
    }
    const { rows } = await pool.query(
      `INSERT INTO calendar_events (company_id, title, description, event_type, start_date, end_date, color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [companyId, title, description || null, event_type || "event", start_date, end_date, color || null, req.session.userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) { res.status(400).json({ message: "معرّف غير صالح" }); return; }
    const { title, description, event_type, start_date, end_date, color } = req.body;
    if (!title || !start_date || !end_date) {
      res.status(400).json({ message: "العنوان والتواريخ مطلوبة" });
      return;
    }
    if (start_date > end_date) {
      res.status(400).json({ message: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE calendar_events
       SET title=$1, description=$2, event_type=$3, start_date=$4, end_date=$5, color=$6
       WHERE id=$7 AND company_id=$8
       RETURNING *`,
      [title, description || null, event_type || "event", start_date, end_date, color || null, id, companyId]
    );
    if (!rows[0]) { res.status(404).json({ message: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) { res.status(400).json({ message: "معرّف غير صالح" }); return; }
    await pool.query(`DELETE FROM calendar_events WHERE id=$1 AND company_id=$2`, [id, companyId]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
