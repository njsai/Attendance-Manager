import { pgTable, serial, integer, text, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  checkInLat: real("check_in_lat"),
  checkInLng: real("check_in_lng"),
  checkOutLat: real("check_out_lat"),
  checkOutLng: real("check_out_lng"),
  workingHours: real("working_hours"),
  breakHours: real("break_hours"),
  lateMinutes: integer("late_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  status: text("status").notNull().default("absent"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
