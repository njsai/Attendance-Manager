import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyLocationTable = pgTable("company_location", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("المقر الرئيسي"),
  latitude: real("latitude").notNull().default(24.7136),
  longitude: real("longitude").notNull().default(46.6753),
  radiusMeters: integer("radius_meters").notNull().default(200),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
