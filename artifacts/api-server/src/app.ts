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

const app: Express = express();
const PgSession = connectPgSimple(session);

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
app.use(express.json({ limit: "5mb" }));
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

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15,
    }),
    secret: SESSION_SECRET || "attend-sec-key-must-change-in-prod-2024!",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "attend.sid",
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (session expiration)
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
