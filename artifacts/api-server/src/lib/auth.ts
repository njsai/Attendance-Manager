import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "salt_attend_2024").digest("hex");
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (req.session.role !== "admin" && req.session.role !== "manager") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
  }
}
