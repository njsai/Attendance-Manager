/**
 * migration-runner.ts
 * Tracks and applies SQL migrations from ./migrations/*.sql
 * Uses schema_migrations table to record applied migrations.
 * Safe to run multiple times — idempotent.
 */
import { pool } from "@workspace/db";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function runSql(client: any, sql: string): Promise<void> {
  await client.query(sql);
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Ensure the tracking table exists
    await runSql(client, `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        checksum    TEXT,
        duration_ms INTEGER
      )
    `);

    // 2. Load migration files sorted alphabetically
    let files: string[] = [];
    try {
      files = readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith(".sql"))
        .sort();
    } catch {
      console.log("[Migrations] No migrations directory found — skipping");
      return;
    }

    if (files.length === 0) {
      console.log("[Migrations] No migration files found");
      return;
    }

    // 3. Fetch already-applied migrations
    const { rows: applied } = await client.query(
      `SELECT filename FROM schema_migrations`
    );
    const appliedSet = new Set(applied.map((r: any) => r.filename));

    let newCount = 0;

    for (const filename of files) {
      if (appliedSet.has(filename)) {
        continue; // already applied — skip silently
      }

      const filePath = join(MIGRATIONS_DIR, filename);
      const sql = readFileSync(filePath, "utf8");
      const checksum = sha256(sql);
      const start = Date.now();

      try {
        await client.query("BEGIN");
        await runSql(client, sql);
        const duration = Date.now() - start;

        await client.query(
          `INSERT INTO schema_migrations (filename, checksum, duration_ms)
           VALUES ($1, $2, $3)
           ON CONFLICT (filename) DO NOTHING`,
          [filename, checksum, duration]
        );

        await client.query("COMMIT");
        console.log(`[Migrations] ✓ Applied: ${filename} (${duration}ms)`);
        newCount++;
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error(`[Migrations] ✗ Failed: ${filename} — ${err.message}`);
        throw err; // halt on first failure
      }
    }

    if (newCount === 0) {
      console.log(`[Migrations] All ${files.length} migration(s) already applied ✓`);
    } else {
      console.log(`[Migrations] Applied ${newCount} new migration(s) ✓`);
    }
  } finally {
    client.release();
  }
}

/**
 * Mark all existing migration files as already applied
 * without re-running them. Used when the schema already exists.
 */
export async function markAllApplied(): Promise<void> {
  const client = await pool.connect();
  try {
    await runSql(client, `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        checksum    TEXT,
        duration_ms INTEGER
      )
    `);

    let files: string[] = [];
    try {
      files = readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith(".sql"))
        .sort();
    } catch {
      return;
    }

    for (const filename of files) {
      const filePath = join(MIGRATIONS_DIR, filename);
      const sql = readFileSync(filePath, "utf8");
      const checksum = sha256(sql);

      await client.query(
        `INSERT INTO schema_migrations (filename, checksum, duration_ms)
         VALUES ($1, $2, 0)
         ON CONFLICT (filename) DO NOTHING`,
        [filename, checksum]
      );
    }

    console.log(`[Migrations] Marked ${files.length} migration(s) as applied (schema pre-exists) ✓`);
  } finally {
    client.release();
  }
}
