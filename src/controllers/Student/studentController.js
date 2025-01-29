import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import StudentProfile from "../../models/Student/Profile.js";



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

/**
 * Fetch all students based on the role with pagination.
 */
export const getAllStudents = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  // Find the role for 'student'
  const studentRole = await Role.findOne({ name: "student" });
  if (!studentRole) {
    return next(new AppError("Student role not found", 404));
  }

  // Use aggregation pipeline to get students with mentor information
  const students = await User.aggregate([
    {
      $match: { role: studentRole._id }
    },
    {
      $lookup: {
        from: "mentorships",
        localField: "_id",
        foreignField: "menteeId",
        as: "mentorship"
      }
    },
    {
      $unwind: {
        path: "$mentorship",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "mentorship.mentorId",
        foreignField: "_id",
        as: "mentorInfo"
      }
    },
    {
      $unwind: {
        path: "$mentorInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        avatar: 1,
        status: 1,
        role: 1,
        mentor: {
          $cond: {
            if: "$mentorInfo",
            then: {
              _id: "$mentorInfo._id",
              name: "$mentorInfo.name"
            },
            else: null
          }
        }
      }
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit)
    },
    {
      $limit: parseInt(limit)
    }
  ]);

  // Count total students
  const totalStudents = await User.countDocuments({ role: studentRole._id });

  res.status(200).json({
    status: "success",
    total: totalStudents,
    results: students.length,
    data: students,
  });
});

/**
 * Fetch a single student by ID.
 */
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

/**
 * Delete a student.
 */
export const deleteStudent = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const student = await User.findByIdAndDelete(id);

  if (!student) {
    return next(new AppError("Student not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
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
