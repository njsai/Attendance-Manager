import { Router, type Request, type Response } from "express";
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

async function verifyEmployeeBelongsToCompany(employeeId: number, companyId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id FROM employees WHERE id = $1 AND company_id = $2`,
    [employeeId, companyId]
  );
  return rows.length > 0;
}

router.get("/:employeeId", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const role = req.session.role!;
    const targetId = parseInt(req.params.employeeId);

    if (isNaN(targetId)) { res.status(400).json({ message: "معرف الموظف غير صالح" }); return; }

    if (role !== "admin" && userId !== targetId) {
      res.status(403).json({ message: "غير مصرح" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT e.id, e.full_name, e.email, e.phone, e.address, e.job_title, e.role,
              e.department_id, e.shift_id, e.branch_id, e.salary, e.is_active,
              e.emergency_contact_name, e.emergency_contact_phone, e.emergency_contact_rel,
              e.photo_data, e.created_at,
              d.name AS department_name, s.name AS shift_name, b.name AS branch_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
       LEFT JOIN shifts s ON s.id = e.shift_id AND s.company_id = e.company_id
       LEFT JOIN branches b ON b.id = e.branch_id AND b.company_id = e.company_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [targetId, companyId]
    );

    if (!rows[0]) { res.status(404).json({ message: "الموظف غير موجود" }); return; }

    const docRows = await pool.query(
      `SELECT id, doc_type, file_name, file_mime, status, uploaded_at, reviewed_at
       FROM employee_documents WHERE employee_id = $1 AND company_id = $2 ORDER BY uploaded_at DESC`,
      [targetId, companyId]
    );

    res.json({ ...rows[0], documents: docRows.rows });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.put("/:employeeId", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const actorId = req.session.userId!;
    const role = req.session.role!;
    const targetId = parseInt(req.params.employeeId);

    if (isNaN(targetId)) { res.status(400).json({ message: "معرف الموظف غير صالح" }); return; }

    const isSelf = actorId === targetId;
    const isAdmin = role === "admin";

    if (!isAdmin && !isSelf) {
      res.status(403).json({ message: "غير مصرح" });
      return;
    }

    const { rows: current } = await pool.query(
      `SELECT id, full_name, email, phone, address, job_title, role, department_id, shift_id, branch_id,
              salary, is_active, emergency_contact_name, emergency_contact_phone, emergency_contact_rel
       FROM employees WHERE id = $1 AND company_id = $2`,
      [targetId, companyId]
    );
    if (!current[0]) { res.status(404).json({ message: "الموظف غير موجود" }); return; }

    const emp = current[0];
    const body = req.body;

    const selfAllowed = ["phone", "email", "address", "photo_data"];
    const adminAllowed = [
      "phone", "email", "address", "full_name", "job_title", "role",
      "department_id", "shift_id", "branch_id", "salary", "is_active",
      "emergency_contact_name", "emergency_contact_phone", "emergency_contact_rel",
      "photo_data",
    ];
    const allowed = isAdmin ? adminAllowed : selfAllowed;

    if (isAdmin) {
      const fkChecks: { field: string; table: string; id: number | null }[] = [
        { field: "department_id", table: "departments", id: body.department_id ? parseInt(body.department_id) : null },
        { field: "shift_id",      table: "shifts",      id: body.shift_id      ? parseInt(body.shift_id)      : null },
        { field: "branch_id",     table: "branches",    id: body.branch_id     ? parseInt(body.branch_id)     : null },
      ];
      for (const fk of fkChecks) {
        if (!(fk.field in body) || body[fk.field] === "" || body[fk.field] === null || !fk.id) continue;
        const { rows: fkRows } = await pool.query(
          `SELECT id FROM ${fk.table} WHERE id = $1 AND company_id = $2`,
          [fk.id, companyId]
        );
        if (!fkRows[0]) {
          res.status(400).json({ message: `${fk.field} لا ينتمي لهذه الشركة` });
          return;
        }
      }
    }

    const setClauses: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    const changes: { field: string; old: string; new: string }[] = [];

    for (const key of allowed) {
      if (!(key in body)) continue;
      const newVal = body[key] === "" ? null : body[key];
      const oldVal = (emp as Record<string, unknown>)[key];
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        setClauses.push(`${key} = $${values.length + 1}`);
        values.push(newVal as string | number | boolean | null);
        changes.push({ field: key, old: String(oldVal ?? ""), new: String(newVal ?? "") });
      }
    }

    if (setClauses.length === 0) { res.json({ message: "لا توجد تغييرات" }); return; }

    values.push(targetId, companyId);
    await pool.query(
      `UPDATE employees SET ${setClauses.join(", ")} WHERE id = $${values.length - 1} AND company_id = $${values.length}`,
      values
    );

    const actorName = await getEmployeeName(companyId, actorId);

    const client = await pool.connect();
    try {
      for (const c of changes) {
        await logAudit(client, {
          companyId, actorId, actorName,
          targetId, targetName: emp.full_name,
          action: "update_profile",
          field: c.field, oldValue: c.old, newValue: c.new,
        });
      }
    } finally { client.release(); }

    const { rows: updated } = await pool.query(
      `SELECT id, full_name, email, phone, address, job_title, role, department_id, shift_id, branch_id,
              salary, is_active, emergency_contact_name, emergency_contact_phone, emergency_contact_rel, photo_data
       FROM employees WHERE id = $1 AND company_id = $2`,
      [targetId, companyId]
    );
    res.json(updated[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.post("/:employeeId/documents", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const actorId = req.session.userId!;
    const role = req.session.role!;
    const targetId = parseInt(req.params.employeeId);

    if (isNaN(targetId)) { res.status(400).json({ message: "معرف الموظف غير صالح" }); return; }

    if (role !== "admin" && actorId !== targetId) {
      res.status(403).json({ message: "غير مصرح" });
      return;
    }

    if (!await verifyEmployeeBelongsToCompany(targetId, companyId)) {
      res.status(404).json({ message: "الموظف غير موجود" });
      return;
    }

    const { docType, fileName, fileData, fileMime } = req.body;
    if (!docType || !fileName || !fileData) {
      res.status(400).json({ message: "بيانات ناقصة" });
      return;
    }

    const ALLOWED_MIMES = new Set([
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "application/pdf",
    ]);
    const mime: string = typeof fileMime === "string" ? fileMime.toLowerCase().trim() : "";
    if (!mime || !ALLOWED_MIMES.has(mime)) {
      res.status(400).json({ message: "نوع الملف غير مسموح — يُقبل فقط PDF والصور" });
      return;
    }

    const base64Size = fileData.length * 0.75;
    if (base64Size > 5 * 1024 * 1024) {
      res.status(400).json({ message: "حجم الملف يتجاوز 5 ميجابايت" });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO employee_documents (employee_id, company_id, doc_type, file_name, file_data, file_mime)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, doc_type, file_name, file_mime, status, uploaded_at`,
      [targetId, companyId, docType, fileName, fileData, fileMime || "application/octet-stream"]
    );

    const [actorName, targetName] = await Promise.all([
      getEmployeeName(companyId, actorId),
      getEmployeeName(companyId, targetId),
    ]);

    const client = await pool.connect();
    try {
      await logAudit(client, {
        companyId, actorId, actorName,
        targetId, targetName,
        action: "upload_document",
        field: "doc_type", newValue: docType,
      });
    } finally { client.release(); }

    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

async function updateDocStatus(req: Request, res: Response) {
  try {
    const companyId = req.session.companyId!;
    const actorId = req.session.userId!;
    const docId = parseInt(req.params.docId ?? req.params.id);
    const { status } = req.body;

    if (isNaN(docId)) { res.status(400).json({ message: "معرف المستند غير صالح" }); return; }

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
}

async function deleteDoc(req: Request, res: Response) {
  try {
    const companyId = req.session.companyId!;
    const actorId = req.session.userId!;
    const role = req.session.role!;
    const docId = parseInt(req.params.docId ?? req.params.id);

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
}

router.put("/documents/:docId/status", requireStrictAdmin, updateDocStatus);
router.delete("/documents/:docId", requireAuth, deleteDoc);

export default router;
