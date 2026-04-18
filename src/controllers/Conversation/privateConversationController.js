import catchAsync from "../../utils/catchAsync.js";
import PrivateConversation from "../../models/Conversation/PrivateConversation.js";
import {
  buildProfilePhotoMap,
  enrichLeanUserAvatar,
  getUserIdFromEntity,
} from "../../utils/profilePhotoResolver.js";

const enrichConversationsWithProfilePhotos = async (conversations = []) => {
  if (!conversations.length) {
    return conversations;
  }

  const participantIds = [];

  conversations.forEach((conversation) => {
    if (Array.isArray(conversation?.participants)) {
      conversation.participants.forEach((participant) => {
        const participantId = getUserIdFromEntity(participant);
        if (participantId) {
          participantIds.push(participantId);
        }
      });
    }
  });

  const photoMap = await buildProfilePhotoMap(participantIds);
  if (!photoMap.size) {
    return conversations;
  }

  return conversations.map((conversation) => ({
    ...conversation,
    participants: Array.isArray(conversation.participants)
      ? conversation.participants.map((participant) =>
          enrichLeanUserAvatar(participant, photoMap)
        )
      : conversation.participants,
  }));
};

export const getAllConversations = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    PrivateConversation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "participants",
        select: "name avatar",
      })
      .lean(),
    PrivateConversation.countDocuments(),
  ]);

  const enrichedConversations = await enrichConversationsWithProfilePhotos(
    conversations
  );

  res.status(200).json({
    status: "success",
    results: enrichedConversations.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      conversations: enrichedConversations,
    },
  });
});

export const getAllConversationsOfUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const filter = { participants: { $in: [userId] } };

  const [conversations, total] = await Promise.all([
    PrivateConversation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "participants",
        select: "name avatar",
      })
      .lean(),
    PrivateConversation.countDocuments(filter),
  ]);

  const enrichedConversations = await enrichConversationsWithProfilePhotos(
    conversations
  );

  res.status(200).json({
    status: "success",
    results: enrichedConversations.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      conversations: enrichedConversations,
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
