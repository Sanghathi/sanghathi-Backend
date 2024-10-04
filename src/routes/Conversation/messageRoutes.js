import { Router } from "express";
import messageController from "../../controllers/Conversation/messageContoller.js";

const router = Router();

router
  .route("/:id")
  .get(
    messageController.checkConversationType,
    messageController.getMessagesInConversation
  )
  .post(messageController.checkConversationType, messageController.sendMessage)
  .delete(messageController.deleteMessage);

export default router;
