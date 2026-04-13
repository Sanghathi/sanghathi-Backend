import express from "express";
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateInternships,
  getInternshipsByUserId,
} from "../../controllers/Placement/InternshipController.js";

const router = express.Router();

router.use(protect);

// Route to create or update internships
router.post("/", createOrUpdateInternships);

// Route to get internships by user ID
router.get("/:menteeId", getInternshipsByUserId);

export default router;
