import { Router } from "express";
import { protect, restrictTo } from "../controllers/authController.js";
import {
  getCompetitionReport,
  getAttendanceReport,
} from "../controllers/ReportController.js";

const router = Router();

router.use(protect);

router.get(
  "/competitions",
  restrictTo("admin", "hod", "director", "strcoordinator"),
  getCompetitionReport
);

router.get(
  "/attendance",
  restrictTo("admin", "hod", "director", "strcoordinator"),
  getAttendanceReport
);

export default router;