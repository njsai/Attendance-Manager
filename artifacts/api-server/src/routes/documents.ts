import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "@workspace/db";
import { requireAuth, requireStrictAdmin } from "../lib/auth.js";

const router = Router();

async function logAudit(client: PoolClient, {
  companyId, actorId, actorName, targetId, targetName, action, field, oldValue, newValue,
}: {
  companyId: number; actorId: number; actorName: string;
  targetId?: number; targetName?: string; action: string;
  field?: string; oldValue?: string; newValue?: string;
}) {
  await client.query(
    `INSERT INTO profile_audit_logs (company_id, actor_id, actor_name, target_id, target_name, action, field, old_value, new_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [companyId, actorId, actorName, targetId ?? null, targetName ?? null, action, field ?? null, oldValue ?? null, newValue ?? null]
  );
}

async function getEmployeeName(companyId: number, employeeId: number): Promise<string> {
  const { rows } = await pool.query(
    `SELECT full_name FROM employees WHERE id = $1 AND company_id = $2`,
    [employeeId, companyId]
  );
  return rows[0]?.full_name ?? "مجهول";
}

router.put("/:id/status", requireStrictAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const actorId = req.session.userId!;
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) { res.status(400).json({ message: "معرف المستند غير صالح" }); return; }

    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ message: "حالة غير صالحة" });
      return;
    }

    const { rows: current } = await pool.query(
      `SELECT status FROM employee_documents WHERE id = $1 AND company_id = $2`,
      [docId, companyId]
    );
    if (!current[0]) { res.status(404).json({ message: "المستند غير موجود" }); return; }
    const previousStatus = current[0].status as string;

    const { rows: docRows } = await pool.query(
      `UPDATE employee_documents SET status = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3 AND company_id = $4
       RETURNING id, employee_id, doc_type, file_name, file_mime, status, uploaded_at, reviewed_at`,
      [status, actorId, docId, companyId]
    );
    if (!docRows[0]) { res.status(404).json({ message: "المستند غير موجود" }); return; }

    const [actorName, targetName] = await Promise.all([
      getEmployeeName(companyId, actorId),
      getEmployeeName(companyId, docRows[0].employee_id),
    ]);

    const client = await pool.connect();
    try {
      await logAudit(client, {
        companyId, actorId, actorName,
        targetId: docRows[0].employee_id, targetName,
        action: status === "approved" ? "approve_document" : "reject_document",
        field: "document_status", oldValue: previousStatus, newValue: status,
      });
    } finally { client.release(); }

    res.json(docRows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const actorId = req.session.userId!;
    const role = req.session.role!;
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) { res.status(400).json({ message: "معرف المستند غير صالح" }); return; }

    const { rows: docRows } = await pool.query(
      `SELECT id, employee_id, doc_type, status FROM employee_documents WHERE id = $1 AND company_id = $2`,
      [docId, companyId]
    );
    if (!docRows[0]) { res.status(404).json({ message: "المستند غير موجود" }); return; }

    const isAdmin = role === "admin";
    const isOwner = docRows[0].employee_id === actorId;
    const isPending = docRows[0].status === "pending";

    if (!isAdmin && !(isOwner && isPending)) {
      res.status(403).json({ message: "غير مصرح بالحذف" });
      return;
    }

    await pool.query(`DELETE FROM employee_documents WHERE id = $1 AND company_id = $2`, [docId, companyId]);

    const [actorName, targetName] = await Promise.all([
      getEmployeeName(companyId, actorId),
      getEmployeeName(companyId, docRows[0].employee_id),
    ]);

    const client = await pool.connect();
    try {
      await logAudit(client, {
        companyId, actorId, actorName,
        targetId: docRows[0].employee_id, targetName,
        action: "delete_document",
        field: "doc_type", oldValue: docRows[0].doc_type,
      });
    } finally { client.release(); }

    res.json({ message: "تم الحذف" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
