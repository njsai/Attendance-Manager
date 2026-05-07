import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, shiftsTable, superAdminsTable, companiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { hashPassword, verifyPassword, requireCompanyAuth } from "../lib/auth.js";
import { hashPasswordBcrypt } from "../lib/security.js";
import {
  getClientIp, writeAuditLog, writeSecurityEvent,
  logLoginAttempt, getRecentFailedAttempts, getFailedAttemptsForUser,
  parseDevice, trackSession, removeSession,
} from "../lib/security.js";
import { loginRateLimit, superAdminRateLimit } from "../middleware/security.js";
import { isDbReachable } from "../lib/db-state.js";

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const IS_DEV = process.env.NODE_ENV !== "production";

const DEMO_EMPLOYEES: Record<string, { password: string; id: number; companyId: number; fullName: string; role: string; username: string; jobTitle: string }> = {
  admin:    { password: "admin123",    id: 1,  companyId: 1, fullName: "مدير الشركة",     role: "admin",    username: "admin",    jobTitle: "مدير عام" },
  manager1: { password: "manager123", id: 2,  companyId: 1, fullName: "محمد العمري",     role: "manager",  username: "manager1", jobTitle: "مشرف قسم" },
  emp1:     { password: "emp123",     id: 15, companyId: 1, fullName: "علي حسين",        role: "employee", username: "emp1",     jobTitle: "موظف" },
};

const DEMO_SUPER_ADMINS: Record<string, { password: string; id: number; username: string; fullName: string; email: string }> = {
  superadmin: { password: "superadmin123", id: 1, username: "superadmin", fullName: "مدير النظام العام", email: "superadmin@system.local" },
};

