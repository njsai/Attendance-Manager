import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const IS_DEV = process.env.NODE_ENV !== "production";

// Singleton DB reachability state — probed once, cached forever per process
let _dbAvailable: boolean | null = null;
let _probing = false;

export function getDbAvailable(): boolean | null {
  return _dbAvailable;
}

export async function isDbReachable(): Promise<boolean> {
  // In production always assume DB is available
  if (!IS_DEV) return true;
  // Cached result — return immediately
  if (_dbAvailable === false) return false;
  if (_dbAvailable === true) return true;
  // If already probing, wait for it
  if (_probing) {
    await new Promise(r => setTimeout(r, 200));
    return _dbAvailable ?? false;
  }
  _probing = true;
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("db-probe-timeout")), 1500)
      ),
    ]);
    _dbAvailable = true;
    console.log("[DB-State] Database reachable");
    return true;
  } catch {
    _dbAvailable = false;
    console.warn("[DB-State] Database unreachable — all data routes will return empty responses (dev mode)");
    return false;
  } finally {
    _probing = false;
  }
}

// Probe immediately at module load (non-blocking)
isDbReachable().catch(() => {});
