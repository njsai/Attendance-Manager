import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import departmentsRouter from "./departments.js";
import shiftsRouter from "./shifts.js";
import employeesRouter from "./employees.js";
import attendanceRouter from "./attendance.js";
import leavesRouter from "./leaves.js";
import reportsRouter from "./reports.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/departments", departmentsRouter);
router.use("/shifts", shiftsRouter);
router.use("/employees", employeesRouter);
router.use("/attendance", attendanceRouter);
router.use("/leaves", leavesRouter);
router.use("/reports", reportsRouter);
router.use("/settings", settingsRouter);

export default router;