// ─── Public: Lookup company by code ──────────────────────────────────────────
// GET /api/auth/company-lookup?code=XXXX-1234
router.get("/company-lookup", async (req, res) => {
  try {
    const code = String(req.query.code ?? "").trim().toUpperCase();
    if (!code || code.length < 4) {
      res.status(400).json({ message: "كود الشركة مطلوب" });
      return;
    }
    const [company] = await db
      .select({ id: companiesTable.id, name: companiesTable.name, isActive: companiesTable.isActive, companyCode: companiesTable.companyCode })
      .from(companiesTable)
      .where(eq(companiesTable.companyCode, code));

    if (!company) {
      res.status(404).json({ message: "كود الشركة غير صحيح" });
      return;
    }
    if (!company.isActive) {
      res.status(403).json({ message: "الشركة موقوفة، تواصل مع مزود الخدمة" });
      return;
    }
    res.json({ id: company.id, name: company.name, companyCode: company.companyCode });
  } catch (err) {
    console.error("Company lookup error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Company employee login ───────────────────────────────────────────────────
router.post("/login", loginRateLimit, async (req, res) => {
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] ?? "";
  const { username, password, companyCode } = req.body;

  try {
    if (!username || !password) {
      res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      return;
    }

    // ── Demo mode fallback: ONLY when DB is unavailable in dev ───────────
    if (IS_DEV && !(await isDbReachable())) {
      const demo = DEMO_EMPLOYEES[username.trim().toLowerCase()];
      if (demo && demo.password === password) {
        req.session.userId = demo.id;
        req.session.role = demo.role as any;
        req.session.companyId = demo.companyId;
        req.session.loginIp = ip;
        req.session.deviceInfo = parseDevice(ua);
        delete (req.session as any).superAdminId;
        await new Promise<void>((resolve) => req.session.save(() => resolve()));
        res.json({
          employee: { id: demo.id, companyId: demo.companyId, username: demo.username, fullName: demo.fullName, role: demo.role, jobTitle: demo.jobTitle, isActive: true },
          message: "تم تسجيل الدخول بنجاح (وضع تجريبي)",
        });
        return;
      }
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    // ── IP-level brute force check ─────────────────────────────────────────
    const recentIpFails = await getRecentFailedAttempts(ip, 15);
    if (recentIpFails >= 20) {
      await writeSecurityEvent({
        eventType: "ip_brute_force",
        severity: "high",
        description: `IP ${ip} محظور بسبب محاولات تسجيل دخول متكررة (${recentIpFails} محاولة)`,
        ipAddress: ip,
        metadata: { username, attempts: recentIpFails },
      });
      res.status(429).json({ message: "تم حظر هذا الـ IP مؤقتاً. حاول بعد 15 دقيقة.", error: "IP_BLOCKED" });
      return;
    }

    // ── Find all employees with matching username across all companies ──────────
    // Multi-tenant: same username can exist in multiple companies.
    // We verify the password against each match and log in the first valid one.
    const candidates = await db
      .select({
        id: employeesTable.id,
        companyId: employeesTable.companyId,
        username: employeesTable.username,
        passwordHash: employeesTable.passwordHash,
        fullName: employeesTable.fullName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        address: employeesTable.address,
        role: employeesTable.role,
        departmentId: employeesTable.departmentId,
        shiftId: employeesTable.shiftId,
        branchId: employeesTable.branchId,
        jobTitle: employeesTable.jobTitle,
        salary: employeesTable.salary,
        isActive: employeesTable.isActive,
        createdAt: employeesTable.createdAt,
        preferredTheme: employeesTable.preferredTheme,
        preferredLang: employeesTable.preferredLang,
        failedLoginAttempts: sql<number>`COALESCE(${employeesTable.failedLoginAttempts}, 0)`,
        lockedUntil: employeesTable.lockedUntil,
        departmentName: departmentsTable.name,
        shiftName: shiftsTable.name,
        shiftStart: shiftsTable.startTime,
        shiftEnd: shiftsTable.endTime,
        companyIsActive: companiesTable.isActive,
        companyCode: companiesTable.companyCode,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(eq(employeesTable.username, username.trim().toLowerCase()));

    if (candidates.length === 0) {
      await logLoginAttempt(ip, username, null, false, ua);
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    // Find the candidate whose password matches
    let employee: typeof candidates[0] | null = null;
    for (const c of candidates) {
      const match = await verifyPassword(password, c.passwordHash);
      if (match) { employee = c; break; }
    }

    if (!employee) {
      // Increment failed attempts on all candidates with this username
      for (const c of candidates) {
        const newAttempts = (Number(c.failedLoginAttempts) || 0) + 1;
        const lockUntil = newAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
        await db.execute(sql`
          UPDATE employees SET failed_login_attempts = ${newAttempts}, locked_until = ${lockUntil}
          WHERE id = ${c.id}
        `);
      }
      await logLoginAttempt(ip, username, null, false, ua);
      const remaining = MAX_FAILED_ATTEMPTS - ((Number(candidates[0].failedLoginAttempts) || 0) + 1);
      if (remaining <= 0) {
        res.status(423).json({ message: `تم قفل الحساب بعد ${MAX_FAILED_ATTEMPTS} محاولات فاشلة. حاول بعد ${LOCKOUT_MINUTES} دقيقة.`, error: "ACCOUNT_LOCKED" });
      } else {
        res.status(401).json({ message: `اسم المستخدم أو كلمة المرور غير صحيحة. تبقى ${remaining} محاولة قبل قفل الحساب.` });
      }
      return;
    }

    // Check company status
    if (employee.companyIsActive === false) {
      res.status(403).json({ message: "الشركة موقوفة، تواصل مع مزود الخدمة" });
      return;
    }
    if (!employee.isActive) {
      res.status(401).json({ message: "الحساب غير مفعّل، تواصل مع المدير" });
      return;
    }

    // Check account lockout
    if (employee.lockedUntil && new Date(employee.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(employee.lockedUntil).getTime() - Date.now()) / 60000);
      res.status(423).json({
        message: `الحساب مقفل بسبب محاولات متكررة. حاول بعد ${remaining} دقيقة.`,
        error: "ACCOUNT_LOCKED",
        retryAfter: remaining,
      });
      return;
    }

    // Verify password
    const valid = await verifyPassword(password, employee.passwordHash);
    if (!valid) {
      const newAttempts = (Number(employee.failedLoginAttempts) || 0) + 1;
      const lockUntil = newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await db.execute(sql`
        UPDATE employees SET
          failed_login_attempts = ${newAttempts},
          locked_until = ${lockUntil}
        WHERE id = ${employee.id}
      `);

      await logLoginAttempt(ip, username, employee.companyId, false, ua);

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        await writeSecurityEvent({
          companyId: employee.companyId,
          eventType: "account_locked",
          severity: "high",
          description: `تم قفل حساب "${employee.fullName}" بعد ${newAttempts} محاولات فاشلة`,
          ipAddress: ip,
          userId: employee.id,
          userName: employee.fullName,
          metadata: { username, attempts: newAttempts },
        });
        res.status(423).json({
          message: `تم قفل الحساب بعد ${MAX_FAILED_ATTEMPTS} محاولات فاشلة. حاول بعد ${LOCKOUT_MINUTES} دقيقة.`,
          error: "ACCOUNT_LOCKED",
        });
        return;
      }

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      res.status(401).json({
        message: `اسم المستخدم أو كلمة المرور غير صحيحة. تبقى ${remaining} محاولة قبل قفل الحساب.`,
      });
      return;
    }

    // ✅ Valid login
    await db.execute(sql`
      UPDATE employees SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        last_login_ip = ${ip}
      WHERE id = ${employee.id}
    `);

    if (!employee.passwordHash.startsWith("$2")) {
      const newHash = await hashPasswordBcrypt(password);
      await db.execute(sql`UPDATE employees SET password_hash = ${newHash} WHERE id = ${employee.id}`);
    }

    await logLoginAttempt(ip, username, employee.companyId, true, ua);

    req.session.userId = employee.id;
    req.session.role = employee.role;
    req.session.companyId = employee.companyId;
    req.session.loginIp = ip;
    req.session.deviceInfo = parseDevice(ua);
    delete (req.session as any).superAdminId;

    req.session.save(async (err) => {
      if (err) { res.status(500).json({ message: "خطأ في حفظ الجلسة" }); return; }

      await trackSession(req.sessionID, employee.id, employee.companyId, null, ip, ua);
      await writeAuditLog({
        companyId: employee.companyId,
        userId: employee.id,
        userRole: employee.role,
        userName: employee.fullName,
        action: "LOGIN",
        resource: "auth",
        ipAddress: ip,
        userAgent: ua,
        status: "success",
      });

      const { passwordHash: _, companyIsActive: __, failedLoginAttempts: ___, lockedUntil: ____, ...data } = employee;
      res.json({ employee: data, message: "تم تسجيل الدخول بنجاح" });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Super admin login ────────────────────────────────────────────────────────
router.post("/super-admin/login", superAdminRateLimit, async (req, res) => {
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] ?? "";
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "البيانات مطلوبة" });
      return;
    }

    if (IS_DEV && !(await isDbReachable())) {
      const demo = DEMO_SUPER_ADMINS[username.trim().toLowerCase()];
      if (demo && demo.password === password) {
        req.session.superAdminId = demo.id;
        req.session.loginIp = ip;
        req.session.deviceInfo = parseDevice(ua);
        delete (req.session as any).userId;
        delete (req.session as any).companyId;
        delete (req.session as any).role;
        await new Promise<void>((resolve) => req.session.save(() => resolve()));
        res.json({
          superAdmin: { id: demo.id, username: demo.username ?? username.trim(), fullName: demo.fullName, email: demo.email },
          message: "مرحباً بك في لوحة التحكم الرئيسية (وضع تجريبي)",
        });
        return;
      }
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      return;
    }

    const recentFails = await getRecentFailedAttempts(ip, 30);
    if (recentFails >= 5) {
      await writeSecurityEvent({
        eventType: "super_admin_brute_force",
        severity: "critical",
        description: `محاولة اختراق على لوحة السوبر ادمن من IP ${ip} (${recentFails} محاولة)`,
        ipAddress: ip,
        metadata: { username, attempts: recentFails },
      });
      res.status(429).json({ message: "تم حظر هذا الـ IP. حاول بعد 30 دقيقة.", error: "IP_BLOCKED" });
      return;
    }

    const [sa] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.username, username.trim()));

    if (!sa) {
      await logLoginAttempt(ip, username, null, false, ua);
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      return;
    }

    const valid = await verifyPassword(password, sa.passwordHash);
    if (!valid) {
      await logLoginAttempt(ip, username, null, false, ua);
      await writeSecurityEvent({
        eventType: "super_admin_failed_login",
        severity: "critical",
        description: `محاولة دخول فاشلة على حساب السوبر ادمن "${username}" من IP ${ip}`,
        ipAddress: ip,
        metadata: { username },
      });
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      return;
    }

    if (!sa.passwordHash.startsWith("$2")) {
      const newHash = await hashPasswordBcrypt(password);
      await db.execute(sql`UPDATE super_admins SET password_hash = ${newHash} WHERE id = ${sa.id}`);
    }

    await logLoginAttempt(ip, username, null, true, ua);

    req.session.superAdminId = sa.id;
    req.session.loginIp = ip;
    req.session.deviceInfo = parseDevice(ua);
    delete (req.session as any).userId;
    delete (req.session as any).companyId;
    delete (req.session as any).role;

    req.session.save(async (err) => {
      if (err) { res.status(500).json({ message: "خطأ في حفظ الجلسة" }); return; }
      await trackSession(req.sessionID, null, null, sa.id, ip, ua);
      await writeAuditLog({
        userId: sa.id,
        userRole: "super_admin",
        userName: sa.fullName,
        action: "SUPER_ADMIN_LOGIN",
        resource: "auth",
        ipAddress: ip,
        userAgent: ua,
        status: "success",
      });
      const { passwordHash: _, ...data } = sa;
      res.json({ superAdmin: data, message: "مرحباً بك في لوحة التحكم الرئيسية" });
    });
  } catch (err) {
    console.error("Super admin login error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] ?? "";
  const sessionId = req.sessionID;
  const userId = req.session?.userId;
  const companyId = req.session?.companyId;
  const role = req.session?.role ?? (req.session?.superAdminId ? "super_admin" : null);

  await removeSession(sessionId);

  req.session.destroy(async (err) => {
    if (err) console.error("Logout error:", err);
    res.clearCookie("attend.sid");
    await writeAuditLog({
      companyId: companyId ?? null,
      userId: userId ?? null,
      userRole: role,
      action: "LOGOUT",
      resource: "auth",
      ipAddress: ip,
      userAgent: ua,
      status: "success",
    });
    res.json({ message: "تم تسجيل الخروج" });
  });
});

// ─── Change password ──────────────────────────────────────────────────────────
router.post("/change-password", requireCompanyAuth, async (req, res) => {
  const ip = getClientIp(req);
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: "جميع الحقول مطلوبة" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      return;
    }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword) && newPassword.length < 10) {
      res.status(400).json({ message: "كلمة المرور ضعيفة — استخدم حروفاً وأرقاماً أو زد طولها لـ 10 أحرف على الأقل" });
      return;
    }

    const [emp] = await db
      .select({ id: employeesTable.id, passwordHash: employeesTable.passwordHash, fullName: employeesTable.fullName })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, req.session.userId!), eq(employeesTable.companyId, req.session.companyId!)));

    if (!emp) { res.status(404).json({ message: "الموظف غير موجود" }); return; }

    const valid = await verifyPassword(oldPassword, emp.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      return;
    }

    const newHash = await hashPasswordBcrypt(newPassword);
    await db.execute(sql`
      UPDATE employees SET
        password_hash = ${newHash},
        password_changed_at = NOW(),
        failed_login_attempts = 0,
        locked_until = NULL
      WHERE id = ${emp.id}
    `);

    await writeAuditLog({
      companyId: req.session.companyId,
      userId: req.session.userId,
      userRole: req.session.role,
      userName: emp.fullName,
      action: "CHANGE_PASSWORD",
      resource: "auth",
      ipAddress: ip,
      userAgent: req.headers["user-agent"] ?? null,
      status: "success",
    });

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Who am I? ────────────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    if (req.session?.superAdminId) {
      const dbOk = IS_DEV ? await isDbReachable() : true;
      if (dbOk) {
        const [sa] = await db.select().from(superAdminsTable)
          .where(eq(superAdminsTable.id, req.session.superAdminId));
        if (!sa) { res.status(401).json({ message: "Unauthorized" }); return; }
        const { passwordHash: _, ...data } = sa;
        res.json({ ...data, role: "super_admin" });
        return;
      }
      const demoSa = Object.values(DEMO_SUPER_ADMINS).find(s => s.id === req.session.superAdminId);
      if (demoSa) {
        res.json({ id: demoSa.id, username: demoSa.username, fullName: demoSa.fullName, email: demoSa.email, role: "super_admin" });
        return;
      }
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.session?.userId || !req.session?.companyId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const dbOk = IS_DEV ? await isDbReachable() : true;
    if (!dbOk) {
      const demoEmp = Object.values(DEMO_EMPLOYEES).find(e => e.id === req.session.userId && e.companyId === req.session.companyId);
      if (demoEmp) {
        res.json({ id: demoEmp.id, companyId: demoEmp.companyId, username: demoEmp.username, fullName: demoEmp.fullName, role: demoEmp.role, jobTitle: demoEmp.jobTitle, isActive: true, hasFace: false });
        return;
      }
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const [employee] = await db
      .select({
        id: employeesTable.id,
        companyId: employeesTable.companyId,
        username: employeesTable.username,
        fullName: employeesTable.fullName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        address: employeesTable.address,
        role: employeesTable.role,
        departmentId: employeesTable.departmentId,
        shiftId: employeesTable.shiftId,
        branchId: employeesTable.branchId,
        jobTitle: employeesTable.jobTitle,
        salary: employeesTable.salary,
        isActive: employeesTable.isActive,
        hasFace: employeesTable.faceDescriptor,
        preferredTheme: employeesTable.preferredTheme,
        preferredLang: employeesTable.preferredLang,
        createdAt: employeesTable.createdAt,
        departmentName: departmentsTable.name,
        shiftName: shiftsTable.name,
        shiftStart: shiftsTable.startTime,
        shiftEnd: shiftsTable.endTime,
        companyIsActive: companiesTable.isActive,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(shiftsTable, eq(employeesTable.shiftId, shiftsTable.id))
      .leftJoin(companiesTable, eq(employeesTable.companyId, companiesTable.id))
      .where(and(
        eq(employeesTable.id, req.session.userId!),
        eq(employeesTable.companyId, req.session.companyId!)
      ));

    if (!employee) { req.session.destroy(() => {}); res.status(401).json({ message: "Unauthorized" }); return; }
    if (employee.companyIsActive === false) { req.session.destroy(() => {}); res.status(403).json({ message: "company_inactive" }); return; }
    if (!employee.isActive) { req.session.destroy(() => {}); res.status(401).json({ message: "Unauthorized" }); return; }

    const { companyIsActive: _, ...empData } = employee;
    res.json({ ...empData, hasFace: !!employee.hasFace });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── Unlock account (admin only) ─────────────────────────────────────────────
router.post("/unlock/:employeeId", async (req, res) => {
  if (!req.session?.userId || req.session.role !== "admin") {
    res.status(403).json({ message: "غير مصرح" });
    return;
  }
  try {
    const empId = parseInt(req.params.employeeId);
    await db.execute(sql`
      UPDATE employees SET failed_login_attempts = 0, locked_until = NULL
      WHERE id = ${empId} AND company_id = ${req.session.companyId}
    `);
    await writeAuditLog({
      companyId: req.session.companyId,
      userId: req.session.userId,
      userRole: req.session.role,
      action: "UNLOCK_ACCOUNT",
      resource: "employees",
      resourceId: String(empId),
      ipAddress: getClientIp(req),
      status: "success",
    });
    res.json({ message: "تم فتح قفل الحساب" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
