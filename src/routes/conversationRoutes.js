import { Router } from "express";

import Conversation from "../models/Conversation.js";

const router = Router();
router.get("/", async (req, res) => {
  try {
    const conversations = await Conversation.find();
    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/:userId", async (req, res) => {
  //check if thread already exists
  const conversation = await Conversation.findOne({
    conversationId: req.params.userId,
  });

  if (conversation) {
    return res.status(400).json({ message: "Conversation already exists" });
  }

  const newConversation = new Conversation({
    conversationId: req.params.userId,
    status: "active",
  });

  try {
    const savedConversation = await newConversation.save();
    res.status(200).json(savedConversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get conversation of a user ( each conversation will be mapped to a student)
router.get("/:userId", async (req, res) => {
  try {
    const conversation = await Conversation.find({
      conversationId: req.params.userId,
    });
    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
