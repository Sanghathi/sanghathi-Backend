// Import necessary modules and models
import { Router } from "express";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";
import { protect } from "../../controllers/authController.js";

import logger from "../../utils/logger.js";
const router = Router();

router.use(protect);

// Get all students with their profiles and mentor details
router.get("/students", async (req, res) => {
  try {
    // First get all students
    const students = await User.find({ roleName: "student" })
      .select("_id name email phone roleName avatar")
      .lean();
    logger.info(`Fetched ${students.length} students`);

    const studentIds = students.map((student) => student._id);
    const StudentProfile = mongoose.model("StudentProfile");
    const studentProfiles = await StudentProfile.find({
      userId: { $in: studentIds },
    })
      .select("userId department sem usn photo")
      .lean();

    const profileMap = new Map(
      studentProfiles.map((profile) => [profile.userId.toString(), profile])
    );
    
    // Get all mentorships
    const mentorships = await Mentorship.find()
      .select("mentorId menteeId")
      .lean();
    logger.info(`Fetched ${mentorships.length} mentorships`);
    
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
    })
      .select("_id name email avatar")
      .lean();
    
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
        roleName: student.roleName,
        avatar: student.avatar || null,
      };
      
      const profile = profileMap.get(student._id.toString());
      if (profile) {
        studentObj.department = profile.department;
        studentObj.sem = profile.sem;
        studentObj.usn = profile.usn;
        studentObj.avatar = profile.photo || studentObj.avatar;
        studentObj.photo = profile.photo || null;
      }
      
      // Add mentor data if exists
      const mentorId = menteeToMentorMap[student._id.toString()];
      if (mentorId) {
        const mentor = mentorMap[mentorId.toString()];
        if (mentor) {
          studentObj.mentor = {
            _id: mentor._id,
            name: mentor.name,
            email: mentor.email,
            avatar: mentor.avatar || null,
          };
        }
      }
      
      return studentObj;
    });
    
    res.status(200).json({ data: enhancedStudents });
  } catch (error) {
    logger.error("Error fetching students:", error);
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
    logger.error("Debug route error:", error);
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
    logger.error(error);
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

    const mentor = await User.findById(mentorship.mentorId, "name email role avatar").lean();
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    const facultyProfile = await mongoose
      .model("FacultyProfile")
      .findOne({ userId: mentor._id })
      .select("photo")
      .lean();

    const enhancedMentor = {
      ...mentor,
      avatar: facultyProfile?.photo || mentor.avatar || null,
      photo: facultyProfile?.photo || null,
    };

    res.status(200).json({ mentor: enhancedMentor });
  } catch (error) {
    logger.error("Error fetching mentor:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all mentees under a specific mentor with profile data in a single response
router.get("/:mentorId/mentees-with-profiles", async (req, res) => {
  try {
    const { mentorId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ message: "Invalid mentor ID format" });
    }

    const mentorships = await Mentorship.find({ mentorId })
      .select("menteeId")
      .lean();

    if (!mentorships.length) {
      return res.status(200).json({
        mentees: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      });
    }

    const menteeIds = mentorships.map((mentorship) => mentorship.menteeId);

    const [mentees, total] = await Promise.all([
      User.find({
        _id: { $in: menteeIds },
        roleName: "student",
      })
        .select("_id name email phone avatar")
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({
        _id: { $in: menteeIds },
        roleName: "student",
      }),
    ]);

    const currentMenteeIds = mentees.map((mentee) => mentee._id);

    const StudentProfile = mongoose.model("StudentProfile");
    const profiles = await StudentProfile.find({
      userId: { $in: currentMenteeIds },
    })
      .select("userId department sem usn photo")
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [profile.userId.toString(), profile])
    );

    const menteesWithProfiles = mentees.map((mentee) => {
      const profile = profileMap.get(mentee._id.toString());
      return {
        ...mentee,
        avatar: profile?.photo || mentee.avatar || null,
        profile: profile
          ? {
              department: profile.department,
              sem: profile.sem,
              usn: profile.usn,
              photo: profile.photo || null,
            }
          : null,
      };
    });

    res.status(200).json({
      mentees: menteesWithProfiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    logger.error("Error fetching mentees with profiles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all mentees under a specific mentor
router.get("/:mentorId/mentees", async (req, res) => {
  try {
    const { mentorId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ message: "Invalid mentor ID format" });
    }

    const mentorships = await Mentorship.find({ mentorId })
      .select("menteeId")
      .lean();
    if (!mentorships.length)
      return res.status(200).json({
        mentees: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      });

    const menteeIds = mentorships.map((m) => m.menteeId);
    const [mentees, total] = await Promise.all([
      User.find({
        _id: { $in: menteeIds },
        roleName: "student",
      })
        .select("_id name email phone roleName avatar")
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({
        _id: { $in: menteeIds },
        roleName: "student",
      }),
    ]);

    res.status(200).json({
      mentees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all mentorship records
router.get("/", async (req, res) => {
  try {
    const mentorships = await Mentorship.find();
    res.status(200).json({ mentorships });
  } catch (error) {
    logger.error(error);
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
    logger.error("Debug mentorships error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Special endpoint for MentorAllocation page
router.get("/allocation-students", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000);
    const skip = (page - 1) * limit;
    const department = req.query.department;
    const sem = req.query.sem;

    const StudentProfile = mongoose.model("StudentProfile");
    const profileFilter = {};

    if (department && department !== "all") {
      profileFilter.department = department;
    }

    if (sem && sem !== "all") {
      profileFilter.sem = sem;
    }

    let filteredProfileUserIds = null;
    if (Object.keys(profileFilter).length) {
      const filteredProfiles = await StudentProfile.find(profileFilter)
        .select("userId")
        .lean();

      filteredProfileUserIds = filteredProfiles.map((profile) => profile.userId);

      if (!filteredProfileUserIds.length) {
        return res.status(200).json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        });
      }
    }

    const studentFilter = { roleName: "student" };
    if (filteredProfileUserIds) {
      studentFilter._id = { $in: filteredProfileUserIds };
    }

    const [students, totalStudents] = await Promise.all([
      User.find(studentFilter)
        .select("_id name email phone roleName avatar")
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(studentFilter),
    ]);
    logger.info(`Fetched ${students.length} students for allocation`);

    if (!students.length) {
      return res.status(200).json({
        data: [],
        pagination: {
          page,
          limit,
          total: totalStudents,
          totalPages: Math.max(Math.ceil(totalStudents / limit), 1),
        },
      });
    }

    const studentIds = students.map((student) => student._id);

    const studentProfiles = await StudentProfile.find({
      userId: { $in: studentIds },
    })
      .select("userId usn department sem photo")
      .lean();
    logger.info(`Found ${studentProfiles.length} student profiles for current page`);

    const profileMap = {};
    studentProfiles.forEach((profile) => {
      profileMap[profile.userId.toString()] = profile;
    });

    const mentorships = await Mentorship.find({
      menteeId: { $in: studentIds },
    })
      .select("mentorId menteeId")
      .lean();
    logger.info(`Found ${mentorships.length} mentorships`);
    
    // Get all mentor IDs from mentorships
    const mentorIds = [...new Set(mentorships.map(m => m.mentorId.toString()))];
    logger.info(`Found ${mentorIds.length} unique mentor IDs`);
    
    // Fetch all mentors
    const mentors = await User.find({ 
      _id: { $in: mentorIds.map(id => new mongoose.Types.ObjectId(id)) } 
    })
      .select("_id name email avatar")
      .lean();
    logger.info(`Found ${mentors.length} mentors`);
    
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
        studentObj.avatar = profile.photo || studentObj.avatar || null;
        studentObj.photo = profile.photo || null;
      }
      
      // Add mentor data if exists
      const mentorId = menteeToMentorIdMap[student._id.toString()];
      if (mentorId) {
        const mentor = mentorMap[mentorId];
        if (mentor) {
          studentObj.mentor = {
            name: mentor.name,
            _id: mentor._id,
            avatar: mentor.avatar || null,
          };
        }
      }
      
      enhancedStudents.push(studentObj);
    }

    return res.status(200).json({
      data: enhancedStudents,
      pagination: {
        page,
        limit,
        total: totalStudents,
        totalPages: Math.max(Math.ceil(totalStudents / limit), 1),
      },
    });
  } catch (error) {
    logger.error("Error in allocation-students:", error);
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

    logger.info(`Unassigned ${result.deletedCount} mentorships`);

    res.status(200).json({
      message: "Mentors unassigned successfully",
      unassignedCount: result.deletedCount
    });
  } catch (error) {
    logger.error("Error unassigning mentors:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all mentors who have assigned mentees with their details
router.get("/mentors-with-mentees", async (req, res) => {
  try {
    const { department } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);

    const mentorships = await Mentorship.find().select("mentorId").lean();

    const mentorCounts = new Map();
    mentorships.forEach((mentorship) => {
      const mentorKey = mentorship.mentorId.toString();
      mentorCounts.set(mentorKey, (mentorCounts.get(mentorKey) || 0) + 1);
    });

    if (!mentorCounts.size) {
      return res.status(200).json({
        mentors: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      });
    }

    const mentorIds = Array.from(mentorCounts.keys()).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const FacultyProfile = mongoose.model("FacultyProfile");
    const facultyProfileFilter = {
      userId: { $in: mentorIds },
    };

    if (department && department !== "all") {
      facultyProfileFilter.department = department;
    }

    const facultyProfiles = await FacultyProfile.find(facultyProfileFilter)
      .select("userId department cabin photo")
      .lean();

    const facultyProfileMap = new Map(
      facultyProfiles.map((profile) => [profile.userId.toString(), profile])
    );

    const filteredMentorIds =
      department && department !== "all"
        ? facultyProfiles.map((profile) => profile.userId)
        : mentorIds;

    if (!filteredMentorIds.length) {
      return res.status(200).json({
        mentors: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      });
    }

    const mentors = await User.find({
      _id: { $in: filteredMentorIds },
      roleName: "faculty",
    })
      .select("_id name email phone department roleName avatar")
      .lean();

    const mentorsWithCounts = mentors.map(mentor => {
      const menteeCount = mentorCounts.get(mentor._id.toString()) || 0;
      const facultyProfile = facultyProfileMap.get(mentor._id.toString());

      return {
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        phone: mentor.phone,
        department: facultyProfile?.department || mentor.department,
        avatar: facultyProfile?.photo || mentor.avatar || null,
        photo: facultyProfile?.photo || null,
        roleName: mentor.roleName,
        menteeCount
      };
    });

    mentorsWithCounts.sort((a, b) => b.menteeCount - a.menteeCount);

    const total = mentorsWithCounts.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedMentors = mentorsWithCounts.slice(start, end);

    res.status(200).json({
      mentors: paginatedMentors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    logger.error("Error fetching mentors with mentees:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;