import { Router } from "express";
import { db } from "@workspace/db";
import { shiftsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const shifts = await db.select().from(shiftsTable)
      .where(eq(shiftsTable.companyId, companyId))
      .orderBy(shiftsTable.name);
    res.json(shifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { name, startTime, endTime, workDays, lateGraceMinutes } = req.body;
    if (!name || !startTime || !endTime) { res.status(400).json({ message: "الحقول المطلوبة ناقصة" }); return; }
    const [shift] = await db.insert(shiftsTable)
      .values({ companyId, name, startTime, endTime, workDays: workDays || "0,1,2,3,4", lateGraceMinutes: lateGraceMinutes || 15 })
      .returning();
    res.status(201).json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    const { name, startTime, endTime, workDays, lateGraceMinutes } = req.body;
    const [shift] = await db.update(shiftsTable)
      .set({ name, startTime, endTime, workDays, lateGraceMinutes })
      .where(and(eq(shiftsTable.id, id), eq(shiftsTable.companyId, companyId)))
      .returning();
    if (!shift) { res.status(404).json({ message: "Not found" }); return; }
    res.json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    await db.delete(shiftsTable)
      .where(and(eq(shiftsTable.id, id), eq(shiftsTable.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
