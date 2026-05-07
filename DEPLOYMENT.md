# Production Deployment Guide
## نظام إدارة الحضور والانصراف — دليل النشر والترحيل

---

## 1. تشخيص البيئة الحالية

| البند | التفاصيل |
|-------|----------|
| قاعدة البيانات | PostgreSQL 16.10 — **محلية داخل Replit** (host: `helium`) |
| نوع الاستضافة | Replit Managed PostgreSQL (ليست خارجية) |
| DATABASE_URL | `postgresql://postgres:PASS@helium/heliumdb?sslmode=disable` |
| جداول | 22 جدول، 2 شركة، 5 موظفين، 17 راتب، 10 حضور |
| النسخ الاحتياطي الحالي | JSON يومي + SQL (pg_dump) بدءًا من 2026-05-07 |

---

## 2. متغيرات البيئة المطلوبة

جميع الاتصالات تمر عبر متغيرات البيئة. لا توجد أي بيانات اتصال مضمّنة في الكود.

```bash
# قاعدة البيانات (الأكثر أهمية)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require

# الجلسات
SESSION_SECRET=<سلسلة عشوائية طويلة 64+ حرف>

# بيئة التشغيل
NODE_ENV=production

# مجلد النسخ الاحتياطية (اختياري)
BACKUP_DIR=/var/backups/attendance
```

---

## 3. نظام النسخ الاحتياطي

### النسخ الاحتياطي التلقائي
- **يومياً الساعة 02:00 (Asia/Baghdad)**
- pg_dump → `data/backups/sql/backup_full_<timestamp>.sql.gz`
- JSON per-company → `data/backups/json/backup_<company_id>_<timestamp>.json`
- يُحذف التلقائياً بعد 30 يوم

### نسخ احتياطي يدوي فوري
```bash
# نسخة SQL كاملة (موصى بها دائماً قبل أي تحديث)
./scripts/backup.sh

# النسخة تُحفظ في:
# data/backups/sql/backup_full_<timestamp>.sql.gz
```

### الاستعادة من النسخة الاحتياطية
```bash
# ستُنشئ نسخة أمان تلقائياً قبل الاستعادة
./scripts/restore.sh data/backups/sql/backup_full_2026-05-07T14-44-13.sql.gz
```

---

## 4. نظام الـ Migrations

### جداول التتبع
- جدول `schema_migrations` يسجل كل migration مطبّق مع timestamp + checksum

### تطبيق migration جديد
```bash
# 1. أنشئ ملف SQL في:
# artifacts/api-server/src/lib/migrations/005_your_feature.sql

# مثال:
echo "ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;" \
  > artifacts/api-server/src/lib/migrations/005_phone_verification.sql

# 2. اختبر بدون تطبيق (dry run)
./scripts/migrate.sh --dry-run

# 3. طبّق
./scripts/migrate.sh
```

### قواعد كتابة الـ Migrations
- استخدم `CREATE TABLE IF NOT EXISTS` دائماً
- استخدم `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- استخدم `CREATE INDEX IF NOT EXISTS`
- لا تستخدم `DROP TABLE` أو `DROP COLUMN` إلا في migration rollback منفصل
- كل migration في ملف منفصل مُرقّم: `005_`, `006_`, ...

---

## 5. الانتقال إلى VPS / Oracle Cloud (بدون downtime)

### الخطوة 1: تحضير الخادم الجديد
```bash
# على الخادم الجديد — تثبيت PostgreSQL 16
sudo apt update
sudo apt install -y postgresql-16

# إنشاء قاعدة بيانات
sudo -u postgres psql <<SQL
CREATE DATABASE attendance_prod;
CREATE USER attendance_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE attendance_prod TO attendance_user;
\c attendance_prod
GRANT ALL ON SCHEMA public TO attendance_user;
SQL
```

### الخطوة 2: أخذ نسخة احتياطية من Replit
```bash
# على Replit — نسخة كاملة
./scripts/backup.sh

# احفظ اسم الملف الناتج
# مثال: data/backups/sql/backup_full_2026-05-07T14-44-13.sql.gz
```

### الخطوة 3: نقل ملف النسخة الاحتياطية إلى الخادم الجديد
```bash
# من Replit إلى الخادم
scp data/backups/sql/backup_full_*.sql.gz user@new-server:/tmp/

# أو استخدم أي طريقة نقل ملفات أخرى (SFTP, rsync, etc.)
```

### الخطوة 4: استعادة قاعدة البيانات على الخادم الجديد
```bash
# على الخادم الجديد
export DATABASE_URL="postgresql://attendance_user:STRONG_PASSWORD_HERE@localhost:5432/attendance_prod"

# استعادة (بدون التحقق التفاعلي)
gunzip -c /tmp/backup_full_*.sql.gz | psql "$DATABASE_URL"

# تحقق من البيانات
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM companies"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM employees"
```

### الخطوة 5: تحديث متغيرات البيئة
```bash
# حدّث DATABASE_URL ليشير للخادم الجديد
DATABASE_URL=postgresql://attendance_user:PASSWORD@new-server-ip:5432/attendance_prod?sslmode=require

