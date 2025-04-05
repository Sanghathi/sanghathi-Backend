import ParentDetails from "../../models/Student/ParentDetails.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js"; // Assuming you need the User model

// Create or Update Parent Details Data
export const createOrUpdateParentDetails = catchAsync(async (req, res, next) => {
  const {
    userId,
    fatherFirstName,
    fatherMiddleName,
    fatherLastName,
    motherFirstName,
    motherMiddleName,
    motherLastName,
    fatherOccupation,
    motherOccupation,
    fatherIncome,
    motherIncome,
    fatherMobileNumber,
    motherMobileNumber,
    address,
    state,
    pincode,
  } = req.body;

  try {
    console.log("Create or update reached")
    const updatedParentDetails = await ParentDetails.findOneAndUpdate(
      { userId },
      {
        fatherFirstName,
        fatherMiddleName,
        fatherLastName,
        motherFirstName,
        motherMiddleName,
        motherLastName,
        fatherOccupation,
        motherOccupation,
        fatherIncome,
        motherIncome,
        fatherMobileNumber,
        motherMobileNumber,
        address,
        state,
        pincode,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        parentDetails: updatedParentDetails,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get Parent Details Data by User ID
export const getParentDetailsByUserId = catchAsync(async (req, res, next) => {
    console.log("Route handler triggered, req.params:", req.params);
    const { userId } = req.params; // Changed from id to userId
    console.log("Querying for userId:", userId);
    const parentDetails = await ParentDetails.findOne({ userId: userId });
  
    if (!parentDetails) {
      return next(new AppError("Parent details not found", 404));
    }
  
    res.status(200).json({
      status: "success",
      data: {
        parentDetails,
      },
    });
  });

// Get all Parent Details data with user details (similar to getAllCareer)
export const getAllParentDetails = catchAsync(async (req, res, next) => {
    const parentDetailsData = await User.aggregate([
      {
        $match: {
          role: "student",
        },
      },
      {
        $lookup: {
          from: "parentDetails",
          localField: "_id",
          foreignField: "userId",
          as: "parentDetails",
        },
      },
      {
        $unwind: {
          path: "$parentDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          role: 1,
          parentDetails: {
            fatherFirstName: "$parentDetails.fatherFirstName",
            fatherMiddleName: "$parentDetails.fatherMiddleName",
            fatherLastName: "$parentDetails.fatherLastName",
            motherFirstName: "$parentDetails.motherFirstName",
            motherMiddleName: "$parentDetails.motherMiddleName",
            motherLastName: "$parentDetails.motherLastName",
            fatherOccupation: "$parentDetails.fatherOccupation",
            motherOccupation: "$parentDetails.motherOccupation",
            fatherIncome: "$parentDetails.fatherIncome",
            motherIncome: "$parentDetails.motherIncome",
            fatherMobileNumber: "$parentDetails.fatherMobileNumber",
            motherMobileNumber: "$parentDetails.motherMobileNumber",
            address: "$parentDetails.address",
            state: "$parentDetails.state",
            pincode: "$parentDetails.pincode",
          },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: parentDetailsData,
    });
  });

// Delete Parent Details Data by User ID
export const deleteParentDetailsByUserId = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedParentDetails = await ParentDetails.findOneAndDelete({ userId: id });

  if (!deletedParentDetails) {
    return next(new AppError("Parent details not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});