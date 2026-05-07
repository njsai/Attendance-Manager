import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireCompanyAuth } from "../lib/auth.js";

const router = Router();

// ─── GET /api/preferences — return current user's theme + lang ────────────────
router.get("/", requireCompanyAuth, async (req, res) => {
  try {
    const [emp] = await db
      .select({
        preferredTheme: employeesTable.preferredTheme,
        preferredLang: employeesTable.preferredLang,
      })
      .from(employeesTable)
      .where(and(
        eq(employeesTable.id, req.session.userId!),
        eq(employeesTable.companyId, req.session.companyId!)
      ));

    if (!emp) {
      res.status(404).json({ message: "الموظف غير موجود" });
      return;
    }

    res.json({
      theme: emp.preferredTheme ?? "dark",
      lang:  emp.preferredLang  ?? "ar",
    });
  } catch (err) {
    console.error("GET /preferences error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// ─── PUT /api/preferences — save theme + lang for current user ────────────────
router.put("/", requireCompanyAuth, async (req, res) => {
  try {
    const { theme, lang } = req.body as { theme?: string; lang?: string };

    const validThemes = ["dark", "light"];
    const validLangs  = ["ar", "en"];

    if (theme && !validThemes.includes(theme)) {
      res.status(400).json({ message: "قيمة الثيم غير صالحة" });
      return;
    }
    if (lang && !validLangs.includes(lang)) {
      res.status(400).json({ message: "قيمة اللغة غير صالحة" });
      return;
    }

    const updates: string[] = [];
    if (theme) updates.push(`preferred_theme = '${theme}'`);
    if (lang)  updates.push(`preferred_lang  = '${lang}'`);

    if (updates.length === 0) {
      res.status(400).json({ message: "لا يوجد شيء للتحديث" });
      return;
    }

    await db.execute(sql.raw(`
      UPDATE employees
      SET ${updates.join(", ")}
      WHERE id = ${req.session.userId!} AND company_id = ${req.session.companyId!}
    `));

    res.json({ message: "تم حفظ الإعدادات", theme, lang });
  } catch (err) {
    console.error("PUT /preferences error:", err);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
