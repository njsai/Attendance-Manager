import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, employeesTable } from "@workspace/db";
import { eq, and, desc, gt } from "drizzle-orm";
import { requireAuth, requireCompanyAuth, requireSuperAdmin } from "../lib/auth.js";

const router = Router();

router.get("/", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const channel = (req.query.channel as string) || "internal";
    const since = req.query.since ? new Date(req.query.since as string) : null;
    const conditions: any[] = [
      eq(messagesTable.companyId, companyId),
      eq(messagesTable.channel, channel),
    ];
    if (since) conditions.push(gt(messagesTable.createdAt, since));
    const msgs = await db.select().from(messagesTable)
      .where(and(...conditions))
      .orderBy(desc(messagesTable.createdAt))
      .limit(100);
    res.json(msgs.reverse());
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const { content, channel } = req.body;
    if (!content?.trim()) { res.status(400).json({ message: "الرسالة فارغة" }); return; }
    if (!["internal", "support"].includes(channel)) { res.status(400).json({ message: "قناة غير صالحة" }); return; }
    const [emp] = await db.select({ fullName: employeesTable.fullName, role: employeesTable.role })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, userId), eq(employeesTable.companyId, companyId)));
    if (!emp) { res.status(403).json({ message: "غير مصرح" }); return; }
    const [msg] = await db.insert(messagesTable).values({
      companyId, senderId: userId, senderType: emp.role, senderName: emp.fullName,
      channel, content: content.trim(),
    }).returning();
    res.json(msg);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.get("/unread", requireCompanyAuth, async (req, res) => {
  try {
    const companyId = req.session.companyId!;
    const userId = req.session.userId!;
    const allMsgs = await db.select({
      channel: messagesTable.channel, senderType: messagesTable.senderType, senderId: messagesTable.senderId,
    }).from(messagesTable).where(and(eq(messagesTable.companyId, companyId), eq(messagesTable.isRead, false)));
    const internalUnread = allMsgs.filter(m => m.channel === "internal" && m.senderId !== userId).length;
    const supportUnread = allMsgs.filter(m => m.channel === "support" && m.senderType === "super_admin").length;
    res.json({ internal: internalUnread, support: supportUnread });
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.get("/super-admin/:companyId", requireSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(String(req.params.companyId));
    const since = req.query.since ? new Date(req.query.since as string) : null;
    const conditions: any[] = [
      eq(messagesTable.companyId, companyId),
      eq(messagesTable.channel, "support"),
    ];
    if (since) conditions.push(gt(messagesTable.createdAt, since));
    const msgs = await db.select().from(messagesTable)
      .where(and(...conditions))
      .orderBy(desc(messagesTable.createdAt))
      .limit(100);
    res.json(msgs.reverse());
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/super-admin/:companyId", requireSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(String(req.params.companyId));
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ message: "الرسالة فارغة" }); return; }
    const [msg] = await db.insert(messagesTable).values({
      companyId, senderId: null, senderType: "super_admin",
      senderName: "مدير النظام العام", channel: "support", content: content.trim(),
    }).returning();
    res.json(msg);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.get("/super-admin-summary", requireSuperAdmin, async (_req, res) => {
  try {
    const allSupportMsgs = await db.select({
      companyId: messagesTable.companyId, content: messagesTable.content,
      senderType: messagesTable.senderType, senderName: messagesTable.senderName,
      createdAt: messagesTable.createdAt, isRead: messagesTable.isRead,
    }).from(messagesTable).where(eq(messagesTable.channel, "support")).orderBy(desc(messagesTable.createdAt));
    const byCompany: Record<number, { lastMsg: any; unread: number }> = {};
    for (const msg of allSupportMsgs) {
      if (!byCompany[msg.companyId]) byCompany[msg.companyId] = { lastMsg: msg, unread: 0 };
      if (!msg.isRead && msg.senderType !== "super_admin") byCompany[msg.companyId].unread++;
    }
    res.json(byCompany);
  } catch (err) { console.error(err); res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
