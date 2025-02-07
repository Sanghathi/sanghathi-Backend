import { Router } from "express";
import {
  createOrUpdateStudentProfile,
  getStudentProfileById,
  getAllStudents,
  deleteStudentProfileById,
} from "../../controllers/Student/studentController.js";

const router = Router();

// Get all students
router.get("/", getAllStudents);

// Create or update student profile
router.post("/profile", createOrUpdateStudentProfile);
router.patch("/profile/:id", createOrUpdateStudentProfile);

// Get a student profile by ID
router.get("/profile/:id", getStudentProfileById);

// Delete a student profile by ID
router.delete("/profile/:id", deleteStudentProfileById);

export default router;
