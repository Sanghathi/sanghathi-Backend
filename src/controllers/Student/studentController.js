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

  // Find all users with the role of 'student'
  const students = await User.find({ role: studentRole._id })
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .select("name email phone avatar status role");

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
 * Create a new student.
 */
// Updated createStudentProfile method

export const createStudentProfile = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, passwordConfirm } = req.body;

  // Find the "student" role by name to get the ObjectId
  const studentRole = await Role.findOne({ name: "student" });
  if (!studentRole) {
    return next(new AppError("Student role not found", 404));
  }

  // Find the "mentor" role by name to get the ObjectId
  const mentorRole = await Role.findOne({ name: "mentor" });
  if (!mentorRole) {
    return next(new AppError("Mentor role not found", 404));
  }

  // Find all mentors
  const mentors = await User.find({ role: mentorRole._id });
  if (mentors.length === 0) {
    return next(new AppError("No mentors available for assignment", 404));
  }

  // Randomly assign a mentor to the new student
  const assignedMentor = mentors[Math.floor(Math.random() * mentors.length)];

  // Create a new student
  const student = await User.create({
    name,
    email,
    phone,
    password,
    passwordConfirm,
    role: studentRole._id, // Pass the ObjectId of the student role
    mentor: assignedMentor._id, // Assign the mentor's ObjectId
  });

  res.status(201).json({
    status: "success",
    data: {
      student,
      assignedMentor: {
        id: assignedMentor._id,
        name: assignedMentor.name,
        email: assignedMentor.email,
      },
    },
  });
});


/**
 * Update a student's details.
 */
export const updateStudent = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find and update the student
  const student = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!student) {
    return next(new AppError("Student not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: student,
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
