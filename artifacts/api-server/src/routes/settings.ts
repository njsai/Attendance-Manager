import { Router } from "express";
import { db } from "@workspace/db";
import { companyLocationTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import { sql } from "drizzle-orm";

const router = Router();

// ─── Company Location (legacy — kept for backward compat) ─────────────────────
router.get("/company-location", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    let [loc] = await db.select().from(companyLocationTable)
      .where(eq(companyLocationTable.companyId, companyId));
    if (!loc) {
      [loc] = await db.insert(companyLocationTable).values({
        companyId, name: "المقر الرئيسي", latitude: 33.3152, longitude: 44.3661, radiusMeters: 200,
      }).returning();
    }
    res.json(loc);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.put("/company-location", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { name, latitude, longitude, radiusMeters } = req.body;
    const [existing] = await db.select({ id: companyLocationTable.id }).from(companyLocationTable)
      .where(eq(companyLocationTable.companyId, companyId));

    let loc;
    if (existing) {
      [loc] = await db.update(companyLocationTable)
        .set({ name, latitude, longitude, radiusMeters, updatedAt: new Date() })
        .where(and(eq(companyLocationTable.id, existing.id), eq(companyLocationTable.companyId, companyId)))
        .returning();
    } else {
      [loc] = await db.insert(companyLocationTable)
        .values({ companyId, name, latitude, longitude, radiusMeters })
        .returning();
    }
    res.json(loc);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Attendance Location Mode ─────────────────────────────────────────────────
// GET /api/settings/location-mode → { mode: 'disabled' | 'enabled' }
router.get("/location-mode", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const result = await db.execute(
      sql`SELECT attendance_location_mode as mode FROM companies WHERE id = ${companyId}`
    );
    const mode = (result.rows[0] as any)?.mode ?? "disabled";
    res.json({ mode });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// PUT /api/settings/location-mode → { mode }
router.put("/location-mode", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { mode } = req.body;
    if (!["enabled", "disabled"].includes(mode)) {
      res.status(400).json({ message: "القيمة يجب أن تكون enabled أو disabled" });
      return;
    }
    await db.execute(
      sql`UPDATE companies SET attendance_location_mode = ${mode} WHERE id = ${companyId}`
    );
    res.json({ mode, message: "تم حفظ الإعداد" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

// ─── Company Info ─────────────────────────────────────────────────────────────
router.get("/company", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (!company) { res.status(404).json({ message: "Company not found" }); return; }
    res.json(company);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

router.put("/company", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { name, address, phone, email } = req.body;
    const [updated] = await db.update(companiesTable)
      .set({ name, address, phone, email })
      .where(eq(companiesTable.id, companyId))
      .returning();
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ message: "Server error" }); }
});

export default router;
