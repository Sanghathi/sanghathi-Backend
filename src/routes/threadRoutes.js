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

const router = Router();

router.route("/").get(getAllThreads).post(createNewThread);

router.route("/").get(getAllThreads).post(createNewThread);
router.route("/:threadId").get(getThreadById).delete(deleteThread);
router.route("/:threadId/close").patch(closeThread);
router.route("/:threadId/open").patch(openThread);
router.route("/:threadId/messages").post(sendMessageToThread);

export default router;
