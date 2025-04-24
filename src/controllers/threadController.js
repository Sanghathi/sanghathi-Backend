import catchAsync from "../utils/catchAsync.js";
import Thread from "../models/Thread.js";
import Message from "../models/Conversation/Message.js";
import AppError from "../utils/appError.js";
import ThreadService from "../services/threadService.js";
import redisClient from "../utils/redisClient.js";
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

  const cacheKey = `thread:${threadId}`;
  const cachedThread = await redisClient.get(cacheKey);

  if (cachedThread) {
    console.log("used cache for threadbyuser")
    return res.status(200).json({
      status: "success (from cache)",
      data: {
        thread: JSON.parse(cachedThread),
      },
    });
  }

  const thread = await Thread.findById(threadId)
    .populate({
      path: "participants",
      select: "name avatar",
    })
    .populate("messages");

  if (!thread) return next(new AppError("Thread not found", 404));

  await redisClient.set(cacheKey, JSON.stringify(thread), {
    EX: 3600, // expires in 1 hour
  });

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
  const cacheKey = `threads:user:${userId}`;

  try {
    // Check if threads are already cached in Redis
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for user ${userId}`);
      return res.status(200).json({
        status: "success (from cache)",
        data: {
          threads: JSON.parse(cached),
        },
      });
    }

    // Fetch threads from database
    const threads = await Thread.find({ participants: userId }).populate({
      path: "participants",
      select: "name avatar",
    });
    
    // Log the threads fetched from the database
    console.log("Threads fetched from DB:", threads);

    // Clean up the threads before caching
    const cleanedThreads = threads.map(thread => {
      const obj = thread.toObject({ virtuals: true });

      obj._id = obj._id.toString();
      obj.author = obj.author?._id?.toString?.() || obj.author?.toString?.();
      obj.participants = obj.participants.map(p => ({
        _id: p._id.toString(),
        name: p.name,
        avatar: p.avatar,
      }));
      obj.messages = obj.messages.map(id => id.toString?.() || id);

      return obj;
    });

    // Log the cleaned threads before saving to Redis
    console.log("Cleaned threads:", cleanedThreads);

    // Save cleaned threads to Redis
    await redisClient.set(cacheKey, JSON.stringify(cleanedThreads), {
      EX: 3600, // Cache expiry time of 1 hour
    });

    res.status(200).json({
      status: "success",
      data: {
        threads: cleanedThreads,
      },
    });
  } catch (error) {
    console.error("Error fetching threads:", error);
    res.status(500).json({
      status: "fail",
      message: "Error fetching threads",
    });
  }
});

