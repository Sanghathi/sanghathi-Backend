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
    const dryRun = req.body?.dryRun === true;
    const frontendHost = (process.env.CLIENT_HOST || process.env.FRONTEND_HOST || "https://sanghathi.com").replace(/\/$/, "");
    const threadUrl = `${frontendHost}/threads`;

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
        data: {
          recipients: [],
          openThreads: openThreads.length,
          subject: null,
          text: null,
          html: null,
          threadUrl,
          dryRun: true,
        },
      });
    }

    const subject = `New reply from your mentor`;
    const body = `Dear student,\n\nYou have a new mentor reply waiting in Sanghathi. Please review your active thread and respond when you can.\n\nOpen the conversation here: ${threadUrl}\n\nActive threads found: ${openThreads.length}\n\nRegards,\nSanghathi`;
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; background: linear-gradient(135deg, #111827 0%, #1d4ed8 52%, #0ea5e9 100%); padding: 24px; border-radius: 18px; color: #e5f0ff;">
        <div style="max-width: 680px; margin: 0 auto; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; padding: 28px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28);">
          <div style="display:inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px;">Mentor Reply</div>
          <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #ffffff;">A new thread reply is waiting</h1>
          <p style="margin: 0 0 14px; font-size: 16px; color: #dbeafe;">Hello, <strong>${mentorName}</strong> has sent a new message in your thread. Open the conversation and reply so the discussion stays active and visible.</p>
          <div style="background: rgba(255,255,255,0.12); border-left: 4px solid #34d399; padding: 14px 16px; border-radius: 12px; margin: 18px 0; color: #ecfdf5; font-weight: 600;">
            Active threads found: ${openThreads.length}
          </div>
          <div style="margin: 20px 0 24px;">
            <a href="${threadUrl}" style="display:inline-block; background: #f8fafc; color: #1d4ed8; text-decoration:none; padding: 14px 22px; border-radius: 12px; font-weight: 800; box-shadow: 0 12px 30px rgba(255,255,255,0.22);">Open Thread & Reply Now</a>
          </div>
          <p style="margin: 0; font-size: 14px; color: #bfdbfe;">If you cannot access the link, open Sanghathi and go to Threads.</p>
          <p style="margin: 18px 0 0; font-size: 14px; color: #bfdbfe;">Regards,<br/><strong>Sanghathi</strong></p>
        </div>
      </div>
    `;

    if (dryRun) {
      return res.status(200).json({
        status: "success",
        message: "Email preview ready.",
        data: {
          recipients: studentEmails,
          openThreads: openThreads.length,
          subject,
          text: body,
          html,
          threadUrl,
          dryRun: true,
        },
      });
    }

    await sendEmail({
      email: studentEmails,
      subject,
      message: body,
      html,
    });

    res.status(200).json({
      status: "success",
      message: "Email notification sent to open-thread students.",
      data: {
        recipients: studentEmails.length,
        openThreads: openThreads.length,
        threadUrl,
      },
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
