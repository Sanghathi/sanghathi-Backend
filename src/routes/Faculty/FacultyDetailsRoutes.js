import { Router } from "express";
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateFacultyProfile,
  getFacultyProfileById,
  deleteFacultyProfileById,
} from "../../controllers/Faculty/FacultyDetailsController.js";

const router = Router();

router.use(protect);

// Create or update faculty profile
router.post("/profile", createOrUpdateFacultyProfile);

// Get a faculty profile by ID
router.get("/profile/:id", getFacultyProfileById);

// Delete a faculty profile by ID
router.delete("/profile/:id", deleteFacultyProfileById);

export default router;
