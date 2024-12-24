import StudentProfile from "../../models/Student/Profile.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import User from "../../models/User.js";

// Create or Update Student Profile
export const createOrUpdateStudentProfile = catchAsync(async (req, res, next) => {
  const {
    userId,
    fullName,
    department,
    personalEmail,
    email,
    usn,
    dateOfBirth,
    bloodGroup,
    mobileNumber,
    alternatePhoneNumber,
    nationality,
    domicile,
    religion,
    category,
    caste,
    hostelite,
    subCaste,
    aadharCardNumber,
    physicallyChallenged,
    admissionDate,
    sportsLevel,
    defenceOrExServiceman,
    photo,
  } = req.body;

  try {
    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { userId },
      {
        fullName,
        department,
        personalEmail,
        email,
        usn,
        dateOfBirth,
        bloodGroup,
        mobileNumber,
        alternatePhoneNumber,
        nationality,
        domicile,
        religion,
        category,
        caste,
        hostelite,
        subCaste,
        aadharCardNumber,
        physicallyChallenged,
        admissionDate,
        sportsLevel,
        defenceOrExServiceman,
        photo,
      },
      { new: true, upsert: true } 
    );

    res.status(200).json({
      status: "success",
      data: {
        studentProfile: updatedProfile,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

// Get a Student Profile by User ID
export const getStudentProfileById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const studentProfile = await StudentProfile.findOne({ userId: id });

  if (!studentProfile) {
    return next(new AppError("Student profile not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      studentProfile,
    },
  });
});

// Get All Students
export const getAllStudents = catchAsync(async (req, res, next) => {
  const students = await User.aggregate([
    {
      $match: {
        role: "student",
      },
    },
    {
      $lookup: {
        from: "mentorships",
        localField: "_id",
        foreignField: "menteeId",
        as: "mentorship",
      },
    },
    {
      $unwind: {
        path: "$mentorship",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "mentorship.mentorId",
        foreignField: "_id",
        as: "mentorData",
      },
    },
    {
      $unwind: {
        path: "$mentorData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        mentor: {
          mentorId: "$mentorData._id",
          name: "$mentorData.name",
          startDate: "$mentorship.startDate",
          endDate: "$mentorship.endDate",
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: students,
  });
});

// Delete a Student Profile
export const deleteStudentProfileById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedProfile = await StudentProfile.findOneAndDelete({ userId: id });

  if (!deletedProfile) {
    return next(new AppError("Student profile not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
