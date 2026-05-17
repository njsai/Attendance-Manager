import { pool } from "@workspace/db";

/**
 * Insert a per-user HR notification.
 * Does NOT catch errors — callers decide how to handle failures.
 * For fire-and-forget use: `void createNotification(...).catch(err => console.warn("[Notification]", err))`
 */
export async function createNotification(
  employeeId: number,
  companyId: number,
  type: string,
  title: string,
  message: string,
  relatedId?: number,
  relatedType?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO user_notifications
       (company_id, employee_id, type, title, message, related_id, related_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [companyId, employeeId, type, title, message, relatedId ?? null, relatedType ?? null]
  );
}
