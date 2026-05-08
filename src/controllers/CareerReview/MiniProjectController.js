import MiniProjectData from "../../models/CareerReview/MiniProject.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

import logger from "../../utils/logger.js";
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
        const sanitized = miniproject.map((p) => {
            const semRaw = p.semester;
            let sem = null;
            if (semRaw !== undefined && semRaw !== null && semRaw !== "") {
                const parsed = Number(semRaw);
                if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 8) sem = parsed;
            }

            return {
                title: p.title || "",
                semester: sem,
                manHours: p.manHours !== undefined && p.manHours !== null ? Number(p.manHours) : null,
                startDate: p.startDate || null,
                completedDate: p.completedDate || null,
            };
        });

        const updatedMiniProject = await MiniProjectData.findOneAndUpdate(
            { userId },
            { miniproject: sanitized },
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
    logger.info("Fetching MiniProject data for userId:", userId);
    const miniProjectData = await MiniProjectData.findOne({ userId });

    logger.info("MiniProject data being sent:", miniProjectData); // Log the data

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