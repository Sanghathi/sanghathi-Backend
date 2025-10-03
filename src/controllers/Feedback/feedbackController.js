// controllers/feedbackController.js

import Feedback from "../../models/Feedback/Feedback.js";  // rename model alias to avoid confusion
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js";

// Create or Update Feedback Details
export const createOrUpdateFeedback = catchAsync(async (req, res, next) => {
  const { userId, issues, features, performance, feedback } = req.body;

  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  const updatedDoc = await Feedback.findOneAndUpdate(
    { userId },
    { issues, features, performance, feedback },
    { new: true, upsert: true /* create if not exists */ }
  );

  res.status(200).json({
    status: "success",
    data: {
      feedback: updatedDoc,
    },
  });
});

// Get Feedback by User ID
export const getFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const feedbackDoc = await Feedback.findOne({ userId });
  if (!feedbackDoc) {
    return next(new AppError("Feedback details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      feedback: feedbackDoc,
    },
  });
});

// Get all Feedback + User info (for students)
export const getAllFeedbackWithUsers = catchAsync(async (req, res, next) => {
  // this aggregation joins User collection with Feedback collection
  const results = await User.aggregate([
    { $match: { role: "student" } },
    {
      $lookup: {
        from: "feedbacks", // the actual MongoDB collection name for Feedback
        localField: "_id",
        foreignField: "userId",
        as: "feedbackDetails",
      },
    },
    {
      $unwind: {
        path: "$feedbackDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        feedback: {
          issues: "$feedbackDetails.issues",
          features: "$feedbackDetails.features",
          performance: "$feedbackDetails.performance",
          feedback: "$feedbackDetails.feedback",
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: results,
  });
});

// Delete Feedback by User ID
export const deleteFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const deletedDoc = await Feedback.findOneAndDelete({ userId });
  if (!deletedDoc) {
    return next(new AppError("Feedback details not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
