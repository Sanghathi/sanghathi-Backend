import catchAsync from "../utils/catchAsync.js";
import Thread from "../models/Thread.js";
import Message from "../models/Conversation/Message.js";
import AppError from "../utils/appError.js";
import ThreadService from "../services/threadService.js";

const threadService = new ThreadService();

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
    select: "name avatar",
  });
  res.status(201).json({
    status: "success",
    data: {
      thread: newThread,
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "participants",
        select: "name avatar",
      })
      .populate({
        path: "author",
        select: "name avatar",
      })
      .lean(),
    Thread.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: threads.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      threads,
    },
  });
});

export const getThreadById = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  const [thread, messages] = await Promise.all([
    Thread.findById(threadId)
      .populate({
        path: "participants",
        select: "name avatar",
      })
      .lean(),
    Message.find({ parentType: "thread", parentId: threadId })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  if (!thread) {
    return next(new AppError("Thread not found", 404));
  }

  thread.messages = messages;

  res.status(200).json({
    status: "success",
    data: {
      thread,
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "participants",
        select: "name avatar",
      })
      .lean(),
    Thread.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: threads.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      threads,
    },
  });
});
