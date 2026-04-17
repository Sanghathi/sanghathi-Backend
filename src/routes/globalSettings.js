import express from "express";
import GlobalSettings from "../models/GlobalSettings.js";
const router = express.Router();

// GET global settings
router.get("/", async (req, res) => {
  try {
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = await GlobalSettings.create({ mentorFeedbackEnabled: false });
    }
    res.json({ status: "success", data: { settings } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// PATCH global settings
router.patch("/", async (req, res) => {
  try {
    const { mentorFeedbackEnabled } = req.body;
    let settings = await GlobalSettings.findOneAndUpdate(
      {},
      { mentorFeedbackEnabled },
      { new: true, upsert: true }
    );
    res.json({ status: "success", data: { settings } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
