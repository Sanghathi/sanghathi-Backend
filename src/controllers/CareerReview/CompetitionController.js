import Competition from "../../models/CareerReview/Competition.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import User from "../../models/User.js";

export const createOrUpdateCompetition = catchAsync(async (req, res, next) => {
  const { competition = [], userId } = req.body;

  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  try {
    // Replace existing doc for this user with provided array
    // For simplicity we will upsert multiple competition documents
    const results = [];

    if (Array.isArray(competition) && competition.length > 0) {
      for (const item of competition) {
        const payload = {
          ...item,
          userId,
          collegeCode: req.user?.collegeCode,
          department: req.user?.department,
        };

        // If item has _id, update that doc; otherwise create
        if (item._id) {
          const updated = await Competition.findOneAndUpdate({ _id: item._id, userId }, payload, { new: true });
          results.push(updated);
        } else {
          const created = await Competition.create(payload);
          results.push(created);
        }
      }
    }

    res.status(200).json({ status: "success", data: { competition: results } });
  } catch (err) {
    logger.error(err);
    next(new AppError(err.message, 400));
  }
});

export const getCompetitionsByUserId = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const competitions = await Competition.find({ userId: id }).sort({ createdAt: -1 });

  if (!competitions) {
    return next(new AppError("Competition profile not found", 404));
  }

  res.status(200).json({ status: "success", data: { competition: competitions } });
});

export const getAllCompetitions = catchAsync(async (req, res, next) => {
  // similar to other getAllCareer endpoints: aggregate with user info
  const data = await User.aggregate([
    { $match: { role: "student" } },
    {
      $lookup: {
        from: "competitions",
        localField: "_id",
        foreignField: "userId",
        as: "competition",
      },
    },
    { $unwind: { path: "$competition", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        competition: 1,
      },
    },
  ]);

  res.status(200).json({ status: "success", data });
});

export const deleteCompetitionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deleted = await Competition.findOneAndDelete({ _id: id });
  if (!deleted) return next(new AppError("Not found", 404));

  res.status(204).json({ status: "success", data: null });
});
