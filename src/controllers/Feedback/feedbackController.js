import Feedback from "../../models/Feedback/Feedback.js";
import FeedbackWindow from "../../models/Feedback/FeedbackWindow.js";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";
import mongoose from "mongoose";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import { resolveScopedDepartment } from "../../utils/tenantContext.js";

const WINDOW_KEY = "global";

const FEEDBACK_POPULATE = {
  path: "userId",
  select: "name email collegeCode roleName department",
};

// Utility: Calculate average score from 9 rating fields
const calculateAverageScore = (ratingFields) => {
  const fields = [
    "mentorAccessibility",
    "mentorInteraction",
    "academicHelp",
    "mentorConcern",
    "listeningSkills",
    "professionalMotivation",
    "barrierResolution",
    "systemEffectiveness",
    "continuationWillingness",
  ];

  const sum = fields.reduce((acc, field) => {
    const value = Number(ratingFields[field]);
    return acc + (Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0);
  }, 0);

  return Number((sum / fields.length).toFixed(2));
};

const ensureFeedbackWindow = async () => {
  return FeedbackWindow.findOneAndUpdate(
    { key: WINDOW_KEY },
    {
      $setOnInsert: {
        key: WINDOW_KEY,
        isEnabled: false,
        semester: "",
        feedbackRound: 1,
      },
    },
    { new: true, upsert: true }
  );
};

const normalizeRound = (value) => {
  const numericValue = Number(value);
  return [1, 2].includes(numericValue) ? numericValue : null;
};

const buildFeedbackFilter = ({ userId, semester, feedbackRound, department, college }) => {
  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  if (semester) {
    filter.semester = semester;
  }

  if (department) {
    // Use case-insensitive regex for department matching
    filter.department = { $regex: new RegExp(`^${department}$`, 'i') };
  }

  const normalizedRound = normalizeRound(feedbackRound);
  if (normalizedRound) {
    filter.feedbackRound = normalizedRound;
  }

  return filter;
};

const serializeFeedbackWindow = (windowDoc) => {
  if (!windowDoc) {
    return null;
  }

  return {
    _id: windowDoc._id,
    key: windowDoc.key,
    isEnabled: windowDoc.isEnabled,
    semester: windowDoc.semester,
    feedbackRound: windowDoc.feedbackRound,
    label: `Feedback ${windowDoc.feedbackRound || 1}`,
    updatedBy: windowDoc.updatedBy,
    createdAt: windowDoc.createdAt,
    updatedAt: windowDoc.updatedAt,
  };
};

export const getFeedbackWindow = catchAsync(async (_req, res) => {
  const windowDoc = await ensureFeedbackWindow();

  res.status(200).json({
    status: "success",
    data: {
      window: serializeFeedbackWindow(windowDoc),
    },
  });
});

export const updateFeedbackWindow = catchAsync(async (req, res, next) => {
  const { isEnabled, semester, feedbackRound } = req.body;
  const windowDoc = await ensureFeedbackWindow();

  if (typeof isEnabled === "boolean") {
    windowDoc.isEnabled = isEnabled;
  }

  if (semester !== undefined) {
    windowDoc.semester = String(semester).trim();
  }

  if (feedbackRound !== undefined) {
    const normalizedRound = normalizeRound(feedbackRound);
    if (!normalizedRound) {
      return next(new AppError("feedbackRound must be 1 or 2", 400));
    }
    windowDoc.feedbackRound = normalizedRound;
  }

  if (windowDoc.isEnabled && !windowDoc.semester) {
    return next(new AppError("semester is required to enable feedback", 400));
  }

  windowDoc.updatedBy = req.user._id;
  await windowDoc.save();

  res.status(200).json({
    status: "success",
    data: {
      window: serializeFeedbackWindow(windowDoc),
    },
  });
});

