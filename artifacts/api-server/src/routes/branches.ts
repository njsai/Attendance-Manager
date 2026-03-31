import { Router } from "express";
import { db } from "@workspace/db";
import { branchesTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);
    res.json(branches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, address, city, phone } = req.body;
    if (!name) {
      res.status(400).json({ message: "اسم الفرع مطلوب" });
      return;
    }
    const [branch] = await db.insert(branchesTable).values({ name, address, city, phone }).returning();
    res.status(201).json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, city, phone, isActive } = req.body;
    const [updated] = await db.update(branchesTable).set({ name, address, city, phone, isActive }).where(eq(branchesTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(branchesTable).where(eq(branchesTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
