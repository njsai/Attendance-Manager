import { Router } from "express";
import { db } from "@workspace/db";
import { shiftsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const shifts = await db.select().from(shiftsTable).orderBy(shiftsTable.name);
    res.json(shifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, startTime, endTime, workDays, lateGraceMinutes } = req.body;
    if (!name || !startTime || !endTime) {
      res.status(400).json({ message: "Required fields missing" });
      return;
    }
    const [shift] = await db
      .insert(shiftsTable)
      .values({ name, startTime, endTime, workDays: workDays || "0,1,2,3,4", lateGraceMinutes: lateGraceMinutes || 15 })
      .returning();
    res.status(201).json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, startTime, endTime, workDays, lateGraceMinutes } = req.body;
    const [shift] = await db
      .update(shiftsTable)
      .set({ name, startTime, endTime, workDays, lateGraceMinutes })
      .where(eq(shiftsTable.id, id))
      .returning();
    if (!shift) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(shiftsTable).where(eq(shiftsTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
