import app from "./app";
import { startBackupScheduler } from "./lib/backup-scheduler.js";
import { initializeDatabase } from "./lib/db-init.js";

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
  // Initialize DB schema + seed data (idempotent, safe to run every startup)
  initializeDatabase().catch((err) => {
    console.error("[DB-Init] Failed:", err.message);
  });
});
