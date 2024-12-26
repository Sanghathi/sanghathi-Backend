import PBEvent from "../../models/CareerReview/PBEvent.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

/**
 * Create or Update PB Events for a user
 */
export const createOrUpdatePBEvents = catchAsync(async (req, res, next) => {
  const { userId, ProffessionalBodyEvent } = req.body;

  if (!userId || !Array.isArray(ProffessionalBodyEvent)) {
    return next(
      new AppError(
        "Please provide userId and an array of ProffessionalBodyEvent in the request body",
        400
      )
    );
  }

  try {
    const updatedPBEvent = await PBEvent.findOneAndUpdate(
      { userId },
      { $set: { ProffessionalBodyEvent } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      status: "success",
      data: {
        ProffessionalBodyEvent: updatedPBEvent.ProffessionalBodyEvent,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

/**
 * Fetch PB Events by user ID
 */
export const getPBEventsByUserId = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const PBEvents = await PBEvent.findOne({ userId: id });

  if (!PBEvents) {
    return next(new AppError("No Professional Body Events found for this user", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      ProffessionalBodyEvent: PBEvents.ProffessionalBodyEvent,
    },
  });
});

/**
 * Delete PB Events for a specific user
 */
export const deletePBEventById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedEvents = await PBEvent.deleteOne({ userId: id });

  if (deletedEvents.deletedCount === 0) {
    return next(new AppError("No PB events found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
