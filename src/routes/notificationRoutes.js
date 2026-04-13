import { Router } from "express";
import { protect } from "../controllers/authController.js";
import {
  createNotification,
  getNotifications,
} from "../controllers/notificationController.js";

const router = Router();

router.use(protect);

router.post("/", createNotification).get("/:userId", getNotifications);

export default router;
