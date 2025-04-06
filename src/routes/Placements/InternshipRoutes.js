import express from "express";
import {
  createOrUpdateInternships,
  getInternshipsByUserId,
} from "../../controllers/Placement/InternshipController.js";

const router = express.Router();

// Route to create or update internships
router.post("/", createOrUpdateInternships);

// Route to get internships by user ID
router.get("/:menteeId", getInternshipsByUserId);

export default router;
