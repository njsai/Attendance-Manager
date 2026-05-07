import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const BCRYPT_ROUNDS = 12;
const SHA256_SALT = "salt_attend_2024";

// ─── Password Hashing ─────────────────────────────────────────────────────────
// We sha256-pre-hash to handle long passwords, then bcrypt for security
// Legacy passwords: plain sha256 hex → detect by length (64 chars, no $2b$ prefix)

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input + SHA256_SALT).digest("hex");
}

export async function hashPasswordBcrypt(password: string): Promise<string> {
  const pre = sha256(password);
  return bcrypt.hash(pre, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const pre = sha256(password);
  // Bcrypt hash starts with $2b$ or $2a$
  if (storedHash.startsWith("$2")) {
    return bcrypt.compare(pre, storedHash);
  }
  // Legacy SHA-256: direct compare (will be upgraded on next login)
  return storedHash === pre;
}

export async function upgradeLegacyHash(password: string): Promise<string> {
  return hashPasswordBcrypt(password);
}

export function isLegacyHash(hash: string): boolean {
  return !hash.startsWith("$2");
}

// Keep sync version for backward compat during transition
export function hashPasswordSync(password: string): string {
  return sha256(password);
}

// ─── Brute Force / Rate Limiting Helpers ─────────────────────────────────────
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkIpRateLimit(ip: string, windowMs = 15 * 60 * 1000, maxAttempts = 20): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  entry.count++;
  if (entry.count > maxAttempts) return false; // blocked
  return true;
}

export function resetIpAttempts(ip: string): void {
  ipAttempts.delete(ip);
}

// ─── Device Detection ─────────────────────────────────────────────────────────
export function parseDevice(userAgent: string): string {
  if (!userAgent) return "جهاز غير معروف";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android")) return "جهاز محمول";
  if (ua.includes("ipad") || ua.includes("tablet")) return "تابلت";
  if (ua.includes("windows")) return "ويندوز";
  if (ua.includes("mac")) return "ماك";
  if (ua.includes("linux")) return "لينكس";
  return "متصفح ويب";
}

export function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "0.0.0.0"
  );
}

// ─── Sanitization ─────────────────────────────────────────────────────────────
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "/": "&#x2F;",
};
export function sanitizeString(str: unknown): string {
  if (typeof str !== "string") return String(str ?? "");
  return str.replace(/[&<>"'/]/g, ch => HTML_ENTITIES[ch] ?? ch);
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v.trim(); // trim whitespace, don't escape (let DB handle via parameterized queries)
    else out[k] = v;
  }
  return out;
}

// ─── Audit Logging ────────────────────────────────────────────────────────────
interface AuditEntry {
  companyId?: number | null;
  userId?: number | null;
  userRole?: string | null;
  userName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: "success" | "failure" | "warning";
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs
        (company_id, user_id, user_role, user_name, action, resource, resource_id, details, ip_address, user_agent, status)
      VALUES
        (${entry.companyId ?? null}, ${entry.userId ?? null}, ${entry.userRole ?? null},
         ${entry.userName ?? null}, ${entry.action}, ${entry.resource},
         ${entry.resourceId ?? null}, ${entry.details ? JSON.stringify(entry.details) : null},
         ${entry.ipAddress ?? null}, ${entry.userAgent ?? null}, ${entry.status ?? "success"})
    `);
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}

// ─── Security Events ──────────────────────────────────────────────────────────
interface SecurityEvent {
  companyId?: number | null;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  ipAddress?: string | null;
  userId?: number | null;
  userName?: string | null;
  metadata?: Record<string, any> | null;
}

export async function writeSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO security_events
        (company_id, event_type, severity, description, ip_address, user_id, user_name, metadata)
      VALUES
        (${event.companyId ?? null}, ${event.eventType}, ${event.severity},
         ${event.description}, ${event.ipAddress ?? null}, ${event.userId ?? null},
         ${event.userName ?? null}, ${event.metadata ? JSON.stringify(event.metadata) : null})
    `);
  } catch (err) {
    console.error("Security event write failed:", err);
  }
}

// ─── Login Attempt Logging ────────────────────────────────────────────────────
export async function logLoginAttempt(
  ip: string, username: string | null, companyId: number | null,
  success: boolean, userAgent: string | null
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO login_attempts (ip_address, username, company_id, success, user_agent)
      VALUES (${ip}, ${username}, ${companyId}, ${success}, ${userAgent})
    `);
  } catch (err) {
    console.error("Login attempt log failed:", err);
  }
}

export async function getRecentFailedAttempts(ip: string, windowMinutes = 15): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE ip_address = ${ip}
        AND success = false
        AND created_at > NOW() - INTERVAL '${sql.raw(windowMinutes.toString())} minutes'
    `);
    return Number((result.rows[0] as any)?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getFailedAttemptsForUser(username: string, windowMinutes = 15): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE username = ${username}
        AND success = false
        AND created_at > NOW() - INTERVAL '${sql.raw(windowMinutes.toString())} minutes'
    `);
    return Number((result.rows[0] as any)?.count ?? 0);
  } catch {
    return 0;
  }
}

// ─── Session / Device Tracking ────────────────────────────────────────────────
export async function trackSession(
  sessionId: string, userId: number | null, companyId: number | null,
  superAdminId: number | null, ip: string, userAgent: string
): Promise<void> {
  try {
    const device = parseDevice(userAgent);
    await db.execute(sql`
      INSERT INTO active_sessions (session_id, user_id, company_id, super_admin_id, ip_address, user_agent, device_name)
      VALUES (${sessionId}, ${userId}, ${companyId}, ${superAdminId}, ${ip}, ${userAgent}, ${device})
      ON CONFLICT (session_id) DO UPDATE SET last_active_at = NOW()
    `);
  } catch (err) {
    console.error("Session track failed:", err);
  }
}

export async function removeSession(sessionId: string): Promise<void> {
  try {
    await db.execute(sql`DELETE FROM active_sessions WHERE session_id = ${sessionId}`);
  } catch { }
}

// ─── Password Migration (startup) ─────────────────────────────────────────────
export async function migrateLegacyPasswords(): Promise<void> {
  try {
    // Find all employees with non-bcrypt hashes
    const result = await db.execute(sql`
      SELECT id, password_hash FROM employees
      WHERE password_hash NOT LIKE '$2%'
      LIMIT 500
    `);
    const rows = result.rows as { id: number; password_hash: string }[];
    if (rows.length === 0) { console.log("✓ All passwords are bcrypt-hashed"); return; }

    console.log(`Migrating ${rows.length} legacy password hashes to bcrypt...`);
    for (const row of rows) {
      // Wrap the existing SHA-256 hash with bcrypt
      const newHash = await bcrypt.hash(row.password_hash, BCRYPT_ROUNDS);
      await db.execute(sql`
        UPDATE employees SET password_hash = ${newHash} WHERE id = ${row.id}
      `);
    }
    console.log(`✓ Migrated ${rows.length} passwords to bcrypt`);

    // Also migrate super admin
    const saResult = await db.execute(sql`
      SELECT id, password_hash FROM super_admins
      WHERE password_hash NOT LIKE '$2%'
    `);
    for (const row of saResult.rows as { id: number; password_hash: string }[]) {
      const newHash = await bcrypt.hash((row as any).password_hash, BCRYPT_ROUNDS);
      await db.execute(sql`UPDATE super_admins SET password_hash = ${newHash} WHERE id = ${(row as any).id}`);
    }
    if (saResult.rows.length > 0) console.log("✓ Migrated super admin password to bcrypt");
  } catch (err) {
    console.error("Password migration error:", err);
  }
}
