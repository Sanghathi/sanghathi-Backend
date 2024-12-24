import ClubEvents from "../../models/CareerReview/ClubEvents.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

export const createOrUpdateClubEvents = catchAsync(async (req, res, next) => {
  const { userId, clubevents } = req.body;
    console.log("clubevents data in backend:",clubevents);
  if (!userId || !Array.isArray(clubevents)) {
    return next(
      new AppError(
        "Please provide userId club events in the request body",
        400
      )
    );
  }

  try {
    const updatedClubEventData = await ClubEvents.findOneAndUpdate(
      { userId },
      { clubevents },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        clubevents: updatedClubEventData.clubevents,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get clubs for a specific user
export const getClubEventsByUserId = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const clubEventData = await ClubEvents.findOne({ userId: id });
  
    res.status(200).json({
      status: "success",
      data: {
        clubevents: clubEventData ? clubEventData.clubevents : [],
      },
    });
  });

// Delete the entire club record for a user
export const deleteClubEventById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedClubEvent = await ClubEvents.findOneAndDelete({ userId: id });

  if (!deletedClubEvent) {
    return next(new AppError("Club Event data not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});