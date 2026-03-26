import MentorFeedback from "../../../models/FeedbackForm/MentorFeedback/MentorFeedback.js";
import StudentProfile from "../../../models/Student/Profile.js";
import catchAsync from "../../../utils/catchAsync.js";
import AppError from "../../../utils/appError.js";

const formatMentorFeedback = async (feedbackDoc) => {
  if (!feedbackDoc) return null;

  const feedback = feedbackDoc.toObject ? feedbackDoc.toObject() : feedbackDoc;
  const studentProfile = await StudentProfile.findOne({ userId: feedback.userId?._id || feedback.userId })
    .select("usn sem department fullName")
    .lean();

  return {
    ...feedback,
    studentProfile,
    semester: studentProfile?.sem ?? feedback.semester ?? null,
    usn: studentProfile?.usn ?? null,
    studentName:
      feedback.userId?.name ||
      [studentProfile?.fullName?.firstName, studentProfile?.fullName?.lastName]
        .filter(Boolean)
        .join(" ") ||
      null,
  };
};

// Create Mentor Feedback
export const createMentorFeedback = catchAsync(async (req, res, next) => {
  const {
    userId,
    mentorFeedback,
    pstMembersAware,
    pltMembersAware,
    remarks,
    rateMentor,
    averageScore
  } = req.body;

  if (!userId || !mentorFeedback || !pstMembersAware || !pltMembersAware || !rateMentor || averageScore === undefined) {
    return next(new AppError("Missing required fields", 400));
  }

  const studentProfile = await StudentProfile.findOne({ userId }).select("sem usn").lean();
  if (!studentProfile) {
    return next(new AppError("Student profile not found for this user", 404));
  }

  const newFeedback = await MentorFeedback.create({
    userId,
    mentorFeedback,
    pstMembersAware,
    pltMembersAware,
    remarks,
    semester: studentProfile.sem,
    rateMentor,
    averageScore
  });

  const populatedFeedback = await MentorFeedback.findById(newFeedback._id)
    .populate("userId", "name email");

  res.status(201).json({
    status: "success",
    data: {
      feedback: await formatMentorFeedback(populatedFeedback),
    },
  });
});

// Get Mentor Feedback by User ID
export const getMentorFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const feedbackDoc = await MentorFeedback.findOne({ userId }).populate("userId", "name email");
  if (!feedbackDoc) {
    return next(new AppError("Mentor feedback not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      feedback: await formatMentorFeedback(feedbackDoc),
    },
  });
});

export const getMentorFeedbackById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const feedbackDoc = await MentorFeedback.findById(id).populate("userId", "name email");
  if (!feedbackDoc) {
    return next(new AppError("Mentor feedback not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: await formatMentorFeedback(feedbackDoc),
  });
});

// Get all Mentor Feedback
export const getAllMentorFeedback = catchAsync(async (req, res, next) => {
  const results = await MentorFeedback.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  const formattedResults = await Promise.all(results.map(formatMentorFeedback));

  res.status(200).json({
    status: "success",
    results: formattedResults.length,
    data: formattedResults,
  });
});

// Delete Mentor Feedback by ID
export const deleteMentorFeedbackById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return next(new AppError("Feedback ID is required", 400));
  }

  const deletedDoc = await MentorFeedback.findByIdAndDelete(id);
  if (!deletedDoc) {
    return next(new AppError("Mentor feedback not found for deletion", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Mentor feedback deleted successfully",
    data: null,
  });
});
