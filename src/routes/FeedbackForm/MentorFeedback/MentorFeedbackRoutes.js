import { Router } from "express";
import {
  createMentorFeedback,
  getMentorFeedbackById,
  getMentorFeedbackByUserId,
  getAllMentorFeedback,
  deleteMentorFeedbackById,
} from "../../../controllers/FeedbackForm/MentorFeedback/MentorFeedbackController.js";
import { protect } from "../../../controllers/authController.js";

const router = Router();

// Protect all routes
router.use(protect);

// POST: Create mentor feedback
router.post("/", createMentorFeedback);

// GET: Get mentor feedback by user ID
router.get("/user/:userId", getMentorFeedbackByUserId);

// GET: Get mentor feedback by feedback ID
router.get("/:id", getMentorFeedbackById);

// GET: Get all mentor feedback
router.get("/", getAllMentorFeedback);

// DELETE: Delete mentor feedback by ID
router.delete("/:id", deleteMentorFeedbackById);

export default router;
