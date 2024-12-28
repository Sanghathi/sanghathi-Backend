import ActivityData from "../../models/CareerReview/Activity.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

export const createOrUpdateActivity = catchAsync(async (req, res, next) => {
    const { userId, activity } = req.body;

    if (!userId || !Array.isArray(activity)) {
        return next(
            new AppError(
                "Please provide userId and an array of activity data in the request body",
                400
            )
        );
    }

    try {
        const updatedActivity = await ActivityData.findOneAndUpdate(
            { userId },
            { activity: activity },
            { new: true, upsert: true }
        );

        res.status(200).json({
            status: "success",
            data: {
                activity: updatedActivity.activity,
            },
        });
    } catch (err) {
        next(new AppError(err.message, 400));
    }
});

// Get activity data for a specific user
export const getActivityByUserId = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    console.log("Fetching Activity data for userId:", userId);
    const activityRecord = await ActivityData.findOne({ userId });

    console.log("Activity data being sent:", activityRecord);

    if (!activityRecord) {
        return res.status(200).json({
            status: "success",
            data: {
                activity: [],
            },
        });
    }

    res.status(200).json({
        status: "success",
        data: {
            activity: activityRecord.activity,
        },
    });
});

// Delete the entire activity record for a user
export const deleteActivityById = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const deletedActivity = await ActivityData.findOneAndDelete({ userId });

    if (!deletedActivity) {
        return next(new AppError("Activity data not found for deletion", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});