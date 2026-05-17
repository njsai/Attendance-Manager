import { pgTable, serial, text, integer, real, timestamp, check } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";
import { sql } from "drizzle-orm";

export const payrollTable = pgTable("payroll", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: real("basic_salary").notNull().default(0),
  incentives: real("incentives").notNull().default(0),
  overtimePay: real("overtime_pay").notNull().default(0),
  deductions: real("deductions").notNull().default(0),
  advances: real("advances").notNull().default(0),
  lateDeduction: real("late_deduction").notNull().default(0),
  absenceDeduction: real("absence_deduction").notNull().default(0),
  netSalary: real("net_salary").notNull().default(0),
  currency: text("currency").notNull().default("IQD"),
  status: text("status").notNull().default("unpaid"),
  paidAt: timestamp("paid_at"),
  workDays: integer("work_days").notNull().default(0),
  absentDays: integer("absent_days").notNull().default(0),
  lateMinutes: integer("late_minutes").notNull().default(0),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  leaveDays: integer("leave_days").notNull().default(0),
  leaveDeduction: real("leave_deduction").notNull().default(0),
  loanDeduction: real("loan_deduction").notNull().default(0),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => employeesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payrollLogsTable = pgTable("payroll_logs", {
  id: serial("id").primaryKey(),
  payrollId: integer("payroll_id").notNull().references(() => payrollTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull(),
  changedBy: integer("changed_by").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export type Payroll = typeof payrollTable.$inferSelect;
export type PayrollLog = typeof payrollLogsTable.$inferSelect;
