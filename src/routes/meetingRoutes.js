import { Router } from "express";
import Meeting from "../models/Meeting.js";
import logger from "../utils/logger.js";

const router = Router();

router.post("/", async (req, res) => {
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
});

router.get("/", async (req, res) => {
  try {
    const meetingsData = await Meeting.find();
    res.status(200).json(meetingsData);
    logger.info("Meetings fetched successfully", {
      count: meetingsData.length,
    });
  } catch (err) {
    logger.error("Error fetching meetings", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:meetId", async (req, res) => {
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
