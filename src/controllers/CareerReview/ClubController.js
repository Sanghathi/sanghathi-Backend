import Clubs from "../../models/CareerReview/Clubs.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

export const createOrUpdateClubs = catchAsync(async (req, res, next) => {
  const { userId, clubs } = req.body;

  if (!userId || !Array.isArray(clubs)) {
    return next(
      new AppError(
        "Please provide userId and clubs in the request body",
        400
      )
    );
  }

  try {
    const updatedClubData = await Clubs.findOneAndUpdate(
      { userId },
      { clubs },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        clubs: updatedClubData.clubs,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get clubs for a specific user
export const getClubsByUserId = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const clubData = await Clubs.findOne({ userId: id });
  
    res.status(200).json({
      status: "success",
      data: {
        clubs: clubData ? clubData.clubs : [],
      },
    });
  });

// Delete the entire club record for a user
export const deleteClubById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedClub = await Clubs.findOneAndDelete({ userId: id });

  if (!deletedClub) {
    return next(new AppError("Club data not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});