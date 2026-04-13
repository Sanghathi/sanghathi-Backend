import { Router } from "express";
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateFeedback,
  getFeedbackByUserId,
  getAllFeedbackWithUsers,
  deleteFeedbackByUserId,
} from "../../controllers/Feedback/feedbackController.js";

const router = Router();

router.use(protect);


  router.get("/:userId", getFeedbackByUserId);


router.get("/", getAllFeedbackWithUsers);


router.post("/", createOrUpdateFeedback);


router.delete("/:userId", deleteFeedbackByUserId);

export default router;