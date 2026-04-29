import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index.js";

const app: Express = express();
const PgSession = connectPgSimple(session);

// Trust the Replit proxy (needed for correct cookie/session handling via HTTPS proxy)
app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15, // prune every 15 minutes
    }),
    secret: process.env.SESSION_SECRET || "attendance-secret-key-2024-prod",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "attend.sid",
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    },
  })
);

// Health check before auth
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "خطأ في الخادم" });
});

export default app;
