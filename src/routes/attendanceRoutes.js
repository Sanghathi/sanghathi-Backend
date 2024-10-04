import { Router } from "express";
import {
  submitAttendanceData,
  deleteAllAttendance,
} from "../controllers/Student/attendanceController.js";

const router = Router();

router.route("/:userId").post(submitAttendanceData).delete(deleteAllAttendance);

export default router;
