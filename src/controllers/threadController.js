import catchAsync from "../utils/catchAsync.js";
import mongoose from "mongoose";
import Thread from "../models/Thread.js";
import Message from "../models/Conversation/Message.js";
import AppError from "../utils/appError.js";
import ThreadService from "../services/threadService.js";
import {
  getScopedCollegeCode,
  mergeCollegeScope,
  resolveScopedDepartment,
} from "../utils/tenantContext.js";
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

const getScopedThreadUserIds = async (req, scopedDepartment) => {
  if (!scopedDepartment) {
    return null;
  }

  const collegeCode = getScopedCollegeCode(req);
  const departmentFilter = { department: { $regex: `^${scopedDepartment}$`, $options: "i" } };
  const User = mongoose.model("User");
  const StudentProfile = mongoose.model("StudentProfile");
  const FacultyProfile = mongoose.model("FacultyProfile");

  const [studentUsers, facultyUsers, studentProfiles, facultyProfiles] = await Promise.all([
    User.find(
      mergeCollegeScope({ roleName: "student", ...departmentFilter }, collegeCode)
    )
      .select("_id")
      .lean(),
    User.find(
      mergeCollegeScope({ roleName: "faculty", ...departmentFilter }, collegeCode)
    )
      .select("_id")
      .lean(),
    StudentProfile.find(mergeCollegeScope(departmentFilter, collegeCode))
      .select("userId")
      .lean(),
    FacultyProfile.find(mergeCollegeScope(departmentFilter, collegeCode))
      .select("userId")
      .lean(),
  ]);

  const scopedIds = new Set();

  for (const user of [...studentUsers, ...facultyUsers]) {
    if (user?._id) {
      scopedIds.add(user._id.toString());
    }
  }

  for (const profile of [...studentProfiles, ...facultyProfiles]) {
    if (profile?.userId) {
      scopedIds.add(profile.userId.toString());
    }
  }

  return scopedIds.size ? Array.from(scopedIds).map((id) => new mongoose.Types.ObjectId(id)) : [];
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
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 10000);
  const skip = (page - 1) * limit;
  const scopedDepartment = await resolveScopedDepartment(req);
  const scopedThreadUserIds = await getScopedThreadUserIds(req, scopedDepartment);

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.topic) {
    filter.topic = req.query.topic;
  }

  // Add participant filtering
  if (req.query.participantIds) {
    const participantIds = Array.isArray(req.query.participantIds)
      ? req.query.participantIds
      : [req.query.participantIds];
    
    // Filter threads where ALL specified participants are present
    filter.participants = { $all: participantIds.map(id => new mongoose.Types.ObjectId(id)) };
  }

  if (scopedThreadUserIds) {
    // If we already have a filter on participants, we need to combine it
    if (filter.participants) {
      // Keep the existing $all filter, but the author/participant must also be in scopedThreadUserIds
      // Actually, if we are filtering by specific participants, we usually don't need scopedThreadUserIds
      // unless we want to ensure the requester has access to these participants.
      // For now, let's just merge them if they don't conflict.
    } else {
      filter.$or = [
        { author: { $in: scopedThreadUserIds } },
        { participants: { $in: scopedThreadUserIds } }
      ];
    }
  }

  const collegeCode = getScopedCollegeCode(req);
  const scopedFilter = mergeCollegeScope(filter, collegeCode);

  const [threads, total] = await Promise.all([
    Thread.find(scopedFilter)
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
    Thread.countDocuments(scopedFilter),
  ]);

  const enrichedThreads = await enrichThreadsWithProfilePhotos(threads);

  // Add message counts to each thread
  const threadsWithCounts = await Promise.all(
    enrichedThreads.map(async (thread) => {
      const messageCount = await Message.countDocuments({
        parentType: "thread",
        parentId: thread._id,
      });
      return { ...thread, messageCount };
    })
  );

  res.status(200).json({
    status: "success",
    results: threadsWithCounts.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      threads: threadsWithCounts,
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
  const scopedDepartment = await resolveScopedDepartment(req);
  const scopedThreadUserIds = await getScopedThreadUserIds(req, scopedDepartment);
  const collegeCode = getScopedCollegeCode(req);
  const scopedThreadFilter = scopedThreadUserIds
    ? mergeCollegeScope(
        {
          _id: threadId,
          $or: [{ author: { $in: scopedThreadUserIds } }, { participants: { $in: scopedThreadUserIds } }],
        },
        collegeCode
      )
    : mergeCollegeScope({ _id: threadId }, collegeCode);


  const [thread, latestMessages, totalMessages] = await Promise.all([
    Thread.findOne(scopedThreadFilter)
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
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 10000);
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

