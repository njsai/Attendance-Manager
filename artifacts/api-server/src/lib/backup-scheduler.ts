import cron from "node-cron";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { mkdirSync, existsSync, writeFileSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { checkSubscriptionExpiry } from "../routes/subscriptions.js";

export const BACKUP_DIR = process.env.BACKUP_DIR || "/home/runner/workspace/data/backups";
const JSON_DIR = join(BACKUP_DIR, "json");
const SQL_DIR  = join(BACKUP_DIR, "sql");
const KEEP_DAYS = 30;

const TABLES = [
  "companies", "branches", "departments", "shifts",
  "employees", "attendance", "leaves", "company_location",
  "payroll", "payroll_logs", "leaves", "settings",
  "company_subscriptions", "payment_records", "subscription_plans",
];

// ─── JSON backup (per-company, legacy) ───────────────────────────────────────
export async function createBackupForCompany(companyId: number | null): Promise<{ filename: string; sizeBytes: number }> {
  if (!existsSync(JSON_DIR)) mkdirSync(JSON_DIR, { recursive: true });

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = companyId
    ? `backup_${companyId}_company_${dateStr}.json`
    : `backup_0_all_${dateStr}.json`;
  const filePath = join(JSON_DIR, filename);

  const backup: Record<string, any> = {
    _meta: { createdAt: new Date().toISOString(), companyId: companyId ?? "all", version: "1.2" },
  };

  for (const table of TABLES) {
    let whereClause = "";
    if (companyId !== null) {
      whereClause = table === "companies"
        ? `WHERE id = ${companyId}`
        : `WHERE company_id = ${companyId}`;
    }
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${table} ${whereClause}`));
      backup[table] = result.rows;
    } catch {
      backup[table] = [];
    }
  }

  writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf8");
  const stat = statSync(filePath);
  return { filename, sizeBytes: stat.size };
}

// ─── SQL backup using pg_dump ─────────────────────────────────────────────────
export async function createSqlDump(): Promise<{ filename: string; sizeBytes: number } | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[Backup] DATABASE_URL not set — skipping pg_dump");
    return null;
  }

  if (!existsSync(SQL_DIR)) mkdirSync(SQL_DIR, { recursive: true });

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup_full_${dateStr}.sql`;
  const filePath = join(SQL_DIR, filename);
  const gzPath   = `${filePath}.gz`;

  try {
    execSync(
      `pg_dump --no-password --format=plain --encoding=UTF8 --no-privileges --no-owner --clean --if-exists "${dbUrl}" | gzip > "${gzPath}"`,
      { stdio: ["ignore", "pipe", "pipe"], shell: true, timeout: 120_000 }
    );
    const stat = statSync(gzPath);
    console.log(`[Backup] pg_dump ✓ → ${filename}.gz (${(stat.size / 1024).toFixed(1)} KB)`);
    return { filename: `${filename}.gz`, sizeBytes: stat.size };
  } catch (err: any) {
    console.error("[Backup] pg_dump failed:", err.message);
    return null;
  }
}

// ─── Prune old files ──────────────────────────────────────────────────────────
function pruneOldBackups() {
  for (const dir of [JSON_DIR, SQL_DIR]) {
    if (!existsSync(dir)) continue;
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    const files = readdirSync(dir).filter(f => f.endsWith(".json") || f.endsWith(".gz"));
    let pruned = 0;
    for (const f of files) {
      const fp = join(dir, f);
      try {
        const { mtime } = statSync(fp);
        if (mtime.getTime() < cutoff) { unlinkSync(fp); pruned++; }
      } catch { /* skip */ }
    }
    if (pruned > 0) console.log(`[Backup] Pruned ${pruned} old backup(s) from ${dir}`);
  }
}

// ─── Main scheduler ───────────────────────────────────────────────────────────
export function startBackupScheduler() {
  // Daily at 02:00 AM (Asia/Baghdad)
  cron.schedule("0 2 * * *", async () => {
    console.log("[Backup] Starting scheduled daily backup…");
    try {
      // 1. Full SQL dump (pg_dump) — primary backup
      await createSqlDump();

      // 2. JSON per-company backups — secondary (human-readable)
      const companies = await db.select({ id: companiesTable.id, name: companiesTable.name }).from(companiesTable);
      let ok = 0;
      for (const company of companies) {
        try {
          const { filename, sizeBytes } = await createBackupForCompany(company.id);
          console.log(`[Backup] ✓ Company JSON: ${company.name} → ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`);
          ok++;
        } catch (err: any) {
          console.error(`[Backup] ✗ Company ${company.name}: ${err.message}`);
        }
      }

      pruneOldBackups();
      console.log(`[Backup] Done: ${ok}/${companies.length} companies, pg_dump complete`);
    } catch (err: any) {
      console.error("[Backup] Scheduler error:", err.message);
    }
  }, { timezone: "Asia/Baghdad" });

  console.log("[Backup] Scheduler started — daily at 02:00 AM (Asia/Baghdad)");

  // Subscription expiry check every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Subscription] Running expiry check...");
    await checkSubscriptionExpiry();
  });

  // Run subscription check once on startup
  setTimeout(() => checkSubscriptionExpiry().catch(console.error), 5000);
}
