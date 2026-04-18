import { Router } from "express";
import Conversation from "../models/Conversation.js";
import { z } from "zod";
import { protect, restrictTo } from "../controllers/authController.js";
import validateRequest from "../middlewares/validateRequest.js";

const router = Router();

const mentorMenteeConversationSchema = z.object({
  mentorId: z.string().trim().min(1),
  menteeId: z.string().trim().min(1),
  moocChecked: z.boolean().optional(),
  projectChecked: z.boolean().optional(),
  conversationText: z.string().trim().min(30),
  title: z.string().trim().optional(),
  topic: z.string().trim().optional(),
});

const parseBooleanQuery = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
};

const sanitizeSelectFields = (rawFields, allowedFields, fallbackFields) => {
  if (!rawFields || typeof rawFields !== "string") {
    return fallbackFields;
  }

  const fields = rawFields
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field.length > 0 && allowedFields.has(field));

  return fields.length ? fields.join(" ") : fallbackFields;
};

router.use(protect);

// ✅ Get all conversations
router.get("/", restrictTo("admin", "faculty", "hod", "director"), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const allowedFields = new Set([
      "_id",
      "conversationId",
      "mentorId",
      "menteeId",
      "status",
      "title",
      "topic",
      "conversationText",
      "description",
      "summary",
      "moocChecked",
      "projectChecked",
      "isOffline",
      "date",
    ]);
    const selectedFields = sanitizeSelectFields(
      req.query.fields,
      allowedFields,
      "_id conversationId mentorId menteeId status title topic description summary moocChecked projectChecked isOffline date"
    );

    const filter = {};
    if (req.query.mentorId) {
      filter.mentorId = req.query.mentorId;
    }
    if (req.query.menteeId) {
      filter.menteeId = req.query.menteeId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.conversationId) {
      filter.conversationId = req.query.conversationId;
    }

    const isOffline = parseBooleanQuery(req.query.isOffline);
    if (isOffline !== undefined) {
      filter.isOffline = isOffline;
    }

    const hasSummary = parseBooleanQuery(req.query.hasSummary);
    if (hasSummary === true) {
      filter.description = { $exists: true, $ne: "" };
    }
    if (hasSummary === false) {
      filter.$or = [{ description: { $exists: false } }, { description: "" }];
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .select(selectedFields)
        .sort({ date: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    res.status(200).json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// ✅ New route: Mentor–Mentee Offline Conversation with Gemini Summary
// IMPORTANT: This must come BEFORE /:userId routes to avoid route conflicts
router.post(
  "/mentor-mentee",
  restrictTo("admin", "faculty", "hod", "director"),
  validateRequest(mentorMenteeConversationSchema),
  async (req, res) => {
    try {
      const { mentorId, menteeId, moocChecked, projectChecked, conversationText, title, topic } = req.body;

      // Import generateSummary
      const { generateSummary } = await import("../services/summaryService.js");

      // Create a mock thread object for Gemini summary generation
      const mockThread = {
        _id: `offline_${Date.now()}`,
        topic: topic || "Offline Mentorship",
        title: title || "Offline Conversation",
        participants: [
          { _id: mentorId, name: "Mentor", roleName: "faculty" },
          { _id: menteeId, name: "Mentee", roleName: "student" }
        ],
        messages: [
          {
            senderId: mentorId,
            body: conversationText
          }
        ]
      };

      const aiGeneratedSummary = await generateSummary(mockThread);

      // Create conversation with all details and AI summary
      const conversationData = {
        conversationId: `mentor-mentee-${Date.now()}`,
        mentorId,
        menteeId,
        title: title || "Offline Conversation",
        topic: topic || "Offline Mentorship",
        conversationText,
        description: aiGeneratedSummary || "", // Save AI summary as description
        summary: aiGeneratedSummary || "", // Also save in summary field for backward compatibility
        moocChecked: moocChecked || false,
        projectChecked: projectChecked || false,
        status: "closed",
        isOffline: true,
        date: new Date()
      };

      const newMentorMenteeConv = new Conversation(conversationData);
      const savedConv = await newMentorMenteeConv.save();

      res.status(201).json({
        message: "Mentor–Mentee conversation saved successfully with AI summary",
        data: {
          conversation: savedConv,
          aiSummary: aiGeneratedSummary // Return for frontend display
        }
      });
    } catch (err) {
      res.status(500).json({
        message: "Error creating mentor–mentee conversation",
        error: err.message
      });
    }
  }
);

// ✅ Create new conversation for a user
router.post("/:userId", async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      conversationId: req.params.userId,
    });

    if (conversation) {
      return res.status(400).json({ message: "Conversation already exists" });
    }

    const newConversation = new Conversation({
      conversationId: req.params.userId,
      status: "active",
    });

    const savedConversation = await newConversation.save();
    res.status(200).json(savedConversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ✅ Get conversation of a specific user
router.get("/:userId", async (req, res) => {
  try {
    const conversation = await Conversation.find({
      conversationId: req.params.userId,
    })
      .select("_id conversationId mentorId menteeId status title topic description summary moocChecked projectChecked isOffline date")
      .limit(1)
      .lean();
    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
