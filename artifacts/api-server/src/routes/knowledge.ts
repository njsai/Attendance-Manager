import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { category, search } = req.query;

    let whereClause = "WHERE kd.company_id = $1";
    const params: any[] = [companyId];

    if (category) {
      params.push(category);
      whereClause += ` AND kd.category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (kd.title ILIKE $${params.length} OR kd.category ILIKE $${params.length})`;
    }

    const { rows } = await pool.query(
      `SELECT kd.id, kd.title, kd.category, kd.file_name, kd.file_type, kd.file_size,
              kd.file_url, kd.created_at, kd.uploaded_by, e.full_name as uploaded_by_name
       FROM knowledge_docs kd
       LEFT JOIN employees e ON kd.uploaded_by = e.id
       ${whereClause}
       ORDER BY kd.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id/download", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    const { rows } = await pool.query(
      `SELECT * FROM knowledge_docs WHERE id=$1 AND company_id=$2`,
      [id, companyId]
    );
    if (!rows[0]) { res.status(404).json({ message: "Not found" }); return; }
    const doc = rows[0];
    if (doc.file_url) {
      res.json({ file_url: doc.file_url, file_name: doc.file_name || doc.title });
    } else {
      res.json({ file_data: doc.file_data, file_name: doc.file_name, file_type: doc.file_type });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { title, category, file_name, file_type, file_data, file_size, file_url } = req.body;

    if (!title) {
      res.status(400).json({ message: "العنوان مطلوب" });
      return;
    }
    if (!file_data && !file_url) {
      res.status(400).json({ message: "يجب رفع ملف أو إدخال رابط خارجي" });
      return;
    }
    if (file_data) {
      // Strip Data URL prefix (e.g. "data:image/png;base64,") before measuring bytes
      const b64 = file_data.includes(",") ? file_data.split(",")[1] : file_data;
      const decoded = Buffer.byteLength(b64, "base64");
      if (decoded > 10 * 1024 * 1024) {
        res.status(400).json({ message: "حجم الملف يتجاوز 10MB" });
        return;
      }
    }
    if (file_url) {
      try {
        const parsed = new URL(file_url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          res.status(400).json({ message: "الرابط يجب أن يبدأ بـ http أو https" });
          return;
        }
      } catch {
        res.status(400).json({ message: "الرابط غير صالح" });
        return;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO knowledge_docs
         (company_id, title, category, file_name, file_type, file_data, file_size, file_url, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, title, category, file_name, file_type, file_size, file_url, created_at, uploaded_by`,
      [
        companyId, title, category || "عام",
        file_url ? (file_name || title) : file_name,
        file_url ? (file_type || "link") : file_type,
        file_data || null,
        file_url ? 0 : (file_size || 0),
        file_url || null,
        req.session.userId,
      ]
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
    const { title, category } = req.body;
    if (!title) { res.status(400).json({ message: "العنوان مطلوب" }); return; }
    const { rows } = await pool.query(
      `UPDATE knowledge_docs SET title=$1, category=$2
       WHERE id=$3 AND company_id=$4
       RETURNING id, title, category, file_name, file_type, file_size, file_url, created_at, uploaded_by`,
      [title, category || "عام", id, companyId]
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
    const { rowCount } = await pool.query(
      `DELETE FROM knowledge_docs WHERE id=$1 AND company_id=$2`,
      [id, companyId]
    );
    if (!rowCount) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
