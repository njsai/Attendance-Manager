import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id"),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  channel: text("channel").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
