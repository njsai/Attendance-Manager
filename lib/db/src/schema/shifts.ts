import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const shiftsTable = pgTable("shifts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  workDays: text("work_days").notNull().default("0,1,2,3,4"),
  lateGraceMinutes: integer("late_grace_minutes").notNull().default(15),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShiftSchema = createInsertSchema(shiftsTable).omit({ id: true, createdAt: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shiftsTable.$inferSelect;
