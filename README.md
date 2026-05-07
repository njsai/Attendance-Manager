# نظام إدارة الحضور والانصراف
**Multi-Tenant SaaS Attendance Management System**

نظام متكامل لإدارة الحضور والانصراف، مصمم للشركات متعددة المستأجرين مع دعم كامل للغتين العربية والإنجليزية.

---

## 🚀 التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 19 + Vite + TailwindCSS v4 + Framer Motion |
| Backend | Express 5 + Drizzle ORM |
| Database | PostgreSQL 16 |
| Auth | Session-based + bcrypt |
| Routing | Wouter (client) |
| i18n | Custom hook (AR/EN) |
| Package Manager | pnpm workspaces |

---

## 📁 هيكل المشروع

```
.
├── artifacts/
│   ├── api-server/          # Express API (Port: $PORT)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── migrations/   # SQL migration files
│   │       │   ├── migration-runner.ts
│   │       │   ├── backup-scheduler.ts
│   │       │   └── db-init.ts
│   │       ├── routes/      # API route handlers
│   │       └── middleware/  # Security middleware
│   └── attendance-system/   # React frontend
│       └── src/
│           ├── pages/       # Page components
│           ├── components/  # Shared components
│           └── lib/         # Hooks & utilities
├── lib/
│   └── db/                  # Shared DB package (Drizzle ORM)
│       └── src/
│           ├── schema/      # Database schema definitions
│           └── index.ts
├── scripts/
│   ├── backup.sh            # pg_dump backup script
│   ├── restore.sh           # Database restore script
│   └── migrate.sh           # Migration runner script
├── DEPLOYMENT.md            # Production deployment guide
└── pnpm-workspace.yaml
```

---

## ⚡ التشغيل المحلي

### المتطلبات
- Node.js 20+
- pnpm 9+
- PostgreSQL 16

### الخطوات

```bash
# 1. تثبيت الاعتمادات
pnpm install

# 2. إعداد متغيرات البيئة
cp .env.example .env
# عدّل .env بمتغيراتك

# 3. تشغيل الخادم
pnpm --filter @workspace/api-server run dev

# 4. تشغيل الواجهة
pnpm --filter @workspace/attendance-system run dev
```

---

## 🔑 متغيرات البيئة المطلوبة

```bash
# قاعدة البيانات (مطلوب)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require

# الجلسات (مطلوب في الإنتاج)
SESSION_SECRET=your-strong-random-secret-64-chars-minimum

# البيئة
NODE_ENV=production

# منفذ الخادم
PORT=8080
```

---

## 🗄️ قاعدة البيانات

### الجداول الرئيسية (22 جدول)
- `companies` — الشركات (multi-tenant root)
- `employees` — الموظفون
- `attendance` — سجلات الحضور
- `payroll` — الرواتب
- `leaves` — الإجازات
- `departments` / `branches` / `shifts` — الهيكل التنظيمي
- `company_subscriptions` / `subscription_plans` — نظام الاشتراكات
- `audit_logs` / `security_events` — سجلات الأمان

### المهاجرات (Migrations)

```bash
# تطبيق migrations جديدة
./scripts/migrate.sh

# اختبار بدون تطبيق
./scripts/migrate.sh --dry-run
```

---

## 💾 النسخ الاحتياطي والاستعادة

```bash
# نسخة احتياطية كاملة (pg_dump)
./scripts/backup.sh

# استعادة من نسخة احتياطية
./scripts/restore.sh data/backups/sql/backup_full_<timestamp>.sql.gz
```

النسخ الاحتياطية تتم تلقائياً يومياً الساعة 02:00 صباحاً وتُحذف بعد 30 يوم.

---

## 🌐 الصفحات الرئيسية

| الصفحة | المسار |
|--------|--------|
| تسجيل الدخول | `/login` |
| لوحة التحكم | `/` |
| الحضور | `/attendance` |
| الموظفون | `/employees` |
| الرواتب | `/payroll` |
| الإجازات | `/my-leaves` |
| التقارير | `/reports` |
| لوحة تحكم المدير العام | `/super-admin` |

---

## 🔐 حسابات الاختبار (Development Only)

| المستخدم | كلمة المرور | الدور |
|---------|------------|-------|
| `superadmin` | `superadmin123` | Super Admin |
| `admin` | `admin123` | Company Admin |
| `manager1` | `manager123` | Manager |
| `emp1` | `emp123` | Employee |

> ⚠️ غيّر هذه الكلمات في بيئة الإنتاج

---

## 🚢 النشر للإنتاج

راجع [DEPLOYMENT.md](./DEPLOYMENT.md) للتعليمات الكاملة حول:
- الانتقال إلى VPS / Oracle Cloud
- إعداد PostgreSQL خارجي
- إعداد Nginx / Caddy
- إعداد PM2 / systemd
- Zero-downtime migrations

---

## 📋 CI/CD

يمكن استخدام GitHub Actions للنشر التلقائي:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install
      - run: pnpm --filter @workspace/api-server run build
      - run: pnpm --filter @workspace/attendance-system run build
      # أضف خطوات النشر الخاصة بك هنا
```

---

## 📄 الترخيص

جميع الحقوق محفوظة © 2026
