import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import {
  createOrUpdateFeedback,
  getFeedbackByUserId,
  getFeedbackOverview,
  deleteFeedbackByUserId,
  getFeedbackWindow,
  updateFeedbackWindow,
  getFeedbackStats,
  getFeedbackByMentor,
  getFeedbackByStudent,
  updateFeedbackById,
} from "../../controllers/Feedback/feedbackController.js";

const router = Router();

router.use(protect);

router.get("/window", getFeedbackWindow);
router.patch("/window", restrictTo("admin"), updateFeedbackWindow);
router.get("/overview", restrictTo("admin", "hod", "director"), getFeedbackOverview);
router.get("/stats/:semester/:round", restrictTo("admin", "hod", "director"), getFeedbackStats);
router.get("/by-mentor/:mentorId", restrictTo("hod", "director"), getFeedbackByMentor);
router.get("/student/:studentId", getFeedbackByStudent);
router.get("/user/:userId", getFeedbackByUserId);
router.post("/", createOrUpdateFeedback);
router.patch("/:feedbackId", restrictTo("admin"), updateFeedbackById);
router.delete("/user/:userId", deleteFeedbackByUserId);

export default router;
