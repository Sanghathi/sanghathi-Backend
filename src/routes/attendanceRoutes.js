import { Router } from "express";
import {
  submitAttendanceData,
  deleteAllAttendance,
  getAttendanceById,
} from "../controllers/Student/attendanceController.js";

const router = Router();

router.route("/:userId").post(submitAttendanceData).delete(deleteAllAttendance);

router.get("/:id", getAttendanceById);

export default router;
