import { Router } from "express";
import Meeting from "../models/Meeting.js";
import logger from "../utils/logger.js";
import { z } from "zod";
import { protect, restrictTo } from "../controllers/authController.js";
import validateRequest from "../middlewares/validateRequest.js";

const router = Router();

const meetingCreateSchema = z.object({
  title: z.string().trim().min(1),
  location: z.string().trim().optional(),
  start: z.union([z.string().trim().min(1), z.date()]),
  end: z.union([z.string().trim().min(1), z.date()]),
  type: z.string().trim().optional(),
  recipients: z.array(z.any()).optional(),
});

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

router.post(
  "/",
  restrictTo("admin", "faculty", "hod", "director"),
  validateRequest(meetingCreateSchema),
  async (req, res) => {
    const { title, location, start, end, type, recipients } = req.body;
    logger.info("Creating new meeting", { title });

    const newMeeting = {
      title,
      location,
      start,
      end,
      type,
      recipients,
    };

    const meeting = new Meeting(newMeeting);

    try {
      const savedMeeting = await meeting.save();
      res.status(200).json(savedMeeting);
      logger.info("Meeting saved successfully", { meetingId: savedMeeting._id });
    } catch (err) {
      logger.error("Error saving meeting", {
        error: err.message,
        stack: err.stack,
      });
      res.status(500).json(err);
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const skip = (page - 1) * limit;

    const allowedFields = new Set([
      "_id",
      "title",
      "location",
      "start",
      "end",
      "type",
      "recipients",
    ]);
    const selectedFields = sanitizeSelectFields(
      req.query.fields,
      allowedFields,
      "_id title location start end type recipients"
    );

    const filter = {};

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.recipient) {
      filter.recipients = req.query.recipient;
    }

    if (req.query.from || req.query.to) {
      const startFilter = {};

      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (!Number.isNaN(fromDate.getTime())) {
          startFilter.$gte = fromDate.toISOString();
        }
      }

      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (!Number.isNaN(toDate.getTime())) {
          startFilter.$lte = toDate.toISOString();
        }
      }

      if (Object.keys(startFilter).length) {
        filter.start = startFilter;
      }
    }

    const [meetingsData, total] = await Promise.all([
      Meeting.find(filter)
        .select(selectedFields)
        .sort({ start: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Meeting.countDocuments(filter),
    ]);

    res.status(200).json({
      meetings: meetingsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
    logger.info("Meetings fetched successfully", {
      count: meetingsData.length,
      page,
      limit,
      total,
    });
  } catch (err) {
    logger.error("Error fetching meetings", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:meetId", restrictTo("admin", "faculty", "hod", "director"), async (req, res) => {
  const { meetId } = req.params;
  logger.info("Deleting meeting", { meetingId: meetId });

  try {
    const deletedMeeting = await Meeting.findByIdAndDelete(meetId);
    if (!deletedMeeting) {
      logger.warn("Meeting not found", { meetingId: meetId });
      return res.status(404).json({ message: "Meeting not found" });
    }
    res
      .status(200)
      .json({ message: "Meeting deleted successfully", deletedMeeting });
    logger.info("Meeting deleted successfully", { meetingId: meetId });
  } catch (err) {
    logger.error("Error deleting meeting", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: err.message });
  }
});

export default router;
