import catchAsync from "../utils/catchAsync.js";
import mongoose from "mongoose";
import Thread from "../models/Thread.js";
import Message from "../models/Conversation/Message.js";
import AppError from "../utils/appError.js";
import ThreadService from "../services/threadService.js";
import sendEmail from "../utils/email.js";
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
import logger from "../utils/logger.js";

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

  const ThreadUser = mongoose.model("User");
  const [authorUser, participantUsers] = await Promise.all([
    ThreadUser.findById(author).select("name email roleName").lean(),
    ThreadUser.find({ _id: { $in: participants } })
      .select("name email roleName")
      .lean(),
  ]);

  const isStudentThread = (authorUser?.roleName || "").toLowerCase() === "student";
  const isFacultyThread = ["faculty", "mentor", "hod", "director"].includes(
    (authorUser?.roleName || "").toLowerCase()
  );
  const facultyRecipients = [...new Map(
    participantUsers
      .filter((participant) => (participant?.roleName || "").toLowerCase() === "faculty" && participant?.email)
      .map((participant) => [participant.email.toLowerCase(), participant.email.trim()])
  ).values()];
  const studentRecipients = [...new Map(
    participantUsers
      .filter((participant) => (participant?.roleName || "").toLowerCase() === "student" && participant?.email)
      .map((participant) => [participant.email.toLowerCase(), participant.email.trim()])
  ).values()];

  if (isStudentThread && facultyRecipients.length) {
    const frontendHost = (process.env.CLIENT_HOST || process.env.FRONTEND_HOST || "https://sanghathi.com").replace(/\/$/, "");
    const threadUrl = `${frontendHost}/threads/${enrichedThread._id}`;
    const studentName = authorUser?.name || "a student";
    const subject = `New thread created by ${studentName}`;
    const body = `Hello Faculty,\n\n${studentName} has created a new thread in Sanghathi and is waiting for your reply.\n\nOpen the thread here: ${threadUrl}\n\nTopic: ${enrichedThread.topic}\nTitle: ${enrichedThread.title}\n\nRegards,\nSanghathi`;
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; background: linear-gradient(135deg, #111827 0%, #1d4ed8 52%, #0ea5e9 100%); padding: 24px; border-radius: 18px; color: #e5f0ff;">
        <div style="max-width: 680px; margin: 0 auto; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; padding: 28px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28);">
          <div style="display:inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px;">New Student Thread</div>
          <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #ffffff;">A student has created a new thread</h1>
          <p style="margin: 0 0 14px; font-size: 16px; color: #dbeafe;"><strong>${studentName}</strong> has created a new thread and is waiting for your reply.</p>
          <div style="background: rgba(255,255,255,0.12); border-left: 4px solid #34d399; padding: 14px 16px; border-radius: 12px; margin: 18px 0; color: #ecfdf5; font-weight: 600;">
            Topic: ${enrichedThread.topic}<br />
            Title: ${enrichedThread.title}
          </div>
          <div style="margin: 20px 0 24px;">
            <a href="${threadUrl}" style="display:inline-block; background: #f8fafc; color: #1d4ed8; text-decoration:none; padding: 14px 22px; border-radius: 12px; font-weight: 800; box-shadow: 0 12px 30px rgba(255,255,255,0.22);">Open Thread & Reply</a>
          </div>
          <p style="margin: 0; font-size: 14px; color: #bfdbfe;">If you cannot access the link, open Sanghathi and go to Threads.</p>
          <p style="margin: 18px 0 0; font-size: 14px; color: #bfdbfe;">Regards,<br/><strong>Sanghathi</strong></p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: facultyRecipients,
        subject,
        message: body,
        html,
      });
    } catch (error) {
      logger.error("Failed to send student thread notification email", {
        threadId: enrichedThread._id,
        authorId: authorUser?._id,
        recipients: facultyRecipients,
        error: error?.message || error,
      });
    }
  }

  if (isFacultyThread && studentRecipients.length) {
    const frontendHost = (process.env.CLIENT_HOST || process.env.FRONTEND_HOST || "https://sanghathi.com").replace(/\/$/, "");
    const threadUrl = `${frontendHost}/threads/${enrichedThread._id}`;
    const facultyName = authorUser?.name || "your mentor";
    const subject = `New thread created by ${facultyName}`;
    const body = `Hello student,\n\n${facultyName} has created a new thread in Sanghathi. Please open the thread and respond when you can.\n\nOpen the conversation here: ${threadUrl}\n\nTopic: ${enrichedThread.topic}\nTitle: ${enrichedThread.title}\n\nRegards,\nSanghathi`;
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; background: linear-gradient(135deg, #111827 0%, #1d4ed8 52%, #0ea5e9 100%); padding: 24px; border-radius: 18px; color: #e5f0ff;">
        <div style="max-width: 680px; margin: 0 auto; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; padding: 28px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28);">
          <div style="display:inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px;">New Thread</div>
          <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #ffffff;">A new thread has been created</h1>
          <p style="margin: 0 0 14px; font-size: 16px; color: #dbeafe;"><strong>${facultyName}</strong> created a new thread for you in Sanghathi.</p>
          <div style="background: rgba(255,255,255,0.12); border-left: 4px solid #34d399; padding: 14px 16px; border-radius: 12px; margin: 18px 0; color: #ecfdf5; font-weight: 600;">
            Topic: ${enrichedThread.topic}<br />
            Title: ${enrichedThread.title}
          </div>
          <div style="margin: 20px 0 24px;">
            <a href="${threadUrl}" style="display:inline-block; background: #f8fafc; color: #1d4ed8; text-decoration:none; padding: 14px 22px; border-radius: 12px; font-weight: 800; box-shadow: 0 12px 30px rgba(255,255,255,0.22);">Open Thread</a>
          </div>
          <p style="margin: 0; font-size: 14px; color: #bfdbfe;">Regards,<br/><strong>Sanghathi</strong></p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: studentRecipients,
        subject,
        message: body,
        html,
      });
    } catch (error) {
      logger.error("Failed to send faculty thread notification email", {
        threadId: enrichedThread._id,
        authorId: authorUser?._id,
        recipients: studentRecipients,
        error: error?.message || error,
      });
    }
  }

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

  const thread = await Thread.findById(threadId)
    .select("title topic author participants status")
    .populate({
      path: "participants",
      select: "name email roleName",
    })
    .lean();

  if (!thread) {
    return next(new AppError("Thread not found", 404));
  }

  const sender = await mongoose.model("User").findById(senderId).select("name email roleName").lean();
  const messageCountBeforeInsert = await Message.countDocuments({
    parentType: "thread",
    parentId: threadId,
  });

  const newMessage = await Message.create({
    senderId,
    body,
    parentType: "thread",
    parentId: threadId,
  });

  const senderRole = (sender?.roleName || "").toLowerCase();
  const isMentorOrFaculty = senderRole === "faculty" || senderRole === "mentor" || senderRole === "hod" || senderRole === "director";

  if (messageCountBeforeInsert === 0 && isMentorOrFaculty) {
    const frontendHost = (process.env.CLIENT_HOST || process.env.FRONTEND_HOST || "https://sanghathi.com").replace(/\/$/, "");
    const threadUrl = `${frontendHost}/threads/${threadId}`;
    const recipientEmails = [...new Set(
      (Array.isArray(thread.participants) ? thread.participants : [])
        .filter((participant) => (participant?.roleName || "").toLowerCase() === "student" && participant?.email)
        .map((participant) => String(participant.email).trim())
        .filter(Boolean)
    )];

    if (recipientEmails.length) {
      const senderName = sender?.name || "your mentor";
      const subject = `New message from ${senderName}`;
      const messageText = `Hello,\n\n${senderName} has sent the first message in your Sanghathi thread. Please open the thread and reply when you can.\n\nOpen the conversation here: ${threadUrl}\n\nRegards,\nSanghathi`;
      const html = `
        <div style="font-family: Inter, Arial, sans-serif; background: linear-gradient(135deg, #111827 0%, #1d4ed8 52%, #0ea5e9 100%); padding: 24px; border-radius: 18px; color: #e5f0ff;">
          <div style="max-width: 680px; margin: 0 auto; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; padding: 28px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28);">
            <div style="display:inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px;">Thread Update</div>
            <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #ffffff;">A mentor has sent the first message</h1>
            <p style="margin: 0 0 14px; font-size: 16px; color: #dbeafe;"><strong>${senderName}</strong> started the conversation in your thread. Open it to review and reply.</p>
            <div style="background: rgba(255,255,255,0.12); border-left: 4px solid #34d399; padding: 14px 16px; border-radius: 12px; margin: 18px 0; color: #ecfdf5; font-weight: 600;">
              Thread: ${thread.title}<br />
              Topic: ${thread.topic}
            </div>
            <div style="margin: 20px 0 24px;">
              <a href="${threadUrl}" style="display:inline-block; background: #f8fafc; color: #1d4ed8; text-decoration:none; padding: 14px 22px; border-radius: 12px; font-weight: 800; box-shadow: 0 12px 30px rgba(255,255,255,0.22);">Open Thread</a>
            </div>
            <p style="margin: 0; font-size: 14px; color: #bfdbfe;">Regards,<br/><strong>Sanghathi</strong></p>
          </div>
        </div>
      `;

      try {
        await sendEmail({
          email: recipientEmails,
          subject,
          message: messageText,
          html,
        });
      } catch (error) {
        logger.error("Failed to send first-message thread notification email", {
          threadId,
          senderId,
          recipients: recipientEmails,
          error: error?.message || error,
        });
      }
    }
  }

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

