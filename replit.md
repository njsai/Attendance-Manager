# نظام إدارة الحضور والانصراف — SaaS متعدد الشركات

نظام SaaS لإدارة الحضور والانصراف متعدد الشركات مع أمان متقدم ونسخ احتياطي تلقائي.

## Run & Operate
- API Server: `pnpm --filter @workspace/api-server run dev` (port 8080)
- Frontend: `pnpm --filter @workspace/attendance-system run dev` (port 24620)
- DB push: `pnpm --filter @workspace/db run push` — **تجنّب** push لأنه يحذف جداول الأمان؛ استخدم SQL مباشراً
- Typecheck: `pnpm run typecheck`
- **Required env**: `DATABASE_URL`, `SESSION_SECRET` (اختياري لكن مطلوب في prod)
- **Backup dir**: `/home/runner/workspace/data/backups` (دائم)

## Stack
- **Runtime**: Node.js 24, TypeScript 5.9
- **API**: Express 5 + compression + express-session + connect-pg-simple
- **DB**: PostgreSQL + Drizzle ORM + مؤشرات أداء على company_id/employee_id/date
- **Security**: bcrypt (12 rounds), Helmet.js, express-rate-limit, CSRF, audit_logs
- **Frontend**: React + Vite + TailwindCSS v4 + Wouter + TanStack Query + React.lazy
- **Backup**: node-cron — يومياً 02:00 AM (Asia/Riyadh) — يحتفظ بـ 30 يوم

## Where Things Live
- DB Schema: `lib/db/src/schema/`
- API Routes: `artifacts/api-server/src/routes/`
- Backup Scheduler: `artifacts/api-server/src/lib/backup-scheduler.ts`
- Security middleware: `artifacts/api-server/src/middleware/security.ts`
- i18n (AR/EN): `artifacts/attendance-system/src/lib/i18n.tsx`
- Theme (dark/light): `artifacts/attendance-system/src/lib/theme.tsx`
- Frontend pages: `artifacts/attendance-system/src/pages/`
- Super Admin: `artifacts/attendance-system/src/pages/super-admin/`

## Architecture Decisions
- **Multi-tenant**: كل الجداول تحتوي `company_id` — عزل كامل بين الشركات
- **Dual session**: `superAdminId` للسوبر ادمن / `userId+companyId+role` للموظفين
- **Password hashing**: `bcrypt(sha256(password), 12)` — هجرة تلقائية من SHA-256 عند بدء السيرفر
- **Brute force**: قفل الحساب بعد 5 محاولات / حظر IP بعد 20 محاولة
- **Location mode**: `attendance_location_mode` في جدول companies — قابل للتفعيل/الإيقاف لكل شركة
- **GPS per branch**: latitude/longitude/radius_meters على كل فرع — التحقق من موقع الموظف عند الفرع
- **Backup**: JSON export لكل الجداول — يومي تلقائي + يدوي من لوحة السوبر ادمن
- **Compression**: gzip level=6 لجميع الاستجابات > 1KB — أداء أفضل

## Product
- **السوبر ادمن**: إدارة الشركات + نسخ احتياطية + دردشة الدعم + مركز الأمان
- **مدير الشركة**: إدارة الموظفين/الفروع/الأقسام/الشفتات + تقارير CSV + إعدادات الموقع + وضع داكن/فاتح
- **المشرف/الموظف**: تسجيل حضور (GPS اختياري)، إجازات، دردشة داخلية

## الحسابات التجريبية
- **سوبر ادمن**: superadmin / superadmin123 → /super-admin/login
- **مدير شركة**: admin / admin123 → /login (companyId=2)
- **مشرف**: manager1 / manager123
- **موظف**: emp1 / emp123 (employeeId=15)

## Security Features
| الميزة | التفاصيل |
|--------|----------|
| Password Hashing | bcrypt rounds=12 (هجرة تلقائية من SHA-256) |
| Account Lockout | قفل بعد 5 محاولات فاشلة لمدة 15 دقيقة |
| IP Rate Limiting | 500 req/15min عام، 10 login/15min، 5 super-admin/30min |
| Security Headers | Helmet: HSTS, CSP, X-Frame, X-XSS, nosniff |
| CSRF Protection | SameSite cookie + Origin/Referer validation |
| Input Sanitization | Trim + null-byte removal + 10KB limit |
| SQL Injection | Drizzle ORM (parameterized queries فقط) |
| Audit Logs | كل POST/PUT/DELETE مع IP + user + status |
| Tenant Isolation | company_id على كل الجداول + middleware validation |

## DB Indexes (Performance)
- `idx_attendance_employee_date` — أبطأ استعلام؛ أهم index
- `idx_employees_company_active` — فلترة الموظفين النشطين
- `idx_leaves_employee_id`, `idx_branches_company_id`, `idx_departments_company_id`

## Gotchas
- لا تستخدم `drizzle push` — يحذف جداول الأمان. استخدم `ALTER TABLE` مباشراً
- Sessions expire after 8 hours (rolling)
- CSRF check يتجاوز `/login` endpoints (لا session بعد)
- `trust proxy: 1` مطلوب لكشف IP الحقيقي خلف Replit proxy
- مسار النسخ الاحتياطية `/home/runner/workspace/data/backups` — دائم عبر إعادة التشغيل
