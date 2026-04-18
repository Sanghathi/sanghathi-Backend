import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import Message from "../../models/Conversation/Message.js";
import GroupConversation from "../../models/Conversation/GroupConversation.js";
import PrivateConversation from "../../models/Conversation/PrivateConversation.js";
import featureFlags from "../../config/featureFlags.js";

class ConversationAdapter {
  constructor(conversation, conversationModel, parentType) {
    this.conversation = conversation;
    this.conversationModel = conversationModel;
    this.parentType = parentType;
  }

  async sendMessage(newMessage) {
    if (!featureFlags.messageDualWriteArrays) {
      return;
    }

    await this.conversationModel.findByIdAndUpdate(this.conversation._id, {
      $push: { messages: newMessage._id },
    });
  }

  async getMessages() {
    if (featureFlags.messageReadFromParent) {
      const parentMessages = await Message.find({
        parentType: this.parentType,
        parentId: this.conversation._id,
      })
        .sort({ createdAt: 1 })
        .lean();

      if (parentMessages.length > 0) {
        return parentMessages;
      }
    }

    const conversation = await this.conversationModel
      .findById(this.conversation._id)
      .populate("messages");

    return conversation?.messages || [];
  }
}

const messageController = {
  sendMessage: catchAsync(async (req, res, next) => {
    const { body, senderId } = req.body;
    const conversation = req.conversationAdapter;

    if (!conversation?.conversation?._id) {
      return next(new AppError("Conversation not found", 404));
    }

    const newMessage = await Message.create({
      senderId,
      body,
      parentType: conversation.parentType,
      parentId: conversation.conversation._id,
    });
    await conversation.sendMessage(newMessage);

    res.status(201).json({
      status: "success",
      data: {
        message: newMessage,
      },
    });
  }),

  getMessagesInConversation: catchAsync(async (req, res, next) => {
    const messages = await req.conversationAdapter.getMessages();

    res.status(200).json({
      status: "success",
      data: {
        messages,
      },
    });
  }),

  deleteMessage: catchAsync(async (req, res, next) => {
    const messageId = req.params.id;
    await Message.findByIdAndDelete(messageId);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }),

  checkConversationType: async (req, res, next) => {
    const { type } = req.query;
    const { id: conversationId } = req.params;

    let conversationModel;
    let parentType;

    if (type === "private") {
      conversationModel = PrivateConversation;
      parentType = "private";
    } else if (type === "group") {
      conversationModel = GroupConversation;
      parentType = "group";
    } else {
      return next(new AppError("Invalid conversation type", 400));
    }

    const conversation = await conversationModel.findById(conversationId);
    if (!conversation) {
      return next(new AppError("Conversation not found", 404));
    }

    req.conversationAdapter = new ConversationAdapter(
      conversation,
      conversationModel,
      parentType
    );

    next();
  },
};

export default messageController;
