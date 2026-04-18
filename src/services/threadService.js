import Thread from "../models/Thread.js";
import Message from "../models/Conversation/Message.js";
import { generateSummary } from "./summaryService.js";

import logger from "../utils/logger.js";
class ThreadService {
  async getThreadMessages(threadId) {
    return Message.find({
      parentType: "thread",
      parentId: threadId,
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  async closeThread(threadId) {
    logger.info(threadId);
    const updatedThread = await Thread.findByIdAndUpdate(
      threadId,
      { status: "closed", closedAt: new Date() },
      { new: true }
    )
      .populate({
        path: "participants",
        select: "name avatar role",
      });

    if (updatedThread) {
      updatedThread.messages = await this.getThreadMessages(threadId);
      const summary = await generateSummary(updatedThread);

      updatedThread.description = summary;
      await updatedThread.save();
    }

    return updatedThread;
  }

  async createThread(author, participants, title, topic) {
    const newThread = await Thread.create({
      title,
      topic,
      author,
      participants,
    });
    await newThread.populate({
      path: "participants",
      select: "name avatar",
    });

    return newThread;
  }

  async openThread(threadId) {
    const updatedThread = await Thread.findByIdAndUpdate(
      threadId,
      { status: "open", closedAt: null },
      { new: true }
    )
      .populate({
        path: "participants",
        select: "name avatar role",
      });

    if (updatedThread) {
      updatedThread.messages = await this.getThreadMessages(threadId);
    }

    return updatedThread;
  }
}

export default ThreadService;
