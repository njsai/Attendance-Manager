import { Router } from "express";
import { db } from "@workspace/db";
import { departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ message: "Name required" });
      return;
    }
    const [dept] = await db.insert(departmentsTable).values({ name, description }).returning();
    res.status(201).json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const [dept] = await db
      .update(departmentsTable)
      .set({ name, description })
      .where(eq(departmentsTable.id, id))
      .returning();
    if (!dept) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
