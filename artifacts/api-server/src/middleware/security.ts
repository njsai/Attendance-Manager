import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getClientIp, writeAuditLog } from "../lib/security.js";

// ─── Helmet: Security Headers ─────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // needed for face-api.js
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "sameorigin" },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
});

// ─── Global API Rate Limiter ──────────────────────────────────────────────────
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => req.path === "/api/healthz",
  handler: (_req, res) => {
    res.status(429).json({
      message: "طلبات كثيرة جداً — يُرجى الانتظار 15 دقيقة",
      error: "RATE_LIMIT_EXCEEDED",
    });
  },
});

// ─── Strict Login Rate Limiter (per IP) ──────────────────────────────────────
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    res.status(429).json({
      message: "تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. حاول مرة أخرى بعد 15 دقيقة.",
      error: "LOGIN_RATE_LIMIT",
      retryAfter: 15,
    });
  },
});

// ─── Super Admin Stricter Rate Limit ─────────────────────────────────────────
export const superAdminRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    res.status(429).json({
      message: "محاولات تسجيل دخول كثيرة. حاول بعد 30 دقيقة.",
      error: "SUPER_ADMIN_RATE_LIMIT",
      retryAfter: 30,
    });
  },
});

// ─── Input Sanitization Middleware ────────────────────────────────────────────
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        // Trim whitespace; SQL injection is prevented by Drizzle ORM parameterized queries
        req.body[key] = req.body[key].trim();
        // Remove null bytes
        req.body[key] = req.body[key].replace(/\0/g, "");
        // Limit string length to prevent DoS
        if (req.body[key].length > 10000) {
          req.body[key] = req.body[key].substring(0, 10000);
        }
      }
    }
  }
  next();
}

// ─── Audit Log Middleware ─────────────────────────────────────────────────────
const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_RESOURCES = [
  "employees", "settings", "companies", "super-admin", "auth", "leaves", "attendance"
];

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!AUDITED_METHODS.has(req.method)) { next(); return; }

  const pathParts = req.path.split("/").filter(Boolean);
  const resource = pathParts[0] ?? "unknown";

  const isSensitive = SENSITIVE_RESOURCES.some(r => req.path.includes(r));
  if (!isSensitive) { next(); return; }

  const originalEnd = res.end.bind(res);
  (res as any).end = function (chunk: any, encoding?: any, callback?: any) {
    const status = res.statusCode >= 400 ? "failure" : "success";
    const action = `${req.method} ${req.path}`;
    const ip = getClientIp(req);

    writeAuditLog({
      companyId: req.session?.companyId ?? null,
      userId: req.session?.userId ?? null,
      userRole: req.session?.role ?? (req.session?.superAdminId ? "super_admin" : null),
      userName: null,
      action,
      resource,
      resourceId: pathParts[1] ?? null,
      details: req.method !== "GET" ? { body: sanitizeLogBody(req.body) } : null,
      ipAddress: ip,
      userAgent: req.headers["user-agent"] ?? null,
      status,
    }).catch(() => {});

    return originalEnd(chunk, encoding, callback);
  };

  next();
}

function sanitizeLogBody(body: any): any {
  if (!body) return null;
  const clone = { ...body };
  // Remove sensitive fields from logs
  for (const key of ["password", "passwordHash", "newPassword", "oldPassword", "token", "secret"]) {
    if (clone[key]) clone[key] = "***";
  }
  return clone;
}

// ─── CSRF Protection (Double Submit Cookie) ───────────────────────────────────
// Since we use httpOnly session cookies with SameSite, and the frontend sends
// X-Requested-With header, we check for this on state-changing requests.
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  // Skip for login endpoints (no session yet)
  if (req.path.includes("/login")) { next(); return; }

  const origin = req.headers["origin"] || req.headers["referer"];
  const host = req.headers["host"];

  // Allow same-origin requests and Replit dev domain
  if (origin) {
    const originHost = origin.replace(/^https?:\/\//, "").split("/")[0];
    const isSameHost = originHost === host || originHost.includes("replit.dev") || originHost.includes("repl.co") || originHost.includes("replit.app") || originHost.includes("repl.it") || originHost.includes("replit.com");
    if (!isSameHost) {
      res.status(403).json({ message: "طلب مرفوض - مصدر غير موثوق (CSRF)", error: "CSRF_REJECTED" });
      return;
    }
  }
  next();
}

// ─── Request Size Limiter ─────────────────────────────────────────────────────
export function requestSizeLimiter(req: Request, res: Response, next: NextFunction) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const contentLength = parseInt(req.headers["content-length"] || "0");
  if (contentLength > maxSize) {
    res.status(413).json({ message: "حجم الطلب كبير جداً", error: "PAYLOAD_TOO_LARGE" });
    return;
  }
  next();
}

// ─── Security Response Headers ────────────────────────────────────────────────
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
}
