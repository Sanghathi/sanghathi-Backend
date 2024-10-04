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
  const threads = await Thread.find()
    .populate({
      path: "participants",
      select: "name avatar",
    })
    .populate({
      path: "author",
      select: "name avatar",
    });
  res.status(200).json({
    status: "success",
    data: {
      threads,
    },
  });
});

export const getThreadById = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  const thread = await Thread.findById(threadId)
    .populate({
      path: "participants",
      select: "name avatar",
    })
    .populate("messages");
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
  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const sendMessageToThread = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  const { body, senderId } = req.body;
  const newMessage = await Message.create({ senderId, body });

  await Thread.findByIdAndUpdate(
    threadId,
    { $push: { messages: newMessage._id } },
    { new: true }
  );

  res.status(201).json({
    status: "success",
    data: {
      message: newMessage,
    },
  });
});

export const getAllThreadsOfUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  const threads = await Thread.find({ participants: userId }).populate({
    path: "participants",
    select: "name avatar",
  });

  res.status(200).json({
    status: "success",
    data: {
      threads,
    },
  });
});
