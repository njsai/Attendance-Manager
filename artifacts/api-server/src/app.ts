import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import router from "./routes/index.js";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "attendance-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Auto-auth middleware: always inject the first admin user into the session
app.use(async (req, _res, next) => {
  if (!req.session.userId) {
    try {
      const [admin] = await db
        .select({ id: employeesTable.id, role: employeesTable.role })
        .from(employeesTable)
        .where(eq(employeesTable.isActive, true))
        .limit(1);
      if (admin) {
        req.session.userId = admin.id;
        req.session.role = admin.role;
      }
    } catch {
      // ignore — no users yet (first run)
    }
  }
  next();
});

app.use("/api", router);

export default app;
