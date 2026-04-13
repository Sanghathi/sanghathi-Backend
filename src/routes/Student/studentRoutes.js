import { Router } from "express";
import {
  createOrUpdateStudentProfile,
  getStudentProfileById,
  getAllStudents,
  deleteStudentProfileById,
} from "../../controllers/Student/studentController.js";
import { protect, restrictTo } from "../../controllers/authController.js";

const router = Router();

router.use(protect);

// Get all students
router.get("/", restrictTo("admin", "faculty", "hod", "director"), getAllStudents);

// Create or update student profile
router.post(
  "/profile",
  restrictTo("student", "faculty", "admin", "hod", "director"),
  createOrUpdateStudentProfile
);

// Get a student profile by ID
router.get("/profile/:id", getStudentProfileById);

// Delete a student profile by ID
router.delete(
  "/profile/:id",
  restrictTo("admin", "hod", "director"),
  deleteStudentProfileById
);

export default router;
