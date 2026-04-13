import { Router } from "express";
import {
  getAllThreads,
  createNewThread,
  getThreadById,
  deleteThread,
  closeThread,
  sendMessageToThread,
  openThread,
} from "../controllers/threadController.js";
import { protect } from "../controllers/authController.js";
import { z } from "zod";
import validateRequest from "../middlewares/validateRequest.js";

const router = Router();

const createThreadSchema = z.object({
  author: z.string().trim().min(1),
  participants: z.array(z.string().trim().min(1)).min(1),
  title: z.string().trim().min(1),
  topic: z.string().trim().min(1),
});

const threadMessageSchema = z.object({
  body: z.string().trim().min(1),
  senderId: z.string().trim().min(1),
});

router.use(protect);

router
  .route("/")
  .get(getAllThreads)
  .post(validateRequest(createThreadSchema), createNewThread);
router.route("/:threadId").get(getThreadById).delete(deleteThread);
router.route("/:threadId/close").patch(closeThread);
router.route("/:threadId/open").patch(openThread);
router
  .route("/:threadId/messages")
  .post(validateRequest(threadMessageSchema), sendMessageToThread);

export default router;