export const createOrUpdateFeedback = catchAsync(async (req, res, next) => {
  const {
    userId,
    mentorAccessibility,
    mentorInteraction,
    academicHelp,
    mentorConcern,
    listeningSkills,
    professionalMotivation,
    barrierResolution,
    systemEffectiveness,
    continuationWillingness,
    awareOfPST,
    awareOfPLT,
    remarks,
  } = req.body;

  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  // Validate all rating fields are provided (1-5)
  const ratingFields = {
    mentorAccessibility,
    mentorInteraction,
    academicHelp,
    mentorConcern,
    listeningSkills,
    professionalMotivation,
    barrierResolution,
    systemEffectiveness,
    continuationWillingness,
  };

  for (const [field, value] of Object.entries(ratingFields)) {
    const numValue = Number(value);
    if (!Number.isInteger(numValue) || numValue < 1 || numValue > 5) {
      return next(new AppError(`${field} must be an integer between 1 and 5`, 400));
    }
  }

  const activeWindow = await ensureFeedbackWindow();
  if (!activeWindow.isEnabled) {
    return next(new AppError("Feedback is currently disabled", 403));
  }

  if (!activeWindow.semester) {
    return next(new AppError("Feedback semester is not configured", 400));
  }

  const feedbackRound = normalizeRound(activeWindow.feedbackRound);
  if (!feedbackRound) {
    return next(new AppError("Feedback round is not configured", 400));
  }

  // Fetch user to get department - try User first, then StudentProfile
  let studentDept = "N/A";
  const userDoc = await User.findById(userId).select("department collegeCode");
  if (!userDoc) {
    return next(new AppError("User not found", 404));
  }

  if (userDoc.department) {
    studentDept = userDoc.department;
  } else {
    // Try to resolve from StudentProfile
    const StudentProfile = mongoose.model("StudentProfile");
    const profile = await StudentProfile.findOne({ userId: userDoc._id }).select("department").lean();
    if (profile?.department) {
      studentDept = profile.department;
    }
  }

  // Calculate average score
  const averageScore = calculateAverageScore(ratingFields);

  const updatedDoc = await Feedback.findOneAndUpdate(
    {
      userId,
      semester: activeWindow.semester,
      feedbackRound,
    },
    {
      $set: {
        userId,
        semester: activeWindow.semester,
        feedbackRound,
        department: studentDept,
        mentorAccessibility,
        mentorInteraction,
        academicHelp,
        mentorConcern,
        listeningSkills,
        professionalMotivation,
        barrierResolution,
        systemEffectiveness,
        continuationWillingness,
        awareOfPST: Boolean(awareOfPST),
        awareOfPLT: Boolean(awareOfPLT),
        remarks: remarks || "",
        averageScore,
        submittedAt: new Date(),
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate(FEEDBACK_POPULATE);

  res.status(200).json({
    status: "success",
    data: {
      feedback: updatedDoc,
      window: serializeFeedbackWindow(activeWindow),
    },
  });
});

export const getFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { semester, feedbackRound } = req.query;

  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const activeWindow = await ensureFeedbackWindow();
  const feedbackDoc = await Feedback.findOne(
    buildFeedbackFilter({
      userId,
      semester: semester || activeWindow.semester,
      feedbackRound: feedbackRound || activeWindow.feedbackRound,
    })
  )
    .sort({ createdAt: -1 })
    .populate(FEEDBACK_POPULATE);

  if (!feedbackDoc) {
    return next(new AppError("Feedback details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      feedback: feedbackDoc,
      window: serializeFeedbackWindow(activeWindow),
    },
  });
});

export const getFeedbackOverview = catchAsync(async (req, res) => {
  const activeWindow = await ensureFeedbackWindow();
  const { semester, feedbackRound, userId, department, college } = req.query;
  const scopedDepartment = await resolveScopedDepartment(req);
  
  const feedbackFilter = buildFeedbackFilter({
    semester: semester || activeWindow.semester,
    feedbackRound: feedbackRound || activeWindow.feedbackRound,
    userId,
    department: (req.user.roleName === 'hod' || req.user.roleName === 'director') 
      ? (scopedDepartment || department) 
      : department,
    college: college || req.user.collegeCode
  });

  const [feedbacks, totalCount, roundCounts, semesterCounts] = await Promise.all([
    Feedback.find(feedbackFilter)
      .sort({ createdAt: -1 })
      .populate(FEEDBACK_POPULATE)
      .lean(),
    Feedback.countDocuments(feedbackFilter),
    Feedback.aggregate([
      { $match: feedbackFilter },
      { $group: { _id: "$feedbackRound", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Feedback.aggregate([
      { $match: feedbackFilter },
      { $group: { _id: "$semester", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      window: serializeFeedbackWindow(activeWindow),
      summary: {
        totalCount,
        roundCounts,
        semesterCounts,
      },
      feedbacks,
    },
  });
});

export const deleteFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { semester, feedbackRound } = req.query;

  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const deletedDoc = await Feedback.findOneAndDelete(
    buildFeedbackFilter({ userId, semester, feedbackRound })
  );

  if (!deletedDoc) {
    return next(new AppError("Feedback details not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// ==================== NEW ENDPOINTS ====================

export const getFeedbackStats = catchAsync(async (req, res, next) => {
  const { semester, round } = req.params;
  const { department } = req.query;

  if (!semester || !round) {
    return next(new AppError("semester and round are required", 400));
  }

  const normalizedRound = normalizeRound(round);
  if (!normalizedRound) {
    return next(new AppError("round must be 1 or 2", 400));
  }

  const scopedDepartment = await resolveScopedDepartment(req);
  const activeDepartment = (req.user.roleName === 'hod' || req.user.roleName === 'director')
    ? (scopedDepartment || department)
    : (department || scopedDepartment);

  const filter = {
    semester,
    feedbackRound: normalizedRound,
  };

  if (activeDepartment) {
    filter.department = activeDepartment;
  }

  // Count total students and responded count
  const respondedCount = await Feedback.countDocuments(filter);
  
  // Calculate average score across all responses
  const statsAgg = await Feedback.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        averageScoreOverall: { $avg: "$averageScore" },
      },
    },
  ]);

  const averageScoreOverall = statsAgg[0]?.averageScoreOverall || 0;

  // Get total enrolled students dynamically from User model
  const enrollmentFilter = { roleName: "student" };
  if (semester) {
    enrollmentFilter.sem = Number(semester);
  }
  if (department) {
    enrollmentFilter.department = department;
  }

  const totalEnrolled = await User.countDocuments(enrollmentFilter);
  const responseRate = totalEnrolled > 0 ? ((respondedCount / totalEnrolled) * 100).toFixed(2) : 0;

  res.status(200).json({
    status: "success",
    data: {
      totalEnrolled,
      responded: respondedCount,
      responseRate: Number(responseRate),
      averageScoreOverall: Number(averageScoreOverall.toFixed(2)),
    },
  });
});

export const getFeedbackByMentor = catchAsync(async (req, res, next) => {
  const { mentorId } = req.params;
  const { semester, round, department } = req.query;

  if (!mentorId) {
    return next(new AppError("mentorId is required", 400));
  }

  // Fetch mentorships for this mentor
  const mentorships = await Mentorship.find({ mentorId }).select("menteeId");
  const menteeIds = mentorships.map((m) => m.menteeId);

  if (menteeIds.length === 0) {
    return res.status(200).json({
      status: "success",
      data: {
        mentors: [],
      },
    });
  }

  // Build filter for feedback
  const feedbackFilter = {
    userId: { $in: menteeIds },
  };

  if (semester) {
    feedbackFilter.semester = semester;
  }

  if (round) {
    const normalizedRound = normalizeRound(round);
    if (normalizedRound) {
      feedbackFilter.feedbackRound = normalizedRound;
    }
  }

  if (department) {
    feedbackFilter.department = department;
  }

  // Fetch mentor and feedback data
  const mentor = await User.findById(mentorId).select("name");
  const feedbacks = await Feedback.find(feedbackFilter)
    .populate(FEEDBACK_POPULATE)
    .sort({ submittedAt: -1 });

  // Group feedback by student/mentee
  const menteeMap = {};
  for (const feedback of feedbacks) {
    if (!menteeMap[feedback.userId._id]) {
      menteeMap[feedback.userId._id] = {
        studentId: feedback.userId._id,
        studentName: feedback.userId.name,
        feedbacks: [],
      };
    }
    menteeMap[feedback.userId._id].feedbacks.push(feedback);
  }

  const mentees = Object.values(menteeMap);

  res.status(200).json({
    status: "success",
    data: {
      mentors: [
        {
          mentorId,
          mentorName: mentor?.name || "Unknown",
          menteeCount: mentees.length,
          mentees,
        },
      ],
    },
  });
});

export const getFeedbackByStudent = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  const { semester, round } = req.query;

  if (!studentId) {
    return next(new AppError("studentId is required", 400));
  }

  const filter = {
    userId: studentId,
  };

  if (semester) {
    filter.semester = semester;
  }

  if (round) {
    const normalizedRound = normalizeRound(round);
    if (normalizedRound) {
      filter.feedbackRound = normalizedRound;
    }
  }

  const feedbacks = await Feedback.find(filter)
    .populate(FEEDBACK_POPULATE)
    .sort({ feedbackRound: 1, submittedAt: -1 });

  if (feedbacks.length === 0) {
    return next(new AppError("No feedback found for this student", 404));
  }

  // Group by round for easier consumption
  const feedbackByRound = {};
  for (const feedback of feedbacks) {
    if (!feedbackByRound[feedback.feedbackRound]) {
      feedbackByRound[feedback.feedbackRound] = feedback;
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      feedbacks,
      feedbackByRound,
    },
  });
});

export const updateFeedbackById = catchAsync(async (req, res, next) => {
  const { feedbackId } = req.params;
  const {
    mentorAccessibility,
    mentorInteraction,
    academicHelp,
    mentorConcern,
    listeningSkills,
    professionalMotivation,
    barrierResolution,
    systemEffectiveness,
    continuationWillingness,
    awareOfPST,
    awareOfPLT,
    remarks,
  } = req.body;

  if (!feedbackId) {
    return next(new AppError("feedbackId is required", 400));
  }

  // Validate rating fields if provided
  const ratingFields = {
    mentorAccessibility,
    mentorInteraction,
    academicHelp,
    mentorConcern,
    listeningSkills,
    professionalMotivation,
    barrierResolution,
    systemEffectiveness,
    continuationWillingness,
  };

  // Filter out undefined values and validate
  const updateData = {};
  for (const [field, value] of Object.entries(ratingFields)) {
    if (value !== undefined) {
      const numValue = Number(value);
      if (!Number.isInteger(numValue) || numValue < 1 || numValue > 5) {
        return next(new AppError(`${field} must be an integer between 1 and 5`, 400));
      }
      updateData[field] = numValue;
    }
  }

  // Add yes/no and text fields if provided
  if (awareOfPST !== undefined) {
    updateData.awareOfPST = Boolean(awareOfPST);
  }
  if (awareOfPLT !== undefined) {
    updateData.awareOfPLT = Boolean(awareOfPLT);
  }
  if (remarks !== undefined) {
    updateData.remarks = remarks;
  }

  // Fetch existing feedback to calculate new average if rating fields changed
  const existingFeedback = await Feedback.findById(feedbackId);
  if (!existingFeedback) {
    return next(new AppError("Feedback not found", 404));
  }

  // Merge with existing data to calculate average
  const mergedData = {
    mentorAccessibility: updateData.mentorAccessibility || existingFeedback.mentorAccessibility,
    mentorInteraction: updateData.mentorInteraction || existingFeedback.mentorInteraction,
    academicHelp: updateData.academicHelp || existingFeedback.academicHelp,
    mentorConcern: updateData.mentorConcern || existingFeedback.mentorConcern,
    listeningSkills: updateData.listeningSkills || existingFeedback.listeningSkills,
    professionalMotivation: updateData.professionalMotivation || existingFeedback.professionalMotivation,
    barrierResolution: updateData.barrierResolution || existingFeedback.barrierResolution,
    systemEffectiveness: updateData.systemEffectiveness || existingFeedback.systemEffectiveness,
    continuationWillingness: updateData.continuationWillingness || existingFeedback.continuationWillingness,
  };

  // Recalculate average score
  const averageScore = calculateAverageScore(mergedData);
  updateData.averageScore = averageScore;

  const updatedFeedback = await Feedback.findByIdAndUpdate(feedbackId, updateData, {
    new: true,
    runValidators: true,
  }).populate(FEEDBACK_POPULATE);

  res.status(200).json({
    status: "success",
    data: {
      feedback: updatedFeedback,
    },
  });
});
