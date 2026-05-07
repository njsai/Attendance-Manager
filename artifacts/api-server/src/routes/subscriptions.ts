import { Router } from "express";
import { pool } from "@workspace/db";
import { requireSuperAdmin } from "../lib/auth.js";

const router = Router();

// ─── Helper ───────────────────────────────────────────────────────────────────
async function query(sql: string, params: any[] = []) {
  const client = await pool.connect();
  try { return (await client.query(sql, params)).rows; }
  finally { client.release(); }
}

function invoiceNumber() {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// ─── GET all plans ─────────────────────────────────────────────────────────────
router.get("/plans", requireSuperAdmin, async (_req, res) => {
  try {
    const plans = await query(`SELECT * FROM subscription_plans ORDER BY price ASC`);
    res.json(plans);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── POST create/update plan ───────────────────────────────────────────────────
router.post("/plans", requireSuperAdmin, async (req, res) => {
  try {
    const { name, type, price, currency = "USD", maxEmployees, maxBranches, storageGb, features } = req.body;
    const [plan] = await query(
      `INSERT INTO subscription_plans (name, type, price, currency, max_employees, max_branches, storage_gb, features)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, type, price, currency, maxEmployees, maxBranches, storageGb, JSON.stringify(features ?? [])]
    );
    res.status(201).json(plan);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── PUT update plan ───────────────────────────────────────────────────────────
router.put("/plans/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { name, price, maxEmployees, maxBranches, storageGb, features, isActive } = req.body;
    const [plan] = await query(
      `UPDATE subscription_plans SET name=$1, price=$2, max_employees=$3, max_branches=$4, storage_gb=$5, features=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [name, price, maxEmployees, maxBranches, storageGb, JSON.stringify(features ?? []), isActive, req.params.id]
    );
    if (!plan) { res.status(404).json({ message: "الخطة غير موجودة" }); return; }
    res.json(plan);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET company subscription ──────────────────────────────────────────────────
router.get("/companies/:id/subscription", requireSuperAdmin, async (req, res) => {
  try {
    const cId = parseInt(req.params.id);
    const [sub] = await query(
      `SELECT cs.*, 
        CASE WHEN cs.end_date IS NULL THEN NULL
             ELSE cs.end_date - CURRENT_DATE END AS days_remaining
       FROM company_subscriptions cs WHERE cs.company_id = $1 ORDER BY cs.created_at DESC LIMIT 1`,
      [cId]
    );
    res.json(sub ?? null);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── POST assign/create subscription for company ───────────────────────────────
router.post("/companies/:id/subscription", requireSuperAdmin, async (req, res) => {
  try {
    const cId = parseInt(req.params.id);
    const { planId, startDate, endDate, autoRenew, notes } = req.body;

    const [plan] = await query(`SELECT * FROM subscription_plans WHERE id = $1`, [planId]);
    if (!plan) { res.status(404).json({ message: "الخطة غير موجودة" }); return; }

    // Expire any existing active subscription
    await query(
      `UPDATE company_subscriptions SET status = 'cancelled' WHERE company_id = $1 AND status = 'active'`,
      [cId]
    );

    const [sub] = await query(
      `INSERT INTO company_subscriptions
        (company_id, plan_id, plan_name, plan_type, price, currency, start_date, end_date, status, auto_renew, max_employees, max_branches, storage_gb, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12,$13) RETURNING *`,
      [cId, plan.id, plan.name, plan.type, plan.price, plan.currency,
       startDate || new Date().toISOString().slice(0,10),
       plan.type === "lifetime" ? null : (endDate || null),
       autoRenew ?? false, plan.max_employees, plan.max_branches, plan.storage_gb, notes || null]
    );

    // Create payment record
    const inv = invoiceNumber();
    await query(
      `INSERT INTO payment_records (company_id, subscription_id, invoice_number, amount, currency, payment_method, status, plan_type, plan_name, period_start, period_end)
       VALUES ($1,$2,$3,$4,$5,'manual','paid',$6,$7,$8,$9)`,
      [cId, sub.id, inv, plan.price, plan.currency, plan.type, plan.name,
       startDate || new Date().toISOString().slice(0,10), endDate || null]
    );

    // Create notification
    await query(
      `INSERT INTO system_notifications (type, severity, title, message, company_id)
       VALUES ('subscription_created','success','اشتراك جديد',$1,$2)`,
      [`تم تفعيل اشتراك ${plan.name} للشركة`, cId]
    );

    res.status(201).json({ subscription: sub, invoiceNumber: inv });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── POST extend subscription ──────────────────────────────────────────────────
router.post("/companies/:id/subscription/extend", requireSuperAdmin, async (req, res) => {
  try {
    const cId = parseInt(req.params.id);
    const { months, amount, paymentMethod = "manual" } = req.body;
    const m = parseInt(months) || 1;

    const [sub] = await query(
      `UPDATE company_subscriptions SET
        end_date = COALESCE(end_date, CURRENT_DATE) + ($1 || ' months')::INTERVAL,
        status = 'active', updated_at = NOW()
       WHERE company_id = $2 AND status IN ('active','expired')
       RETURNING *`,
      [m, cId]
    );
    if (!sub) { res.status(404).json({ message: "لا يوجد اشتراك للتمديد" }); return; }

    const inv = invoiceNumber();
    await query(
      `INSERT INTO payment_records (company_id, subscription_id, invoice_number, amount, currency, payment_method, status, plan_type, plan_name, period_end)
       VALUES ($1,$2,$3,$4,$5,$6,'paid',$7,$8,$9)`,
      [cId, sub.id, inv, amount || sub.price, sub.currency, paymentMethod, sub.plan_type, sub.plan_name, sub.end_date]
    );

    await query(
      `INSERT INTO system_notifications (type, severity, title, message, company_id)
       VALUES ('subscription_extended','success','تمديد اشتراك',$1,$2)`,
      [`تم تمديد الاشتراك بـ ${m} شهر/أشهر`, cId]
    );

    res.json({ subscription: sub, invoiceNumber: inv, message: "تم تمديد الاشتراك" });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET payment history for company ──────────────────────────────────────────
router.get("/companies/:id/payments", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM payment_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [parseInt(req.params.id)]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET all payments (super admin overview) ───────────────────────────────────
router.get("/payments", requireSuperAdmin, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT pr.*, c.name AS company_name FROM payment_records pr
       LEFT JOIN companies c ON c.id = pr.company_id
       ORDER BY pr.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET invoice detail ────────────────────────────────────────────────────────
router.get("/payments/:invoiceNumber", requireSuperAdmin, async (req, res) => {
  try {
    const [row] = await query(
      `SELECT pr.*, c.name AS company_name, c.address AS company_address, c.email AS company_email
       FROM payment_records pr LEFT JOIN companies c ON c.id = pr.company_id
       WHERE pr.invoice_number = $1`,
      [req.params.invoiceNumber]
    );
    if (!row) { res.status(404).json({ message: "الفاتورة غير موجودة" }); return; }
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── GET subscriptions overview ────────────────────────────────────────────────
router.get("/subscriptions-overview", requireSuperAdmin, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.name AS company_name, c.is_active,
        cs.id AS sub_id, cs.plan_name, cs.plan_type, cs.status, cs.end_date, cs.price, cs.currency,
        CASE WHEN cs.end_date IS NULL THEN NULL ELSE cs.end_date - CURRENT_DATE END AS days_remaining
       FROM companies c
       LEFT JOIN LATERAL (
         SELECT * FROM company_subscriptions WHERE company_id = c.id ORDER BY created_at DESC LIMIT 1
       ) cs ON TRUE
       ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

// ─── Subscription expiry checker (call from cron) ─────────────────────────────
export async function checkSubscriptionExpiry() {
  try {
    // Mark expired subscriptions
    await query(
      `UPDATE company_subscriptions SET status = 'expired'
       WHERE end_date < CURRENT_DATE AND status = 'active' AND plan_type != 'lifetime'`
    );

    // Disable companies with expired subscriptions
    await query(
      `UPDATE companies SET is_active = FALSE
       WHERE id IN (
         SELECT DISTINCT company_id FROM company_subscriptions
         WHERE status = 'expired'
       ) AND is_active = TRUE`
    );

    // Expiry warning notifications (7, 3, 1 days)
    for (const days of [7, 3, 1]) {
      const expiring = await query(
        `SELECT cs.company_id, c.name, cs.plan_name, cs.end_date
         FROM company_subscriptions cs JOIN companies c ON c.id = cs.company_id
         WHERE cs.status = 'active' AND cs.end_date = CURRENT_DATE + $1
         AND NOT EXISTS (
           SELECT 1 FROM system_notifications sn
           WHERE sn.company_id = cs.company_id AND sn.type = $2
             AND sn.created_at::date = CURRENT_DATE
         )`,
        [days, `expiry_warning_${days}d`]
      );
      for (const row of expiring) {
        await query(
          `INSERT INTO system_notifications (type, severity, title, message, company_id)
           VALUES ($1,'warning',$2,$3,$4)`,
          [
            `expiry_warning_${days}d`,
            `⚠️ اشتراك ينتهي خلال ${days} يوم`,
            `اشتراك شركة "${row.name}" (${row.plan_name}) ينتهي بتاريخ ${row.end_date}`,
            row.company_id,
          ]
        );
      }
    }
  } catch (err) {
    console.error("[SubscriptionChecker]", err);
  }
}

export default router;
