import MoocData from "../../models/CareerReview/Mooc.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

export const createOrUpdateMooc = catchAsync(async (req, res, next) => {
    const { userId, mooc } = req.body;

    if (!userId || !Array.isArray(mooc)) {
        return next(
            new AppError(
                "Please provide userId and an array of mooc data in the request body",
                400
            )
        );
    }

    try {
        const updatedMooc = await MoocData.findOneAndUpdate(
            { userId },
            { mooc: mooc },
            { new: true, upsert: true }
        );

        res.status(200).json({
            status: "success",
            data: {
                mooc: updatedMooc.mooc,
            },
        });
    } catch (err) {
        next(new AppError(err.message, 400));
    }
});

// Get mooc data for a specific user
export const getMoocByUserId = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const moocData = await MoocData.findOne({ userId });

    console.log("Mooc data being sent:", moocData); // Log the data

    if (!moocData) {
        return res.status(200).json({
            status: "success",
            data: {
                mooc: [],
            },
        });
    }

    res.status(200).json({
        status: "success",
        data: {
            mooc: moocData.mooc,
        },
    });
});

// Delete the entire mooc record for a user
export const deleteMoocById = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const deletedMooc = await MoocData.findOneAndDelete({ userId });

    if (!deletedMooc) {
        return next(new AppError("Mooc data not found for deletion", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});