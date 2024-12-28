import Hobbies from "../../models/CareerReview/Hobbies.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js"; // Assuming you need the User model

// Create or Update Hobbies Data
export const createOrUpdateHobbies = catchAsync(async (req, res, next) => {
  const {
    userId,
    hobby,
    nccNss,
    academic,
    cultural,
    sports,
    others,
    ambition,
    plans,
    roleModel,
    roleModelReason,
    selfDescription,
  } = req.body;

  try {
    console.log("Create or update reached")
    const updatedHobbies = await Hobbies.findOneAndUpdate(
      { userId },
      {
        hobby,
        nccNss,
        academic,
        cultural,
        sports,
        others,
        ambition,
        plans,
        roleModel,
        roleModelReason,
        selfDescription,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        hobbies: updatedHobbies,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get Hobbies Data by User ID
export const getHobbiesByUserId = catchAsync(async (req, res, next) => {
    console.log("Route handler triggered, req.params:", req.params);
    const { userId } = req.params; // Changed from id to userId
    console.log("Querying for userId:", userId);
    const hobbies = await Hobbies.findOne({ userId: userId });
  
    if (!hobbies) {
      return next(new AppError("Hobbies profile not found", 404));
    }
  
    res.status(200).json({
      status: "success",
      data: {
        hobbies,
      },
    });
  });

// Get all Hobbies data with user details (similar to getAllCareer)
export const getAllHobbies = catchAsync(async (req, res, next) => {
    const hobbiesData = await User.aggregate([
      {
        $match: {
          role: "student",
        },
      },
      {
        $lookup: {
          from: "hobbies",
          localField: "_id",
          foreignField: "userId",
          as: "hobbies",
        },
      },
      {
        $unwind: {
          path: "$hobbies",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          role: 1,
          hobbies: {
            hobby: "$hobbies.hobby",
            nccNss: "$hobbies.nccNss",
            academic: "$hobbies.academic",
            cultural: "$hobbies.cultural",
            sports: "$hobbies.sports",
            others: "$hobbies.others",
            ambition: "$hobbies.ambition",
            plans: "$hobbies.plans",
            roleModel: "$hobbies.roleModel",
            roleModelReason: "$hobbies.roleModelReason",
            selfDescription: "$hobbies.selfDescription",
          },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: hobbiesData,
    });
  });

// Delete Hobbies Data by User ID
export const deleteHobbiesByUserId = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedHobbies = await Hobbies.findOneAndDelete({ userId: id });

  if (!deletedHobbies) {
    return next(new AppError("Hobbies profile not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});