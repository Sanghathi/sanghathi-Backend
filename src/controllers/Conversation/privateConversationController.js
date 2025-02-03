import catchAsync from "../../utils/catchAsync.js";
import PrivateConversation from "../../models/Conversation/PrivateConversation.js";

export const getAllConversations = catchAsync(async (req, res, next) => {
  //   const userId = req.user._id;

  const conversations = await PrivateConversation.find().populate({
    path: "participants",
    select: "name avatar",
  });

  res.status(200).json({
    status: "success",
    data: {
      conversations,
    },
  });
});

export const getAllConversationsOfUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const conversations = await PrivateConversation.find({
    participants: { $in: [userId] },
  }).populate({
    path: "participants",
    select: "name avatar",
    options: { _id: 1 } // Explicit ID inclusion
  })

  res.status(200).json({
    status: "success",
    data: {
      conversations,
    },
  });
});

export const createNewConversation = catchAsync(async (req, res, next) => {
  const { participants } = req.body;
  const newConversation = await PrivateConversation.create({ participants });
  res.status(201).json({
    status: "success",
    data: {
      conversation: newConversation,
    },
  });
});

export const deleteConversation = catchAsync(async (req, res, next) => {
  const conversationId = req.params.id;
  await PrivateConversation.findByIdAndDelete(conversationId);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
