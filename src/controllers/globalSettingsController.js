import GlobalSettings from "../models/GlobalSettings.js";
import MentorFeedback from "../models/FeedbackForm/MentorFeedback/MentorFeedback.js";
import catchAsync from "../utils/catchAsync.js";

// Get global settings (create default if not exists)
export const getGlobalSettings = catchAsync(async (req, res, next) => {
    let settings = await GlobalSettings.findOne();
    if (!settings) {
        settings = await GlobalSettings.create({ mentorFeedbackEnabled: false });
    }

    res.status(200).json({
        status: "success",
        data: {
            settings,
        },
    });
});

// Update global settings
export const updateGlobalSettings = catchAsync(async (req, res, next) => {
    const currentSettings = await GlobalSettings.findOne();
    const shouldDisableMentorFeedback =
        req.body.mentorFeedbackEnabled === false &&
        (currentSettings?.mentorFeedbackEnabled !== false);

    const settings = await GlobalSettings.findOneAndUpdate(
        {},
        req.body,
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    if (shouldDisableMentorFeedback) {
        await MentorFeedback.deleteMany({});
    }

    res.status(200).json({
        status: "success",
        data: {
            settings,
        },
    });
});
