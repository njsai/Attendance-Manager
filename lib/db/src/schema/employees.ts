import { pgTable, serial, text, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { departmentsTable } from "./departments";
import { shiftsTable } from "./shifts";
import { branchesTable } from "./branches";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  jobTitle: text("job_title"),
  role: text("role").notNull().default("employee"),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  shiftId: integer("shift_id").references(() => shiftsTable.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  salary: real("salary"),
  faceDescriptor: text("face_descriptor"),
  isActive: boolean("is_active").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  passwordChangedAt: timestamp("password_changed_at"),
  preferredTheme: text("preferred_theme").default("dark"),
  preferredLang: text("preferred_lang").default("ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
