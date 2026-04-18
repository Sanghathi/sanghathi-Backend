import catchAsync from "../utils/catchAsync.js";
import Thread from "../models/Thread.js";
import Message from "../models/Conversation/Message.js";
import AppError from "../utils/appError.js";
import ThreadService from "../services/threadService.js";
import {
  buildProfilePhotoMap,
  enrichLeanUserAvatar,
  getUserIdFromEntity,
} from "../utils/profilePhotoResolver.js";

const threadService = new ThreadService();

const collectThreadUserIds = (threads = []) => {
  const userIds = [];

  threads.forEach((thread) => {
    const authorId = getUserIdFromEntity(thread?.author);
    if (authorId) {
      userIds.push(authorId);
    }

    if (Array.isArray(thread?.participants)) {
      thread.participants.forEach((participant) => {
        const participantId = getUserIdFromEntity(participant);
        if (participantId) {
          userIds.push(participantId);
        }
      });
    }
  });

  return userIds;
};

const enrichThreadsWithProfilePhotos = async (threads = []) => {
  if (!threads.length) {
    return threads;
  }

  const photoMap = await buildProfilePhotoMap(collectThreadUserIds(threads));
  if (!photoMap.size) {
    return threads;
  }

  return threads.map((thread) => ({
    ...thread,
    author: thread.author
      ? enrichLeanUserAvatar(thread.author, photoMap)
      : thread.author,
    participants: Array.isArray(thread.participants)
      ? thread.participants.map((participant) =>
          enrichLeanUserAvatar(participant, photoMap)
        )
      : thread.participants,
  }));
};

export const closeThread = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  try {
    const updatedThread = await threadService.closeThread(threadId);

    if (!updatedThread) {
      return next(new AppError("Thread not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        thread: updatedThread,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const openThread = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  try {
    const updatedThread = await threadService.openThread(threadId);
    if (!updatedThread) {
      return next(new AppError("Thread not found", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        thread: updatedThread,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const createNewThread = catchAsync(async (req, res, next) => {
  const { author, participants, title, topic } = req.body;
  const newThread = await threadService.createThread(
    author,
    participants,
    title,
    topic
  );
  await newThread.populate({
    path: "participants",
    select: "name avatar roleName",
  });
  const [enrichedThread] = await enrichThreadsWithProfilePhotos([
    newThread.toObject(),
  ]);

  res.status(201).json({
    status: "success",
    data: {
      thread: enrichedThread,
    },
  });
});

export const getAllThreads = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.topic) {
    filter.topic = req.query.topic;
  }

  const [threads, total] = await Promise.all([
    Thread.find(filter)
      .select("title description author participants status topic createdAt closedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "participants",
        select: "name avatar roleName",
      })
      .populate({
        path: "author",
        select: "name avatar roleName",
      })
      .lean(),
    Thread.countDocuments(filter),
  ]);

  const enrichedThreads = await enrichThreadsWithProfilePhotos(threads);

  res.status(200).json({
    status: "success",
    results: enrichedThreads.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      threads: enrichedThreads,
    },
  });
});

export const getThreadById = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;

  const messagePage = Math.max(parseInt(req.query.messagePage, 10) || 1, 1);
  const messageLimit = Math.min(
    Math.max(parseInt(req.query.messageLimit, 10) || 100, 1),
    300
  );
  const messageSkip = (messagePage - 1) * messageLimit;

  const messageFilter = { parentType: "thread", parentId: threadId };

  const [thread, latestMessages, totalMessages] = await Promise.all([
    Thread.findById(threadId)
      .select("title description author participants status topic createdAt closedAt")
      .populate({
        path: "participants",
        select: "name avatar roleName",
      })
      .populate({
        path: "author",
        select: "name avatar roleName",
      })
      .lean(),
    Message.find(messageFilter)
      .select("_id senderId body createdAt")
      .sort({ createdAt: -1 })
      .skip(messageSkip)
      .limit(messageLimit)
      .lean(),
    Message.countDocuments(messageFilter),
  ]);

  if (!thread) {
    return next(new AppError("Thread not found", 404));
  }

  const [enrichedThread] = await enrichThreadsWithProfilePhotos([thread]);

  enrichedThread.messages = latestMessages.reverse();

  res.status(200).json({
    status: "success",
    pagination: {
      messagePage,
      messageLimit,
      totalMessages,
      totalPages: Math.max(Math.ceil(totalMessages / messageLimit), 1),
    },
    data: {
      thread: enrichedThread,
    },
  });
});

export const deleteThread = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  const thread = await Thread.findByIdAndDelete(threadId);

  if (!thread) {
    return next(new AppError("Thread not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const sendMessageToThread = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  const { body, senderId } = req.body;

  const threadExists = await Thread.exists({ _id: threadId });
  if (!threadExists) {
    return next(new AppError("Thread not found", 404));
  }

  const newMessage = await Message.create({
    senderId,
    body,
    parentType: "thread",
    parentId: threadId,
  });

  res.status(201).json({
    status: "success",
    data: {
      message: newMessage,
    },
  });
});

export const getAllThreadsOfUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;
  const filter = { participants: userId };

  const [threads, total] = await Promise.all([
    Thread.find(filter)
      .select("title description participants status topic createdAt closedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "participants",
        select: "name avatar roleName",
      })
      .lean(),
    Thread.countDocuments(filter),
  ]);

  const enrichedThreads = await enrichThreadsWithProfilePhotos(threads);

  res.status(200).json({
    status: "success",
    results: enrichedThreads.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      threads: enrichedThreads,
    },
  });
});
