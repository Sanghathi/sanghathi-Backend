import MiniProjectData from "../../models/CareerReview/MiniProject.js";
import StudentProfile from "../../models/Student/Profile.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

import logger from "../../utils/logger.js";

const parseSemesterValue = (value, fallback = null) => {
    const semesterValue = value !== undefined && value !== null && `${value}`.trim() !== ""
        ? Number(value)
        : Number(fallback);

    if (Number.isInteger(semesterValue) && semesterValue >= 1 && semesterValue <= 8) {
        return semesterValue;
    }

    return null;
};

const normalizeDateValue = (value) => {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() > Date.now()) {
        return null;
    }

    return parsedDate;
};

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
        const studentProfile = await StudentProfile.findOne({ userId }).select("sem").lean();
        const fallbackSemester = studentProfile?.sem ?? null;

        const sanitized = miniproject.map((p) => {
            return {
                title: p.title || "",
                semester: parseSemesterValue(p.semester, fallbackSemester),
                manHours: p.manHours !== undefined && p.manHours !== null ? Number(p.manHours) : null,
                startDate: normalizeDateValue(p.startDate),
                completedDate: normalizeDateValue(p.completedDate),
            };
        });

        // Merge incoming mini-project items with existing entries instead of replacing the whole array.
        const existingDoc = await MiniProjectData.findOne({ userId }).lean();
        const existingArray = (existingDoc && Array.isArray(existingDoc.miniproject)) ? existingDoc.miniproject : [];

        // merge strategy:
        // - for each incoming item, if an existing item has the same semester and a matching title (case-insensitive), replace it
        // - otherwise append the incoming item
        const merged = [...existingArray];

        sanitized.forEach((incoming) => {
            // normalize comparison keys
            const incomingTitle = (incoming.title || "").trim().toLowerCase();
            const incomingSemester = incoming.semester;

            const idx = merged.findIndex((e) => {
                const eTitle = (e.title || "").trim().toLowerCase();
                return e.semester === incomingSemester && eTitle && incomingTitle && eTitle === incomingTitle;
            });

            if (idx !== -1) {
                merged[idx] = incoming;
            } else {
                merged.push(incoming);
            }
        });

        const updatedMiniProject = await MiniProjectData.findOneAndUpdate(
            { userId },
            { miniproject: merged },
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