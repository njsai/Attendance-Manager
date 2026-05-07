# نظام إدارة الحضور والانصراف — SaaS متعدد الشركات

نظام SaaS لإدارة الحضور والانصراف متعدد الشركات مع تعرف على الوجه وحماية أمنية متقدمة.

## Run & Operate
- API Server: `pnpm --filter @workspace/api-server run dev` (port 8080)
- Frontend: `pnpm --filter @workspace/attendance-system run dev` (port 24620)
- DB push: `pnpm --filter @workspace/db run push`
- Typecheck: `pnpm run typecheck`
- **Required env**: `DATABASE_URL`, `SESSION_SECRET` (optional but recommended in prod)

## Stack
- **Runtime**: Node.js 24, TypeScript 5.9
- **API**: Express 5 + express-session + connect-pg-simple
- **DB**: PostgreSQL + Drizzle ORM
- **Security**: bcrypt (12 rounds), Helmet.js, express-rate-limit, bcryptjs
- **Frontend**: React + Vite + TailwindCSS + Wouter + TanStack Query
- **Face Recognition**: face-api.js (models from CDN)

## Where Things Live
- DB Schema: `lib/db/src/schema/` (employees, companies, attendance, leaves, messages, …)
- API Routes: `artifacts/api-server/src/routes/`
- Security lib: `artifacts/api-server/src/lib/security.ts`
- Security middleware: `artifacts/api-server/src/middleware/security.ts`
- Frontend pages: `artifacts/attendance-system/src/pages/`
- Super Admin: `artifacts/attendance-system/src/pages/super-admin/`

## Architecture Decisions
- **Multi-tenant**: كل الجداول تحتوي `company_id` — عزل كامل بين الشركات
- **Dual session**: `superAdminId` للسوبر ادمن / `userId+companyId+role` للموظفين
- **Password hashing**: `bcrypt(sha256(password), 12)` — هجرة تلقائية من SHA-256 عند بدء السيرفر
- **Brute force**: قفل الحساب بعد 5 محاولات / حظر IP بعد 20 محاولة / سجل login_attempts
- **Audit trail**: كل POST/PUT/DELETE يُسجَّل في audit_logs مع IP + user + status
- **Chat polling**: كل 3 ثواني — channel داخلي (موظفون↔إدارة) + support (شركة↔سوبر ادمن)

## Product
- **السوبر ادمن**: إدارة الشركات (إنشاء/تعديل/تفعيل/حذف) + مركز الأمان + دردشة الدعم
- **مدير الشركة**: إدارة الموظفين، الفروع، الأقسام، الشفتات، التقارير، الإعدادات
- **المشرف/الموظف**: تسجيل حضور (يدوي أو وجه)، إجازات، دردشة داخلية

## الحسابات التجريبية
- **سوبر ادمن**: superadmin / superadmin123 → /super-admin/login
- **مدير شركة**: admin / admin123 → /login
- **مشرف**: manager1 / manager123
- **موظف**: emp1 / emp123

## Security Features
| الميزة | التفاصيل |
|--------|----------|
| Password Hashing | bcrypt rounds=12 (هجرة تلقائية من SHA-256) |
| Account Lockout | قفل بعد 5 محاولات فاشلة لمدة 15 دقيقة |
| IP Rate Limiting | 500 req/15min عام، 10 login/15min، 5 super-admin/30min |
| Security Headers | Helmet: HSTS, CSP, X-Frame, X-XSS, nosniff, no-store |
| CSRF Protection | SameSite cookie + Origin/Referer validation |
| Input Sanitization | Trim + null-byte removal + length limit |
| SQL Injection | Drizzle ORM (parameterized queries فقط) |
| Audit Logs | كل عمليات POST/PUT/DELETE مع IP + user + status |
| Security Events | حوادث أمنية مع severity + إشعارات |
| Device Tracking | تتبع الجلسات: IP + User-Agent + device |
| Session Management | انتهاء تلقائي 8 ساعات، إنهاء يدوي، logout-all |
| Tenant Isolation | company_id على كل الجداول + middleware validation |

## Gotchas
- Sessions expire after 8 hours (rolling)
- Password migration runs on every API server start (idempotent)
- CSRF check skips `/login` endpoints (no session yet)
- face-api.js models loaded from CDN — needs internet
- `trust proxy: 1` required for correct IP detection behind Replit proxy
