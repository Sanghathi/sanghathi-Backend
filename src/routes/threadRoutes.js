import { Router } from "express";
import {
  getAllThreads,
  createNewThread,
  getThreadById,
  deleteThread,
  closeThread,
  sendMessageToThread,
  openThread,
} from "../controllers/threadController.js";
import { protect, restrictTo } from "../controllers/authController.js";
import { z } from "zod";
import validateRequest from "../middlewares/validateRequest.js";
import Thread from "../models/Thread.js";
import sendEmail from "../utils/email.js";
import logger from "../utils/logger.js";

const router = Router();

const createThreadSchema = z.object({
  author: z.string().trim().min(1),
  participants: z.array(z.string().trim().min(1)).min(1),
  title: z.string().trim().min(1),
  topic: z.string().trim().min(1),
});

const threadMessageSchema = z.object({
  body: z.string().trim().min(1),
  senderId: z.string().trim().min(1),
});

router.use(protect);

router.post("/notify-open-thread-students", restrictTo("faculty"), async (req, res) => {
  try {
    const mentorId = req.user?._id;
    const mentorName = req.user?.name || "your mentor";

    const openThreads = await Thread.find({
      status: "open",
      $or: [{ author: mentorId }, { participants: mentorId }],
    })
      .select("title topic participants status")
      .populate({
        path: "participants",
        select: "name email roleName",
      })
      .lean();

    const studentEmails = [...new Set(
      openThreads
        .flatMap((thread) => Array.isArray(thread.participants) ? thread.participants : [])
        .filter((participant) => participant?.roleName === "student" && participant?.email)
        .map((participant) => participant.email.trim())
        .filter(Boolean)
    )];

    if (!studentEmails.length) {
      return res.status(200).json({
        status: "success",
        message: "No open-thread student email recipients found.",
        data: { recipients: 0, openThreads: openThreads.length },
      });
    }

    const subject = `Attendance attention needed from ${mentorName}`;
    const body = `Dear student,\n\nThis is a reminder from ${mentorName}. Please review your open thread and improve your attendance where required.\n\nOpen threads count: ${openThreads.length}\n\nRegards,\nSanghathi`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <p>Dear student,</p>
        <p>This is a reminder from <strong>${mentorName}</strong>. Please review your open thread and improve your attendance where required.</p>
        <p><strong>Open threads count:</strong> ${openThreads.length}</p>
        <p>Regards,<br/>Sanghathi</p>
      </div>
    `;

    await sendEmail({
      email: studentEmails,
      subject,
      message: body,
      html,
    });

    res.status(200).json({
      status: "success",
      message: "Email notification sent to open-thread students.",
      data: { recipients: studentEmails.length, openThreads: openThreads.length },
    });
  } catch (error) {
    logger.error("Failed to send open-thread email notification", error);
    res.status(500).json({
      status: "fail",
      message: error?.message || "Unable to send email notification",
    });
  }
});

router
  .route("/")
  .get(getAllThreads)
  .post(validateRequest(createThreadSchema), createNewThread);
router.route("/:threadId").get(getThreadById).delete(deleteThread);
router.route("/:threadId/close").patch(closeThread);
router.route("/:threadId/open").patch(openThread);
router
  .route("/:threadId/messages")
  .post(validateRequest(threadMessageSchema), sendMessageToThread);

export default router;
