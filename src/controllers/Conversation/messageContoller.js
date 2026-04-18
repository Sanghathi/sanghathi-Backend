import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import Message from "../../models/Conversation/Message.js";
import GroupConversation from "../../models/Conversation/GroupConversation.js";
import PrivateConversation from "../../models/Conversation/PrivateConversation.js";

class ConversationAdapter {
  constructor(conversation, parentType) {
    this.conversation = conversation;
    this.parentType = parentType;
  }

  async getMessages(page = 1, limit = 100) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 300);
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      parentType: this.parentType,
      parentId: this.conversation._id,
    };

    const [latestMessages, total] = await Promise.all([
      Message.find(filter)
        .select("_id senderId body createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    return {
      messages: latestMessages.reverse(),
      total,
      page: safePage,
      limit: safeLimit,
    };
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

    res.status(201).json({
      status: "success",
      data: {
        message: newMessage,
      },
    });
  }),

  getMessagesInConversation: catchAsync(async (req, res, next) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);

    const { messages, total, page: safePage, limit: safeLimit } =
      await req.conversationAdapter.getMessages(page, limit);

    res.status(200).json({
      status: "success",
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1),
      },
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
      parentType
    );

    next();
  },
};

export default messageController;
