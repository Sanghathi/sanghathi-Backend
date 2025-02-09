// Import necessary modules and models
import { Router } from "express";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";

const router = Router();

// Get all students with their profiles and mentor details
router.get("/students", async (req, res) => {
  try {
    const students = await User.find({ roleName: "student" })
      .populate({
        path: "profile",
        model: "StudentProfile",
        select: "fullName usn department",
      })
      .populate({ path: "mentor", model: "User", select: "name" });

    res.status(200).json({ data: students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res
      .status(500)
      .json({ message: "Error fetching students", error: error.message });
  }
});

// Debug route to check student profiles
router.get("/debug-profiles", async (req, res) => {
  try {
    const sampleStudent = await User.findOne({ roleName: "student" });
    const studentProfile = await mongoose
      .model("StudentProfile")
      .findOne({ userId: sampleStudent?._id });

    res.json({
      sampleStudent,
      studentProfile,
      hasProfileRef: !!sampleStudent?.profile,
    });
  } catch (error) {
    console.error("Debug route error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create mentorship batch
router.post("/batch", async (req, res) => {
  try {
    const { mentorId, menteeIds, startDate } = req.body;
    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ message: "Invalid mentor ID" });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.roleName !== "faculty") {
      return res.status(400).json({ message: "Invalid mentor" });
    }

    const results = await Promise.all(
      menteeIds.map(async (menteeId) => {
        if (!mongoose.Types.ObjectId.isValid(menteeId)) return null;
        const mentee = await User.findById(menteeId);
        if (!mentee || mentee.roleName !== "student") return null;

        return await Mentorship.findOneAndUpdate(
          { menteeId },
          { mentorId, startDate },
          { upsert: true, new: true }
        );
      })
    );

    res.status(201).json({
      message: "Mentorships created successfully",
      count: results.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get mentor details using menteeId
router.get("/mentor/:menteeId", async (req, res) => {
  try {
    const { menteeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(menteeId)) {
      return res.status(400).json({ message: "Invalid mentee ID format" });
    }

    const mentorship = await Mentorship.findOne({
      menteeId: new mongoose.Types.ObjectId(menteeId),
    });
    if (!mentorship)
      return res.status(404).json({ message: "Mentorship not found" });

    const mentor = await User.findById(mentorship.mentorId, "name email role");
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    res.status(200).json({ mentor });
  } catch (error) {
    console.error("Error fetching mentor:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all mentees under a specific mentor
router.get("/:mentorId/mentees", async (req, res) => {
  try {
    const { mentorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ message: "Invalid mentor ID format" });
    }

    const mentorships = await Mentorship.find({ mentorId });
    if (!mentorships.length)
      return res
        .status(404)
        .json({ message: "No mentees found for this mentor" });

    const menteeIds = mentorships.map((m) => m.menteeId);
    const mentees = await User.find({
      _id: { $in: menteeIds },
      roleName: "student",
    });

    res.status(200).json({ mentees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all mentorship records
router.get("/", async (req, res) => {
  try {
    const mentorships = await Mentorship.find();
    res.status(200).json({ mentorships });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
