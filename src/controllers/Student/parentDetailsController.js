import ParentDetails from "../../models/Student/ParentDetails.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js";

import logger from "../../utils/logger.js";
// ✅ Create or Update Parent Details (Merged Update Fix)
export const createOrUpdateParentDetails = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) {
    return next(new AppError("User ID is required to update parent details", 400));
  }

  try {
    logger.info("🔹 Create or update parent details reached for user:", userId);

    // Fetch existing data first to preserve non-updated fields
    const existing = await ParentDetails.findOne({ userId });
    logger.info("Existing parent details found:", existing ? "Yes" : "No");

    // Merge old and new data safely
    const mergedData = { ...(existing?.toObject() || {}), ...req.body };

    const updatedParentDetails = await ParentDetails.findOneAndUpdate(
      { userId },
      mergedData,
      { new: true, upsert: true, runValidators: true }
    );

    logger.info("✅ Parent details successfully updated or created:", updatedParentDetails);

    res.status(200).json({
      status: "success",
      data: { parentDetails: updatedParentDetails },
    });
  } catch (err) {
    logger.error("❌ Error in createOrUpdateParentDetails:", err);
    next(new AppError(err.message, 400));
  }
});

// ✅ Get Parent Details by User ID
export const getParentDetailsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  logger.info("🔹 Fetching parent details for userId:", userId);

  const parentDetails = await ParentDetails.findOne({ userId });

  if (!parentDetails) {
    logger.info("ℹ️ No parent details found for user:", userId);
    return res.status(200).json({
      status: "success",
      data: { parentDetails: null },
    });
  }

  logger.info("✅ Parent details fetched successfully for user:", userId);
  res.status(200).json({
    status: "success",
    data: { parentDetails },
  });
});

// ✅ Get All Parent Details (with user info)
export const getAllParentDetails = catchAsync(async (req, res, next) => {
  logger.info("🔹 Fetching all parent details for students...");

  const parentDetailsData = await User.aggregate([
    { $match: { role: "student" } },
    {
      $lookup: {
        from: "parentdetails",
        localField: "_id",
        foreignField: "userId",
        as: "parentDetails",
      },
    },
    { $unwind: { path: "$parentDetails", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        parentDetails: 1,
      },
    },
  ]);

  logger.info(`✅ Total parent records found: ${parentDetailsData.length}`);

  res.status(200).json({
    status: "success",
    data: parentDetailsData,
  });
});

// ✅ Delete Parent Details by User ID
export const deleteParentDetailsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  logger.info("🔹 Attempting to delete parent details for user:", userId);

  const deletedParentDetails = await ParentDetails.findOneAndDelete({ userId });

  if (!deletedParentDetails) {
    logger.warn("⚠️ Parent details not found for deletion:", userId);
    return next(new AppError("Parent details not found for deletion", 404));
  }

  logger.info("🗑️ Parent details deleted successfully for user:", userId);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
