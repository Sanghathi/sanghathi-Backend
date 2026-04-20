import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import AbsenceReport from "../models/AbsenceReport.js";
import User from "../models/User.js";
import Thread from "../models/Thread.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "src/uploads/absence-reports";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/", upload.single("proof"), async (req, res) => {
  try {
    const { absentDate, reason } = req.body;
    const studentId = req.user.id;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ status: "error", message: "Student not found" });
    }

    let mentorId = student.mentorId;
    if (!mentorId) {
      const menteeAllocation = await mongoose.connection.collection("menteementorallocations").findOne({ studentId });
      if (menteeAllocation) {
        mentorId = menteeAllocation.mentorId;
      }
    }

    if (!mentorId) {
      return res.status(400).json({ status: "error", message: "No mentor assigned to this student" });
    }

    const absenceReport = await AbsenceReport.create({
      studentId,
      mentorId,
      absentDate: new Date(absentDate),
      reason,
      proof: req.file ? `/src/uploads/absence-reports/${req.file.filename}` : null,
    });

    res.status(201).json({ status: "success", data: { report: absenceReport } });
  } catch (error) {
    console.error("Error creating absence report:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/my", async (req, res) => {
  try {
    const reports = await AbsenceReport.find({ studentId: req.user.id })
      .sort({ createdAt: -1 });
    res.status(200).json({ status: "success", data: { reports } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/mentor/mentees", async (req, res) => {
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

router.patch("/:id/approve", async (req, res) => {
  try {
    const report = await AbsenceReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ status: "error", message: "Report not found" });
    }

    if (report.mentorId.toString() !== req.user.id) {
      return res.status(403).json({ status: "error", message: "Not authorized" });
    }

    report.status = "approved";
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    const student = await User.findById(report.studentId);
    const mentor = await User.findById(req.user.id);

    const thread = await Thread.create({
      title: `Attendance Approved - ${new Date(report.absentDate).toLocaleDateString()}`,
      topic: "absence_approval",
      author: req.user.id,
      participants: [
        { _id: req.user.id, name: mentor.name },
        { _id: student._id, name: student.name },
      ],
    });

    await thread.messages.create({
      threadId: thread._id,
      sender: req.user.id,
      text: `Your absence report for ${new Date(report.absentDate).toLocaleDateString()} has been approved. Reason: ${report.reason}`,
    });

    report.threadId = thread._id;
    await report.save();

    res.status(200).json({ status: "success", data: { report, thread } });
  } catch (error) {
    console.error("Error approving report:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.patch("/:id/reject", async (req, res) => {
  try {
    const report = await AbsenceReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ status: "error", message: "Report not found" });
    }

    if (report.mentorId.toString() !== req.user.id) {
      return res.status(403).json({ status: "error", message: "Not authorized" });
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