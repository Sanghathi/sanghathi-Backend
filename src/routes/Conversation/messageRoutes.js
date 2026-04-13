import { Router } from "express";
import messageController from "../../controllers/Conversation/messageContoller.js";
import { protect } from "../../controllers/authController.js";

const router = Router();

router.use(protect);

router
  .route("/:id")
  .get(
    messageController.checkConversationType,
    messageController.getMessagesInConversation
  )
  .post(messageController.checkConversationType, messageController.sendMessage)
  .delete(messageController.deleteMessage);

export default router;
