// controllers/complaintController.js

import Complaint from "../../models/Complain/Complaint.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js";

// Create or Update Complaint Details
export const createOrUpdateComplaint = catchAsync(async (req, res, next) => {
  const { userId, complaintSubject, complaintDescription, complaintSeverity, additionalComments } = req.body;

  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  const updatedDoc = await Complaint.findOneAndUpdate(
    { userId },
    { complaintSubject, complaintDescription, complaintSeverity, additionalComments },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: "success",
    data: {
      complaint: updatedDoc,
    },
  });
});

// Get Complaint by User ID
export const getComplaintByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const complaintDoc = await Complaint.findOne({ userId });
  if (!complaintDoc) {
    return next(new AppError("Complaint details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      complaint: complaintDoc,
    },
  });
});

// Get all Complaints + User info (for students)
export const getAllComplaintsWithUsers = catchAsync(async (req, res, next) => {
  const results = await User.aggregate([
    { $match: { role: "student" } },
    {
      $lookup: {
        from: "complaints", // MongoDB collection name for Complaint
        localField: "_id",
        foreignField: "userId",
        as: "complaintDetails",
      },
    },
    {
      $unwind: {
        path: "$complaintDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        complaint: {
          subject: "$complaintDetails.complaintSubject",
          description: "$complaintDetails.complaintDescription",
          severity: "$complaintDetails.complaintSeverity",
          comments: "$complaintDetails.additionalComments",
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: results,
  });
});

// Delete Complaint by User ID
export const deleteComplaintByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const deletedDoc = await Complaint.findOneAndDelete({ userId });
  if (!deletedDoc) {
    return next(new AppError("Complaint details not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
