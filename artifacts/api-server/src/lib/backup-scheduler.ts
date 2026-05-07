import cron from "node-cron";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { mkdirSync, existsSync, writeFileSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { checkSubscriptionExpiry } from "../routes/subscriptions.js";

export const BACKUP_DIR = process.env.BACKUP_DIR || "/home/runner/workspace/data/backups";
const KEEP_DAYS = 30;

const TABLES = [
  "companies", "branches", "departments", "shifts",
  "employees", "attendance", "leaves", "company_location",
];

export async function createBackupForCompany(companyId: number | null): Promise<{ filename: string; sizeBytes: number }> {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = companyId
    ? `backup_${companyId}_company_${dateStr}.json`
    : `backup_0_all_${dateStr}.json`;
  const filePath = join(BACKUP_DIR, filename);

  const backup: Record<string, any> = {
    _meta: { createdAt: new Date().toISOString(), companyId: companyId ?? "all", version: "1.1" },
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

function pruneOldBackups() {
  if (!existsSync(BACKUP_DIR)) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json"));
  let pruned = 0;
  for (const f of files) {
    const fp = join(BACKUP_DIR, f);
    try {
      const { mtime } = statSync(fp);
      if (mtime.getTime() < cutoff) { unlinkSync(fp); pruned++; }
    } catch { /* skip */ }
  }
  if (pruned > 0) console.log(`[Backup] Pruned ${pruned} old backup(s)`);
}

export function startBackupScheduler() {
  // Daily at 02:00 AM server time — backs up ALL companies
  cron.schedule("0 2 * * *", async () => {
    console.log("[Backup] Starting scheduled daily backup…");
    try {
      const companies = await db.select({ id: companiesTable.id, name: companiesTable.name }).from(companiesTable);
      let ok = 0;
      for (const company of companies) {
        try {
          const { filename, sizeBytes } = await createBackupForCompany(company.id);
          console.log(`[Backup] ✓ Company ${company.name} → ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`);
          ok++;
        } catch (err: any) {
          console.error(`[Backup] ✗ Company ${company.name}: ${err.message}`);
        }
      }
      // Also create a full-system backup
      const { filename } = await createBackupForCompany(null);
      console.log(`[Backup] ✓ Full system backup → ${filename}`);
      pruneOldBackups();
      console.log(`[Backup] Done: ${ok}/${companies.length} companies backed up`);
    } catch (err: any) {
      console.error("[Backup] Scheduler error:", err.message);
    }
  }, { timezone: "Asia/Riyadh" });

  console.log("[Backup] Scheduler started — daily at 02:00 AM (Asia/Riyadh)");

  // ── Subscription expiry check every 6 hours ──────────────────────────────
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Subscription] Running expiry check...");
    await checkSubscriptionExpiry();
  });

  // Run once immediately on startup
  setTimeout(() => checkSubscriptionExpiry().catch(console.error), 5000);
}
