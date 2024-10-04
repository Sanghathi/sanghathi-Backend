import { Router } from "express";

import {
  getAllConversations,
  createNewConversation,
  getAllConversationsOfUser,
  deleteConversation,
} from "../../controllers/Conversation/privateConversationController.js";

const router = Router();

router.route("/").get(getAllConversations).post(createNewConversation);

router.route("/:id").get(getAllConversationsOfUser).delete(deleteConversation);

export default router;
