import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "salt_attend_2024").digest("hex");
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.superAdminId) { next(); return; }
  if (!req.session?.userId || !req.session?.companyId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function requireCompanyAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || !req.session?.companyId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || !req.session?.companyId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (req.session.role !== "admin" && req.session.role !== "manager") {
    res.status(403).json({ message: "ممنوع - غير مصرح لك" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.superAdminId) {
    res.status(401).json({ message: "Unauthorized - Super Admin only" });
    return;
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
    companyId: number;
    superAdminId: number;
  }
}
