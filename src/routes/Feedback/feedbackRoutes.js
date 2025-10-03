import { Router } from "express";
import {
  createOrUpdateFeedback,
  getFeedbackByUserId,
  getAllFeedbackWithUsers,
  deleteFeedbackByUserId,
} from "../../controllers/Feedback/feedbackController.js";

const router = Router();


  router.get("/:userId", getFeedbackByUserId);


router.get("/", getAllFeedbackWithUsers);


router.post("/", createOrUpdateFeedback);


router.delete("/:userId", deleteFeedbackByUserId);

export default router;