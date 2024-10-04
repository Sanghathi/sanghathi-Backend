import Thread from "../models/Thread.js";
import { generateSummary } from "./summaryService.js";

class ThreadService {
  async closeThread(threadId) {
    console.log(threadId);
    const updatedThread = await Thread.findByIdAndUpdate(
      threadId,
      { status: "closed", closedAt: new Date() },
      { new: true }
    )
      .populate({
        path: "participants",
        select: "name avatar role",
      })
      .populate("messages");
    if (updatedThread) {
      //TODO : We want to limit the access to the api

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
      })
      .populate("messages");

    return updatedThread;
  }
}

export default ThreadService;
