import { Router } from "express";
import os from "os";
import { pool } from "@workspace/db";
import { requireSuperAdmin } from "../lib/auth.js";

const router = Router();

const serverStart = Date.now();
const requestHistory: { ts: number; ms: number }[] = [];
let lastRequestCount = 0;

// Middleware to track request timing
export function trackRequest(_req: any, _res: any, next: any) {
  const start = Date.now();
  _res.on("finish", () => {
    requestHistory.push({ ts: Date.now(), ms: Date.now() - start });
    if (requestHistory.length > 500) requestHistory.splice(0, 100);
    lastRequestCount++;
  });
  next();
}

async function query(sql: string) {
  const client = await pool.connect();
  try { return (await client.query(sql)).rows; }
  finally { client.release(); }
}

function getCpuUsage(): Promise<number> {
  return new Promise(resolve => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let totalIdle = 0, totalTick = 0;
      cpus1.forEach((cpu, i) => {
        const cpu2 = cpus2[i];
        const idle1 = cpu.times.idle;
        const total1 = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle2 = cpu2.times.idle;
        const total2 = Object.values(cpu2.times).reduce((a, b) => a + b, 0);
        totalIdle += idle2 - idle1;
        totalTick += total2 - total1;
      });
      resolve(totalTick === 0 ? 0 : Math.round((1 - totalIdle / totalTick) * 100));
    }, 200);
  });
}

// ─── GET /api/super-admin/monitoring ──────────────────────────────────────────
router.get("/", requireSuperAdmin, async (_req, res) => {
  try {
    const [cpuUsage, dbResult, activeSessionsRes, recentErrors] = await Promise.all([
      getCpuUsage(),
      query(`SELECT 1 AS ok`).then(() => "online").catch(() => "offline"),
      query(`SELECT COUNT(*) AS cnt FROM active_sessions WHERE last_active_at > NOW() - INTERVAL '5 minutes'`).catch(() => [{ cnt: 0 }]),
      query(`SELECT COUNT(*) AS cnt FROM security_events WHERE severity IN ('high','critical') AND created_at > NOW() - INTERVAL '1 hour'`).catch(() => [{ cnt: 0 }]),
    ]);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = Math.round((usedMem / totalMem) * 100);

    const now = Date.now();
    const recent = requestHistory.filter(r => r.ts > now - 60_000);
    const avgResponseMs = recent.length > 0
      ? Math.round(recent.reduce((a, b) => a + b.ms, 0) / recent.length)
      : 0;
    const requestsPerMin = recent.length;

    const uptimeMs = Date.now() - serverStart;
    const uptimeSecs = Math.floor(uptimeMs / 1000);
    const days = Math.floor(uptimeSecs / 86400);
    const hours = Math.floor((uptimeSecs % 86400) / 3600);
    const minutes = Math.floor((uptimeSecs % 3600) / 60);

    // Get request history for chart (last 10 minutes, per-minute buckets)
    const chartData = Array.from({ length: 10 }, (_, i) => {
      const start = now - (10 - i) * 60_000;
      const end   = now - (9  - i) * 60_000;
      const bucket = requestHistory.filter(r => r.ts >= start && r.ts < end);
      return {
        label: `-${10 - i}m`,
        requests: bucket.length,
        avgMs: bucket.length > 0 ? Math.round(bucket.reduce((a, b) => a + b.ms, 0) / bucket.length) : 0,
      };
    });

    res.json({
      status: "online",
      cpu: { usage: cpuUsage, cores: os.cpus().length },
      ram: { usedGb: +(usedMem / 1e9).toFixed(2), totalGb: +(totalMem / 1e9).toFixed(2), percent: ramPercent },
      uptime: { days, hours, minutes, totalSeconds: uptimeSecs },
      database: { status: dbResult, host: process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "local" },
      api: { avgResponseMs, requestsPerMin, totalRequests: lastRequestCount },
      activeSessions: Number(activeSessionsRes[0]?.cnt ?? 0),
      recentErrors: Number(recentErrors[0]?.cnt ?? 0),
      platform: os.platform(),
      nodeVersion: process.version,
      chartData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Monitoring error:", err);
    res.status(500).json({ message: "خطأ في جمع بيانات المراقبة" });
  }
});

// ─── GET recent audit logs ─────────────────────────────────────────────────────
router.get("/audit-logs", requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 100, action, severity, companyId, search, offset = 0 } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (action) { conditions.push(`action ILIKE $${params.length + 1}`); params.push(`%${action}%`); }
    if (companyId) { conditions.push(`company_id = $${params.length + 1}`); params.push(companyId); }
    if (search) {
      conditions.push(`(user_name ILIKE $${params.length + 1} OR resource ILIKE $${params.length + 1} OR ip_address ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(parseInt(String(limit)));
    params.push(parseInt(String(offset)));

    const rows = await query(
      `SELECT al.*, c.name AS company_name FROM audit_logs al
       LEFT JOIN companies c ON c.id = al.company_id
       ${where} ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`
    );
    const [{ cnt }] = await query(`SELECT COUNT(*) AS cnt FROM audit_logs ${where}`);
    res.json({ logs: rows, total: Number(cnt) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── GET security events ───────────────────────────────────────────────────────
router.get("/security-events", requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const rows = await query(
      `SELECT se.*, c.name AS company_name FROM security_events se
       LEFT JOIN companies c ON c.id = se.company_id
       ORDER BY se.created_at DESC LIMIT $1`
    );
    res.json(rows.slice(0, parseInt(String(limit))));
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ" }); }
});

export default router;
