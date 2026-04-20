import express from "express";
import mongoose from "mongoose";
import AbsenceReport from "../models/AbsenceReport.js";
import User from "../models/User.js";
import Thread from "../models/Thread.js";
import { protect, restrictTo } from "../controllers/authController.js";

const router = express.Router();

router.use(protect);

router.get("/mentor/mentees", restrictTo("faculty", "admin", "hod", "director"), async (req, res) => {
  try {
    const mentees = await User.find({ mentorId: req.user.id }).select("name usn email");
    const menteeIds = mentees.map((m) => m._id);

    const reports = await AbsenceReport.find({ studentId: { $in: menteeIds } })
      .populate("studentId", "name usn email")
      .sort({ createdAt: -1 });

    const menteeAttendanceMap = {};
    mentees.forEach((mentee) => {
      menteeAttendanceMap[mentee._id.toString()] = {
        mentee,
        reports: reports.filter(
          (r) => r.studentId._id.toString() === mentee._id.toString()
        ),
      };
    });

    res.status(200).json({ status: "success", data: { menteeAttendanceMap } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.patch("/:id/approve", restrictTo("faculty", "admin", "hod", "director"), async (req, res) => {
  try {
    const report = await AbsenceReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ status: "error", message: "Report not found" });
    }

    report.status = "approved";
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    res.status(200).json({ status: "success", data: { report } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.patch("/:id/reject", restrictTo("faculty", "admin", "hod", "director"), async (req, res) => {
  try {
    const report = await AbsenceReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ status: "error", message: "Report not found" });
    }

    report.status = "rejected";
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    res.status(200).json({ status: "success", data: { report } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;