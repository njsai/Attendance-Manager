import { Router } from "express";
import { db } from "@workspace/db";
import { companyLocationTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

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

// Get company info
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
