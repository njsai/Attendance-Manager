import { pgTable, serial, text, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  companyCode: text("company_code"),
  attendanceLocationMode: text("attendance_location_mode").notNull().default("disabled"),
  currency: text("currency").notNull().default("IQD"),
  overtimeRate: real("overtime_rate").notNull().default(1.5),
  lateDeductionRate: real("late_deduction_rate").notNull().default(1.0),
  absenceDeductionRate: real("absence_deduction_rate").notNull().default(1.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

export const superAdminsTable = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSuperAdminSchema = createInsertSchema(superAdminsTable).omit({ id: true, createdAt: true });
export type InsertSuperAdmin = z.infer<typeof insertSuperAdminSchema>;
export type SuperAdmin = typeof superAdminsTable.$inferSelect;
