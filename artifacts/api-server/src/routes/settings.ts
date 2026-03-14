import { Router } from "express";
import { db } from "@workspace/db";
import { companyLocationTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/company-location", requireAuth, async (_req, res) => {
  try {
    const [location] = await db.select().from(companyLocationTable).limit(1);
    if (!location) {
      res.json({ id: 1, name: "المقر الرئيسي", latitude: 24.7136, longitude: 46.6753, radiusMeters: 200, updatedAt: new Date().toISOString() });
      return;
    }
    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/company-location", requireAdmin, async (req, res) => {
  try {
    const { latitude, longitude, radiusMeters, name } = req.body;

    const [existing] = await db.select().from(companyLocationTable).limit(1);
    let location;
    if (existing) {
      [location] = await db
        .update(companyLocationTable)
        .set({ latitude, longitude, radiusMeters, name, updatedAt: new Date() })
        .returning();
    } else {
      [location] = await db
        .insert(companyLocationTable)
        .values({ latitude, longitude, radiusMeters, name })
        .returning();
    }
    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
