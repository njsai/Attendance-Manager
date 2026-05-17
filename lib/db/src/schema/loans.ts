import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";
import { payrollTable } from "./payroll";

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  installmentsCount: integer("installments_count").notNull().default(1),
  installmentsPaid: integer("installments_paid").notNull().default(0),
  monthlyDeduction: real("monthly_deduction").notNull().default(0),
  approvedBy: integer("approved_by").references(() => employeesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const loanInstallmentsTable = pgTable("loan_installments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loansTable.id, { onDelete: "cascade" }),
  payrollId: integer("payroll_id").references(() => payrollTable.id, { onDelete: "set null" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amount: real("amount").notNull(),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
});

export type Loan = typeof loansTable.$inferSelect;
export type LoanInstallment = typeof loanInstallmentsTable.$inferSelect;
