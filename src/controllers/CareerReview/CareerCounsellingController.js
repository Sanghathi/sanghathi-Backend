import CareerCounselling from "../../models/CareerReview/CareerCounselling.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js";

export const createOrUpdateCareerCounselling = catchAsync(async (req, res, next) => {
  const{
    userId,
    TechnicalStudies,
    ManagementStudies,
    Entrepreneur,
    Job,
    CompetitiveExams,
    CareerObjective,
    ActionPlan,
    TrainingRequirements,
    TrainingPlanning,
    Certification,
   } = req.body;

   try {
    const updatedCareer = await CareerCounselling.findOneAndUpdate(
      { userId },
      {
        TechnicalStudies,
        ManagementStudies,
        Entrepreneur,
        Job,
        CompetitiveExams,
        CareerObjective,
        ActionPlan,
        TrainingRequirements,
        TrainingPlanning,
        Certification,
      },
      { new: true,upsert: true } 
    );

    res.status(200).json({
      status: "success",
      data: {
        career: updatedCareer,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get all records
export const getCareerCounsellingById = catchAsync(async (req, res, next) => {
  console.log("Route handler triggered, req.params:", req.params);
  const { id } = req.params;
  console.log("Querying for userId:", id);
  const careers = await CareerCounselling.findOne({ userId: id });
  if (!careers) {
    return next(new AppError("Career profile not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
        careers,
    },
  });
});

// Get a single record by ID
export const getAllCareer = catchAsync(async (req, res, next) => {
  const careers = await User.aggregate([
    {
      $match: {
        role: "student",
      },
    },
    {
      $lookup: {
        from: "mentorships",
        localField: "_id",
        foreignField: "menteeId",
        as: "mentorship",
      },
    },
    {
      $unwind: {
        path: "$mentorship",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "mentorship.mentorId",
        foreignField: "_id",
        as: "mentorData",
      },
    },
    {
      $unwind: {
        path: "$mentorData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        mentor: {
          mentorId: "$mentorData._id",
          name: "$mentorData.name",
          startDate: "$mentorship.startDate",
          endDate: "$mentorship.endDate",
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: careers,
  });
});
 

// Delete a record
export const deleteCareerCounsellingbyId = catchAsync(async (req, res, next) => {
    const {id} = req.params;
    const deletedCareer = await CareerCounselling.findOneAndDelete({ userId: id });

    if (!deletedCareer) {
        return next(new AppError("Career profile not found for deletion", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});