// src/routes/testSummaryRoutes.js
import express from "express";
import { generateSummary } from "../services/summaryService.js";
import { protect, restrictTo } from "../controllers/authController.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "hod", "director"));

router.post("/", async (req, res) => {
  try {
    const mockThread = req.body;
    const summary = await generateSummary(mockThread);
    res.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the summary." });
  }
});

export default router;
