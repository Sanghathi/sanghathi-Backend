import { Router } from "express";
import { protect, restrictTo } from "../controllers/authController.js";
import {
  getCompetitionReport,
  getAttendanceReport,
  sendLowAttendanceEmail,
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
  restrictTo("admin", "faculty", "hod", "director", "strcoordinator"),
  getAttendanceReport
);

router.post(
  "/send-low-attendance-email",
  restrictTo("faculty", "hod", "director"),
  sendLowAttendanceEmail
);

export default router;