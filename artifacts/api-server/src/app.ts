import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index.js";
import {
  helmetMiddleware,
  globalRateLimit,
  sanitizeBody,
  auditMiddleware,
  csrfProtection,
  securityHeaders,
  requestSizeLimiter,
} from "./middleware/security.js";
import { migrateLegacyPasswords } from "./lib/security.js";
import { isDbReachable } from "./lib/db-state.js";
import { pool } from "@workspace/db";

const app: Express = express();

// Trust the Replit proxy
app.set("trust proxy", 1);

// ─── Response Compression (gzip/brotli) ──────────────────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(securityHeaders);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(requestSizeLimiter);
// Default 15MB to accommodate base64-encoded Knowledge Center uploads (10MB raw
// file → ~13.4MB base64). All routes enforce their own payload limits via the
// requestSizeLimiter middleware and per-route validation.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(sanitizeBody);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use("/api", globalRateLimit);

// ─── Session ─────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET && isProduction) {
  console.warn("⚠ SESSION_SECRET not set — using fallback. Set a strong secret in production!");
}

const PgSession = connectPgSimple(session);

// In development, fall back to MemoryStore if DB is unreachable.
// In production, always use PgSession (DB must be available).
async function buildSessionStore() {
  if (isProduction) {
    return new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
    });
  }
  // Dev: probe DB with short timeout — use MemoryStore if unavailable
  try {
    const client = await pool.connect();
    client.release();
    console.log("[Session] DB reachable — using PgSession store");
    return new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
    });
  } catch {
    console.warn("[Session] DB unreachable — using MemoryStore (dev only)");
    return new session.MemoryStore();
  }
}

const sessionStore = await buildSessionStore();

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET || "attend-sec-key-must-change-in-prod-2024!",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "attend.sid",
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    },
  })
);

// ─── CSRF Protection ──────────────────────────────────────────────────────────
app.use("/api", csrfProtection);

// ─── Audit Logging ────────────────────────────────────────────────────────────
app.use("/api", auditMiddleware);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), secure: true });
});

// ─── Dev Fast-Fail: return instant empty responses when DB is unavailable ─────
// In dev, all data routes return immediately ([] or {}) instead of hanging 8s
if (!isProduction) {
  app.use("/api", async (req, res, next) => {
    // Auth routes handle their own DB fallback (demo accounts)
    if (req.path.startsWith("/auth")) { next(); return; }
    // Super-admin routes have no demo mode — let them fail fast
    const dbOk = await isDbReachable();
    if (dbOk) { next(); return; }
    // DB is unavailable — return instant empty response
    if (req.method === "GET") {
      // Object-shaped endpoints
      const p = req.path;
      const isObj =
        p.includes("/dashboard") || p.includes("/stats") || p.includes("/summary") ||
        p.includes("/today") || p.includes("/my-stats") || p.includes("/balance") ||
        p.includes("/settings") || p.includes("/location") || p.includes("/company") ||
        p.includes("/profile") || p.includes("/reports/");
      res.json(isObj ? {} : []);
    } else {
      res.status(503).json({
        message: "قاعدة البيانات غير متاحة في وضع التطوير — هذه العملية تتطلب الاتصال بقاعدة البيانات",
        demo: true,
      });
    }
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err?.message ?? err);
  // Never leak stack traces or internal details
  res.status(err?.status ?? 500).json({ message: "خطأ في الخادم الداخلي" });
});

// ─── Startup: migrate legacy passwords to bcrypt ──────────────────────────────
migrateLegacyPasswords().catch(console.error);

export default app;
