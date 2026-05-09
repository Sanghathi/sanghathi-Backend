import MoocData from "../../models/CareerReview/Mooc.js";
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
        const studentProfile = await StudentProfile.findOne({ userId }).select("sem").lean();
        const fallbackSemester = studentProfile?.sem ?? null;

        // sanitize incoming semester values: accept numeric 1-8 or null
        const sanitized = mooc.map((m) => {
            return {
                portal: m.portal || m.Platform || "",
                title: m.title || m.CourseName || "",
                semester: parseSemesterValue(m.semester, fallbackSemester),
                startDate: normalizeDateValue(m.startDate || m.StartDate),
                completedDate: normalizeDateValue(m.completedDate || m.EndDate),
                score: m.score || null,
                certificateLink: m.certificateLink || m.CertificateLink || "",
            };
        });

        const updatedMooc = await MoocData.findOneAndUpdate(
            { userId },
            { mooc: sanitized },
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

    logger.info("Mooc data being sent:", moocData); // Log the data

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