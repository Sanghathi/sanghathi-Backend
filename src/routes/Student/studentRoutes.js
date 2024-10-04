import { Router } from "express";
import {
  getAllStudents,
  createStudentProfile,
  getStudentProfileById,
} from "../../controllers/Student/studentController.js";

const router = Router();

// POST /api/v1/students
router.get("/", getAllStudents);

router.post("/profile", createStudentProfile);

// GET /api/v1/students/:id
router.get("/profile/:id", getStudentProfileById);

// PATCH /api/v1/students/:id
// router.patch("/:id", studentController.updateStudentProfileById);

// DELETE /api/v1/students/:id
// router.delete("/:id", studentController.deleteStudentProfileById);

export default router;