# تأكد أن SESSION_SECRET محدد وقوي
SESSION_SECRET=$(openssl rand -base64 64)
```

### الخطوة 6: نشر التطبيق على الخادم الجديد
```bash
# تثبيت Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت pnpm
npm install -g pnpm

# نسخ الكود
git clone <repo-url> /opt/attendance
cd /opt/attendance
pnpm install

# بناء التطبيق
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/attendance-system run build

# تشغيل بـ PM2
npm install -g pm2
pm2 start dist/index.js --name attendance-api --env production
pm2 startup
pm2 save
```

### الخطوة 7: Zero-Downtime Switch (قطع الاتصال دون فقدان بيانات)
```bash
# 1. على Replit: وقف قبول طلبات جديدة (ضع maintenance mode)
# 2. خذ نسخة احتياطية نهائية
./scripts/backup.sh

# 3. انقل النسخة للخادم الجديد واستعدها
# 4. حوّل DNS أو Reverse Proxy للخادم الجديد
# 5. اختبر الاتصال
curl https://your-domain.com/api/health
```

---

## 6. Object Storage للملفات (الشعارات، الفواتير)

حالياً: لا توجد ملفات مرفوعة. عند إضافة رفع الملفات، استخدم Object Storage:

### الخيار 1: Cloudflare R2 (موصى به — مجاني حتى 10GB)
```bash
# متغيرات البيئة المطلوبة
R2_ACCOUNT_ID=xxxx
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_BUCKET_NAME=attendance-files
R2_PUBLIC_URL=https://files.your-domain.com
```

### الخيار 2: MinIO على الخادم (self-hosted)
```bash
# تشغيل MinIO
docker run -d \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=STRONG_PASSWORD \
  -v /data/minio:/data \
  minio/minio server /data --console-address ":9001"
```

### مسارات الملفات المقترحة
```
/uploads/logos/<company_id>/<filename>     # شعارات الشركات
/uploads/invoices/<company_id>/<invoice_no>.pdf  # الفواتير
/backups/sql/<timestamp>.sql.gz            # النسخ الاحتياطية
```

---

## 7. العلاقات بين الجداول (Foreign Keys)

```
companies (رئيسي)
├── branches         → company_id
├── departments      → company_id
├── shifts           → company_id
├── employees        → company_id
│   ├── attendance   → employee_id
│   ├── leaves       → employee_id
│   ├── payroll      → employee_id, company_id
│   │   └── payroll_logs → payroll_id, employee_id
│   └── (department_id, shift_id, branch_id)
├── company_location → company_id
├── company_subscriptions → company_id → subscription_plans
│   └── payment_records → subscription_id, company_id
├── messages         → company_id
├── settings         → company_id
├── system_notifications → company_id
├── audit_logs       → company_id
└── security_events  → company_id

super_admins (مستقل — لا علاقة بـ companies)
subscription_plans (مرجعي — لا يُحذف)
login_attempts (مستقل)
active_sessions (مستقل)
session (جلسات Express)
schema_migrations (تتبع Migrations)
```

---

## 8. Rollback عند حدوث خطأ

### Rollback Migration
```bash
# إذا فشل migration جديد، احذف السجل وأعد
psql "$DATABASE_URL" -c "DELETE FROM schema_migrations WHERE filename = '005_your_feature.sql'"

# ثم عالج الخطأ في الملف وأعد التطبيق
./scripts/migrate.sh
```

### Rollback قاعدة البيانات كاملة
```bash
# استعد آخر نسخة احتياطية سليمة
./scripts/restore.sh data/backups/sql/backup_full_<timestamp>.sql.gz

# سيطلب تأكيداً ويأخذ نسخة أمان تلقائية قبل الاستعادة
```

### Rollback الكود
```bash
# Replit: استخدم Checkpoints للرجوع لنقطة زمنية سابقة
# VPS: git checkout <commit> && pm2 restart attendance-api
```

---

## 9. Checklist قبل النشر للإنتاج

- [ ] `SESSION_SECRET` مضبوط وقوي (64+ حرف عشوائي)
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` يشير لقاعدة بيانات خارجية مع `sslmode=require`
- [ ] نسخة احتياطية pg_dump ناجحة وتم اختبار الاستعادة منها
- [ ] جميع migrations مسجلة في `schema_migrations`
- [ ] HTTPS مفعّل على الدومين
- [ ] Reverse proxy (nginx/caddy) مضبوط
- [ ] PM2 أو systemd لإدارة العملية وإعادة التشغيل التلقائي
- [ ] Cron job للنسخ الاحتياطي خارج التطبيق (كضمان إضافي)

---

## 10. أوامر التشخيص السريع

```bash
# فحص حالة قاعدة البيانات
psql "$DATABASE_URL" -c "SELECT version()"
psql "$DATABASE_URL" -c "\dt"

# فحص البيانات الحالية
psql "$DATABASE_URL" -c "SELECT id, name, is_active FROM companies"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM employees"
psql "$DATABASE_URL" -c "SELECT filename, applied_at FROM schema_migrations ORDER BY id"

# نسخة احتياطية فورية
./scripts/backup.sh

# اختبار الـ migration قبل التطبيق
./scripts/migrate.sh --dry-run
```
