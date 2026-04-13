import { Router } from "express";
import {
  submitAttendanceData,
  deleteAllAttendance,
  getAttendanceById,
} from "../controllers/Student/attendanceController.js";
import { protect, restrictTo } from "../controllers/authController.js";

const router = Router();

router.use(protect);

router
  .route("/:userId")
  .post(restrictTo("admin", "faculty", "hod", "director"), submitAttendanceData)
  .delete(restrictTo("admin", "hod", "director"), deleteAllAttendance);

router.get("/:id", getAttendanceById);

export default router;
