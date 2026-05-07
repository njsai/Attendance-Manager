import app from "./app";
import { startBackupScheduler } from "./lib/backup-scheduler.js";
import { initializeDatabase } from "./lib/db-init.js";
import { runMigrations } from "./lib/migration-runner.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception - server continues:", err.message, err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection - server continues:", reason);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startBackupScheduler();

  // 1. Apply any pending SQL migrations (idempotent, tracked in schema_migrations)
  runMigrations()
    .then(() => {
      // 2. db-init: CREATE TABLE IF NOT EXISTS + seed data (backward compat)
      return initializeDatabase();
    })
    .catch((err) => {
      console.error("[Startup] DB init failed:", err.message);
    });
});
