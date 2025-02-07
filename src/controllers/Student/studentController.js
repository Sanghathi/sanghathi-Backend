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
    sem,
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


  const profileData = {
    userId,
    fullName: {
      firstName: fullName?.firstName,
      lastName: fullName?.lastName,
    },
    department,
    sem,
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
  };

  try {
    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { userId }, 
      { $set: profileData },
      { upsert: true, new: true }
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
  let { page = 1, limit = 100 } = req.query;

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
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        avatar: 1,
        status: 1,
        role: 1,
        profileId: "$profile"
      }
    },
    {
      $lookup: {
        from: "studentprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profileData"
      }
    },
    {
      $unwind: {
        path: "$profileData",
        preserveNullAndEmptyArrays: true
      }
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
        profile: {
          usn: "$profileData.usn",
          department: "$profileData.department",
          sem: "$profileData.sem"
        },
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
