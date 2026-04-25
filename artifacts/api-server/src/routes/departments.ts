import { Router } from "express";
import { db } from "@workspace/db";
import { departmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const departments = await db.select().from(departmentsTable)
      .where(eq(departmentsTable.companyId, companyId))
      .orderBy(departmentsTable.name);
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ message: "اسم القسم مطلوب" }); return; }
    const [dept] = await db.insert(departmentsTable)
      .values({ companyId, name, description })
      .returning();
    res.status(201).json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const [dept] = await db.update(departmentsTable)
      .set({ name, description })
      .where(and(eq(departmentsTable.id, id), eq(departmentsTable.companyId, companyId)))
      .returning();
    if (!dept) { res.status(404).json({ message: "Not found" }); return; }
    res.json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const id = parseInt(req.params.id);
    await db.delete(departmentsTable)
      .where(and(eq(departmentsTable.id, id), eq(departmentsTable.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
