import MiniProjectData from "../../models/CareerReview/MiniProject.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

export const createOrUpdateMiniProject = catchAsync(async (req, res, next) => {
    const { userId, miniproject } = req.body;

    if (!userId || !Array.isArray(miniproject)) {
        return next(
            new AppError(
                "Please provide userId and an array of miniproject data in the request body",
                400
            )
        );
    }

    try {
        const updatedMiniProject = await MiniProjectData.findOneAndUpdate(
            { userId },
            { miniproject: miniproject },
            { new: true, upsert: true }
        );

        res.status(200).json({
            status: "success",
            data: {
                miniproject: updatedMiniProject.miniproject,
            },
        });
    } catch (err) {
        next(new AppError(err.message, 400));
    }
});

// Get miniproject data for a specific user
export const getMiniProjectByUserId = catchAsync(async (req, res, next) => { // Fixed function name
    const { userId } = req.params;
    console.log("Fetching MiniProject data for userId:", userId);
    const miniProjectData = await MiniProjectData.findOne({ userId });

    console.log("MiniProject data being sent:", miniProjectData); // Log the data

    if (!miniProjectData) {
        return res.status(200).json({
            status: "success",
            data: {
                miniproject: [],
            },
        });
    }

    res.status(200).json({
        status: "success",
        data: {
            miniproject: miniProjectData.miniproject,
        },
    });
});

// Delete the entire miniproject record for a user
export const deleteMiniProjectById = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const deletedMiniProject = await MiniProjectData.findOneAndDelete({ userId });

    if (!deletedMiniProject) {
        return next(new AppError("Miniproject data not found for deletion", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});