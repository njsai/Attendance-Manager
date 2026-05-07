import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireSuperAdmin, requireCompanyAuth } from "../lib/auth.js";
import { getClientIp } from "../lib/security.js";

const router = Router();

// ─── Super Admin: All audit logs ──────────────────────────────────────────────
router.get("/audit-logs", requireSuperAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;

    const rows = await db.execute(sql`
      SELECT al.*, c.name as company_name
      FROM audit_logs al
      LEFT JOIN companies c ON al.company_id = c.id
      ${companyId ? sql`WHERE al.company_id = ${companyId}` : sql``}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM audit_logs
      ${companyId ? sql`WHERE company_id = ${companyId}` : sql``}
    `);

    res.json({
      logs: rows.rows,
      total: Number((countResult.rows[0] as any)?.total ?? 0),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Security events ────────────────────────────────────────────
router.get("/events", requireSuperAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
    const severity = req.query.severity as string | null;
    const resolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : null;

    const rows = await db.execute(sql`
      SELECT se.*, c.name as company_name
      FROM security_events se
      LEFT JOIN companies c ON se.company_id = c.id
      WHERE (${severity} IS NULL OR se.severity = ${severity})
        AND (${resolved} IS NULL OR se.resolved = ${resolved})
      ORDER BY se.created_at DESC
      LIMIT ${limit}
    `);

    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Resolve security event ─────────────────────────────────────
router.put("/events/:id/resolve", requireSuperAdmin, async (req, res) => {
  try {
    await db.execute(sql`
      UPDATE security_events SET resolved = true WHERE id = ${parseInt(req.params.id)}
    `);
    res.json({ message: "تم حل الحادثة" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Login attempts stats ───────────────────────────────────────
router.get("/login-stats", requireSuperAdmin, async (req, res) => {
  try {
    const totalResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM login_attempts
    `);

    const topIpsResult = await db.execute(sql`
      SELECT ip_address, COUNT(*) as attempts, COUNT(*) FILTER (WHERE success = false) as failures
      FROM login_attempts
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY ip_address
      ORDER BY failures DESC
      LIMIT 10
    `);

    const recentFailsResult = await db.execute(sql`
      SELECT ip_address, username, created_at
      FROM login_attempts
      WHERE success = false
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json({
      stats: totalResult.rows[0],
      topIps: topIpsResult.rows,
      recentFails: recentFailsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Active sessions ────────────────────────────────────────────
router.get("/sessions", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT as2.*, e.full_name, e.username, c.name as company_name
      FROM active_sessions as2
      LEFT JOIN employees e ON as2.user_id = e.id
      LEFT JOIN companies c ON as2.company_id = c.id
      ORDER BY as2.last_active_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Terminate a session ────────────────────────────────────────
router.delete("/sessions/:sessionId", requireSuperAdmin, async (req, res) => {
  try {
    const sid = req.params.sessionId;
    // Remove from active_sessions tracking
    await db.execute(sql`DELETE FROM active_sessions WHERE session_id = ${sid}`);
    // Remove from express-session store
    await db.execute(sql`DELETE FROM session WHERE sid = ${sid}`);
    res.json({ message: "تم إنهاء الجلسة" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Locked accounts ────────────────────────────────────────────
router.get("/locked-accounts", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.full_name, e.username, e.failed_login_attempts, e.locked_until, e.last_login_at, e.last_login_ip,
             c.name as company_name, e.company_id
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      WHERE e.locked_until > NOW() OR e.failed_login_attempts >= 5
      ORDER BY e.locked_until DESC NULLS LAST
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Unlock account ─────────────────────────────────────────────
router.post("/unlock/:employeeId", requireSuperAdmin, async (req, res) => {
  try {
    await db.execute(sql`
      UPDATE employees SET failed_login_attempts = 0, locked_until = NULL
      WHERE id = ${parseInt(req.params.employeeId)}
    `);
    res.json({ message: "تم فتح قفل الحساب" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super Admin: Security summary (dashboard widget) ────────────────────────
router.get("/summary", requireSuperAdmin, async (req, res) => {
  try {
    const [events, logins, locked, sessions] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM security_events WHERE resolved = false AND created_at > NOW() - INTERVAL '7 days'`),
      db.execute(sql`SELECT COUNT(*) as count FROM login_attempts WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'`),
      db.execute(sql`SELECT COUNT(*) as count FROM employees WHERE locked_until > NOW()`),
      db.execute(sql`SELECT COUNT(*) as count FROM active_sessions WHERE last_active_at > NOW() - INTERVAL '1 hour'`),
    ]);
    res.json({
      openEvents: Number((events.rows[0] as any)?.count ?? 0),
      failedLogins24h: Number((logins.rows[0] as any)?.count ?? 0),
      lockedAccounts: Number((locked.rows[0] as any)?.count ?? 0),
      activeSessions: Number((sessions.rows[0] as any)?.count ?? 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Company: Own audit log ───────────────────────────────────────────────────
router.get("/my-audit", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    if (req.session.role !== "admin") {
      res.status(403).json({ message: "للمدير فقط" });
      return;
    }
    const rows = await db.execute(sql`
      SELECT * FROM audit_logs
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Company: Own active sessions ────────────────────────────────────────────
router.get("/my-sessions", requireCompanyAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const rows = await db.execute(sql`
      SELECT session_id, ip_address, user_agent, device_name, last_active_at, created_at
      FROM active_sessions
      WHERE user_id = ${userId}
      ORDER BY last_active_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Company: Logout from all sessions ───────────────────────────────────────
router.post("/logout-all", requireCompanyAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const currentSession = req.sessionID;

    // Get all session IDs for this user
    const sessions = await db.execute(sql`
      SELECT session_id FROM active_sessions WHERE user_id = ${userId}
    `);

    for (const s of sessions.rows as { session_id: string }[]) {
      if (s.session_id !== currentSession) {
        await db.execute(sql`DELETE FROM session WHERE sid = ${s.session_id}`);
      }
    }
    await db.execute(sql`DELETE FROM active_sessions WHERE user_id = ${userId} AND session_id != ${currentSession}`);

    res.json({ message: `تم تسجيل الخروج من ${sessions.rows.length - 1} جلسة أخرى` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
