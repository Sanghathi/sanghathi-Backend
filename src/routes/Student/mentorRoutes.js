// Import necessary modules and models
import { Router } from "express";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";

const router = Router();

// Get all students with their profiles and mentor details
router.get("/students", async (req, res) => {
  try {
    // First get all students
    const students = await User.find({ roleName: "student" });
    console.log(`Fetched ${students.length} students`);
    
    // Get all mentorships
    const mentorships = await Mentorship.find();
    console.log(`Fetched ${mentorships.length} mentorships`);
    
    // Create mentee-to-mentor mapping
    const menteeToMentorMap = {};
    for (const mentorship of mentorships) {
      menteeToMentorMap[mentorship.menteeId.toString()] = mentorship.mentorId;
    }
    
    // Get unique mentor IDs
    const mentorIds = [...new Set(mentorships.map(m => m.mentorId.toString()))];
    
    // Fetch all mentors in a single query
    const mentors = await User.find({ 
      _id: { $in: mentorIds.map(id => new mongoose.Types.ObjectId(id)) } 
    });
    
    // Create mentor ID to mentor data mapping
    const mentorMap = {};
    mentors.forEach(mentor => {
      mentorMap[mentor._id.toString()] = mentor;
    });
    
    // Prepare response data
    const enhancedStudents = students.map(student => {
      // Convert to plain object 
      const studentObj = {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        roleName: student.roleName
      };
      
      // Add profile fields if they exist
      if (student.profile) {
        studentObj.department = student.profile.department;
        studentObj.sem = student.profile.sem;
        studentObj.usn = student.profile.usn;
      }
      
      // Add mentor data if exists
      const mentorId = menteeToMentorMap[student._id.toString()];
      if (mentorId) {
        const mentor = mentorMap[mentorId.toString()];
        if (mentor) {
          studentObj.mentor = {
            _id: mentor._id,
            name: mentor.name,
            email: mentor.email
          };
          console.log(`Added mentor ${mentor.name} to student ${student.name}`);
        }
      }
      
      return studentObj;
    });
    
    // Log a sample student to verify data structure
    if (enhancedStudents.length > 0) {
      console.log("Sample enhanced student:", JSON.stringify(enhancedStudents[0], null, 2));
    }

    res.status(200).json({ data: enhancedStudents });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching students", error: error.message });
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

// Debug endpoint to check mentorship structure
router.get("/debug-mentorships", async (req, res) => {
  try {
    // Get a few mentorships
    const mentorships = await Mentorship.find().limit(5);
    
    // For each mentorship, try to find the corresponding mentor and mentee
    const debugData = await Promise.all(mentorships.map(async (mentorship) => {
      const mentor = await User.findById(mentorship.mentorId);
      const mentee = await User.findById(mentorship.menteeId);
      
      return {
        mentorship: mentorship.toObject(),
        mentorExists: !!mentor,
        mentorData: mentor ? {
          _id: mentor._id,
          name: mentor.name,
          roleName: mentor.roleName
        } : null,
        menteeExists: !!mentee,
        menteeData: mentee ? {
          _id: mentee._id,
          name: mentee.name,
          roleName: mentee.roleName
        } : null
      };
    }));
    
    res.status(200).json({ 
      count: mentorships.length,
      debugData
    });
  } catch (error) {
    console.error("Debug mentorships error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Special endpoint for MentorAllocation page
router.get("/allocation-students", async (req, res) => {
  try {
    // First get all students
    const students = await User.find({ roleName: "student" }).lean();
    console.log(`Fetched ${students.length} students`);
    
    // Get all student IDs
    const studentIds = students.map(student => student._id);
    
    // Fetch student profiles directly
    const StudentProfile = mongoose.model("StudentProfile");
    const studentProfiles = await StudentProfile.find({ 
      userId: { $in: studentIds } 
    }).lean();
    console.log(`Found ${studentProfiles.length} student profiles`);
    
    // Create map of userId to profile for quick lookup
    const profileMap = {};
    studentProfiles.forEach(profile => {
      profileMap[profile.userId.toString()] = profile;
    });
    
    // Get all mentorships
    const mentorships = await Mentorship.find().lean();
    console.log(`Found ${mentorships.length} mentorships`);
    
    // Get all mentor IDs from mentorships
    const mentorIds = [...new Set(mentorships.map(m => m.mentorId.toString()))];
    console.log(`Found ${mentorIds.length} unique mentor IDs`);
    
    // Fetch all mentors
    const mentors = await User.find({ 
      _id: { $in: mentorIds.map(id => new mongoose.Types.ObjectId(id)) } 
    }).lean();
    console.log(`Found ${mentors.length} mentors`);
    
    // Create maps for quick lookups
    const mentorMap = {};
    mentors.forEach(mentor => {
      mentorMap[mentor._id.toString()] = mentor;
    });
    
    const menteeToMentorIdMap = {};
    mentorships.forEach(mentorship => {
      menteeToMentorIdMap[mentorship.menteeId.toString()] = mentorship.mentorId.toString();
    });
    
    // Create the final student objects with mentor info
    const enhancedStudents = [];
    
    for (const student of students) {
      const studentObj = { ...student };
      
      // Get profile data from our map
      const profile = profileMap[student._id.toString()];
      
      // Directly add profile fields to the student object if available
      if (profile) {
        studentObj.usn = profile.usn;
        studentObj.department = profile.department;
        studentObj.sem = profile.sem;
        console.log(`Added profile data for student ${student.name}: USN=${profile.usn}, Dept=${profile.department}, Sem=${profile.sem}`);
      } else {
        console.log(`No profile found for student ${student.name} (${student._id})`);
      }
      
      // Add mentor data if exists
      const mentorId = menteeToMentorIdMap[student._id.toString()];
      if (mentorId) {
        const mentor = mentorMap[mentorId];
        if (mentor) {
          studentObj.mentor = {
            name: mentor.name,
            _id: mentor._id
          };
          console.log(`Added mentor ${mentor.name} to student ${student.name}`);
        }
      }
      
      enhancedStudents.push(studentObj);
    }
    
    // Log a sample for debugging
    if (enhancedStudents.length > 0) {
      const sample = enhancedStudents[0];
      console.log("Sample student:", JSON.stringify(sample, null, 2));
    }
    
    return res.status(200).json({ data: enhancedStudents });
  } catch (error) {
    console.error("Error in allocation-students:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Unassign mentor from students
router.delete("/unassign", async (req, res) => {
  try {
    const { menteeIds } = req.body;
    
    if (!menteeIds || !Array.isArray(menteeIds)) {
      return res.status(400).json({ message: "menteeIds array is required" });
    }

    // Validate mentee IDs
    const validMenteeIds = menteeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validMenteeIds.length === 0) {
      return res.status(400).json({ message: "No valid mentee IDs provided" });
    }

    // Delete mentorships for these mentees
    const result = await Mentorship.deleteMany({
      menteeId: { $in: validMenteeIds.map(id => new mongoose.Types.ObjectId(id)) }
    });

    console.log(`Unassigned ${result.deletedCount} mentorships`);

    res.status(200).json({
      message: "Mentors unassigned successfully",
      unassignedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error unassigning mentors:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;