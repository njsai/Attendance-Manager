import { Router } from "express";
import { db } from "@workspace/db";
import { branchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const branches = await db.select().from(branchesTable)
      .where(eq(branchesTable.companyId, companyId))
      .orderBy(branchesTable.name);
    res.json(branches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { name, address, city, phone, latitude, longitude, radiusMeters, locationVerificationEnabled } = req.body;
    if (!name) { res.status(400).json({ message: "اسم الفرع مطلوب" }); return; }
    const [branch] = await db.insert(branchesTable)
      .values({
        companyId, name,
        address: address || null, city: city || null, phone: phone || null,
        latitude: latitude != null && latitude !== "" ? Number(latitude) : null,
        longitude: longitude != null && longitude !== "" ? Number(longitude) : null,
        radiusMeters: radiusMeters != null && radiusMeters !== "" ? Number(radiusMeters) : 200,
        locationVerificationEnabled: locationVerificationEnabled === true,
      }).returning();
    res.status(201).json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    const { name, address, city, phone, isActive, latitude, longitude, radiusMeters, locationVerificationEnabled } = req.body;
    const [updated] = await db.update(branchesTable)
      .set({
        name, address: address ?? null, city: city ?? null, phone: phone ?? null, isActive,
        latitude: latitude != null && latitude !== "" ? Number(latitude) : null,
        longitude: longitude != null && longitude !== "" ? Number(longitude) : null,
        radiusMeters: radiusMeters != null && radiusMeters !== "" ? Number(radiusMeters) : 200,
        locationVerificationEnabled: locationVerificationEnabled === true,
      })
      .where(and(eq(branchesTable.id, id), eq(branchesTable.companyId, companyId)))
      .returning();
    if (!updated) { res.status(404).json({ message: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(String(req.params.id));
    await db.delete(branchesTable)
      .where(and(eq(branchesTable.id, id), eq(branchesTable.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
