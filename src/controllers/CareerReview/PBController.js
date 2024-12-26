import ProffessionalBody from "../../models/CareerReview/ProffessionalBody.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

export const createOrUpdatePB = catchAsync(async (req, res, next) => {
  const { userId, proffessionalbodies } = req.body; 

  if (!userId || !Array.isArray(proffessionalbodies)) {
    return next(
      new AppError(
        "Please provide userId and an array of proffessionalbodies in the request body",
        400
      )
    );
  }

  try {
    const updatedPBData = await ProffessionalBody.findOneAndUpdate(
      { userId },
      { ProffessionalBody: proffessionalbodies }, 
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        proffessionalbody: updatedPBData.ProffessionalBody,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get proffessionalbody for a specific user
export const getPBByUserId = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const PBData = await ProffessionalBody.findOne({ userId: id });

    res.status(200).json({
      status: "success",
      data: {
        proffessionalbody: PBData ? PBData.ProffessionalBody : [],
      },
    });
  });

// Delete the entire PB record for a user
export const deletePBById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedPB = await ProffessionalBody.findOneAndDelete({ userId: id });

  if (!deletedPB) {
    return next(new AppError("PB data not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});