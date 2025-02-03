// Import necessary modules and models
import { Router } from "express";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    console.log('1. Starting to fetch students...');

    // First find all student users
    const students = await User.find({ roleName: "student" });
    console.log('2. Found students before population:', students);

    // Now populate their profiles and mentor
    const populatedStudents = await User.find({ roleName: "student" })
      .populate({
        path: 'profile',
        model: 'StudentProfile',
        select: 'fullName usn department'
      })
      .populate({
        path: 'mentor',
        model: 'User',
        select: 'name'
      });

    console.log('3. Students after profile and mentor population:', JSON.stringify(populatedStudents, null, 2));

    // Check individual student data
    populatedStudents.forEach((student, index) => {
      console.log(`4. Student ${index + 1}:`, {
        id: student._id,
        name: student.name,
        email: student.email,
        profileId: student.profile,
        hasProfile: !!student.profile
      });
    });

    // Get all StudentProfiles to verify they exist
    const allProfiles = await mongoose.model('StudentProfile').find({});
    console.log('5. All available student profiles:', allProfiles.length);

    res.status(200).json({
      data: populatedStudents
    });

  } catch (error) {
    console.error('Error in /students route:', error);
    res.status(500).json({
      message: "Error fetching students",
      error: error.message
    });
  }
});

router.get("/debug-profiles", async (req, res) => {
  try {
    const sampleStudent = await User.findOne({ roleName: "student" });
    console.log('Sample student:', sampleStudent);

    const sampleProfile = await mongoose.model('StudentProfile').findOne({});
    console.log('Sample profile:', sampleProfile);

    const studentProfile = await mongoose.model('StudentProfile').findOne({ 
      userId: sampleStudent._id 
    });
    console.log('Matching profile for student:', studentProfile);

    res.json({
      sampleStudent,
      sampleProfile,
      studentProfile,
      hasProfileRef: !!sampleStudent.profile,
      profileRefType: typeof sampleStudent.profile
    });

  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ error: error.message });
  }
});


// API route for creating a new mentorship
router.post("/batch", async (req, res, next) => {
  try {
    const { mentorId, menteeIds, startDate } = req.body;

    // Validate mentor
    const mentor = await User.findById(mentorId).populate("role");
    if (!mentor || !mentor.role || mentor.role.name !== "faculty") {
      return res.status(400).json({ message: "Invalid mentor ID" });
    }

    // Process each mentee in the batch
    const results = await Promise.all(
      menteeIds.map(async (menteeId) => {
        const mentee = await User.findById(menteeId).populate("role");
        if (!mentee || !mentee.role || mentee.role.name !== "student") {
          throw new Error(`Invalid mentee ID: ${menteeId}`);
        }

        // Update or create mentorship
        const existingMentorship = await Mentorship.findOne({ menteeId });
        if (existingMentorship) {
          existingMentorship.mentorId = mentorId;
          existingMentorship.startDate = startDate;
          return existingMentorship.save();
        } else {
          const mentorship = new Mentorship({
            mentorId,
            menteeId,
            startDate,
          });
          return mentorship.save();
        }
      })
    );

    return res.status(201).json({
      message: "Mentorships created successfully",
      mentor: {
        _id: mentor._id,
        name: mentor.name,
      },
      count: results.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
});

// API route for finding the mentor of a mentee
router.get("/:menteeId", async (req, res, next) => {
  try {
    const { menteeId } = req.params;

    const mentorship = await Mentorship.findOne({ menteeId });

    if (!mentorship) {
      return res.status(404).json({ message: "Mentorship not found" });
    }

    const mentor = await User.findById(mentorship.mentorId);

    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    return res.status(200).json({ mentor });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:mentorId/mentees", async (req, res, next) => {
  try {
    const { mentorId } = req.params;

    const mentorships = await Mentorship.find({ mentor: mentorId });

    if (!mentorships || mentorships.length === 0) {
      return res.status(404).json({ message: "Mentorship not found" });
    }

    const menteeIds = mentorships.map((mentorship) => mentorship.mentee);

    // Find all mentees with IDs in the menteeIds array
    const mentees = await User.find({
      _id: { $in: menteeIds },
      role: "student",
    });

    return res.status(200).json({ mentees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/", async (req, res, next) => {
  try {
    const mentorships = await Mentorship.find();

    return res.status(200).json({ mentorships });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
