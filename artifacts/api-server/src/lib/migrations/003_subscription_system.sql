-- Migration 003: Subscription plans, company subscriptions, payment records,
-- system notifications

CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('monthly','semi_annual','annual','lifetime')),
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_employees INTEGER NOT NULL DEFAULT 10,
  max_branches INTEGER NOT NULL DEFAULT 1,
  storage_gb REAL NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_type ON subscription_plans(type);

-- Seed default plans (idempotent — won't overwrite existing)
INSERT INTO subscription_plans (name, type, price, currency, max_employees, max_branches, storage_gb, features)
VALUES
  ('الشهري',     'monthly',      99,   'USD', 20,  3,  5,  '["حضور وانصراف","تقارير أساسية","دعم البريد"]'),
  ('نصف سنوي',  'semi_annual',  400,  'USD', 50,  5,  15, '["حضور وانصراف","تقارير متقدمة","رسائل","دعم أولوية"]'),
  ('السنوي',     'annual',       799,  'USD', 150, 15, 50, '["حضور وانصراف","تقارير متقدمة","رسائل","رواتب","دعم أولوية","نسخ احتياطي"]'),
  ('مدى الحياة', 'lifetime',     5000, 'USD', 999, 99, 200,'["جميع الميزات","موظفون غير محدودون","دعم VIP","تحديثات مجانية"]')
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','trial')),
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  max_employees INTEGER NOT NULL DEFAULT 10,
  max_branches INTEGER NOT NULL DEFAULT 1,
  storage_gb REAL NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions(company_id);

CREATE TABLE IF NOT EXISTS payment_records (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES company_subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','failed','refunded')),
  plan_type TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  notes TEXT,
  paid_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_company ON payment_records(company_id);

CREATE TABLE IF NOT EXISTS system_notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_created ON system_notifications(created_at DESC);
