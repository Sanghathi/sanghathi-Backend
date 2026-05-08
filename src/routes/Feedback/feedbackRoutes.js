import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import {
  createOrUpdateFeedback,
  getFeedbackByUserId,
  getFeedbackOverview,
  deleteFeedbackByUserId,
  getFeedbackWindow,
  updateFeedbackWindow,
} from "../../controllers/Feedback/feedbackController.js";

const router = Router();

router.use(protect);

router.get("/window", getFeedbackWindow);
router.patch("/window", restrictTo("admin"), updateFeedbackWindow);
router.get("/overview", restrictTo("admin", "hod", "director"), getFeedbackOverview);
router.get("/user/:userId", getFeedbackByUserId);
router.post("/", createOrUpdateFeedback);
router.delete("/user/:userId", deleteFeedbackByUserId);

export default router;
