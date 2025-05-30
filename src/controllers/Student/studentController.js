import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import StudentProfile from "../../models/Student/Profile.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createOrUpdateStudentProfile = catchAsync(async (req, res, next) => {
  console.log('Received profile update request:', {
    userId: req.body.userId,
    hasPhoto: !!req.body.photo
  });

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

  // Initialize photoUrl
  let photoUrl = photo;
  console.log('Initial photo value:', { type: typeof photo, isBase64: photo?.includes('data:image'), isCloudinary: photo?.includes('cloudinary.com') });

  // Only upload if it's a base64 image and not already a Cloudinary URL
  if (typeof photo === 'string' && photo.includes('data:image') && !photo.includes('cloudinary.com')) {
    try {
      console.log('Attempting to upload image to Cloudinary...');
      photoUrl = await uploadToCloudinary(photo, 'mentor-connect/students');
      console.log('Successfully uploaded image to Cloudinary:', photoUrl);
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      return next(new AppError('Failed to upload image', 500));
    }
  } else {
    console.log('Using existing photo URL:', photoUrl);
  }

  const profileData = {
    userId,
    fullName: {
      firstName: fullName?.firstName,
      middleName: fullName?.middleName,
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
    photo: photoUrl, // Store the Cloudinary URL
  };

  try {
    console.log('Attempting to update profile with data:', {
      userId,
      photoUrl,
      department,
      sem
    });
    
    // First, check if a profile exists
    let existingProfile = await StudentProfile.findOne({ userId });
    console.log('Existing profile:', existingProfile ? 'Found' : 'Not found');

    let updatedProfile;
    if (existingProfile) {
      // Update existing profile
      updatedProfile = await StudentProfile.findOneAndUpdate(
        { userId },
        { $set: profileData },
        { new: true }
      );
      console.log('Updated existing profile');
    } else {
      // Create new profile
      updatedProfile = await StudentProfile.create(profileData);
      console.log('Created new profile');
    }

    console.log('Profile update result:', {
      userId: updatedProfile.userId,
      photo: updatedProfile.photo,
      department: updatedProfile.department,
      sem: updatedProfile.sem
    });

    res.status(200).json({
      status: "success",
      data: {
        studentProfile: updatedProfile,
      },
    });
  } catch (err) {
    console.error('Error updating profile:', {
      message: err.message,
      stack: err.stack
    });
    next(new AppError(err.message, 400));
  }
});


/**
 * Fetch all students based on the role.
 */
export const getAllStudents = catchAsync(async (req, res, next) => {
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
        from: "studentprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile"
      }
    },
    {
      $unwind: {
        path: "$profile",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        roleName: 1,
        "profile.department": 1,
        "profile.sem": 1,
        "profile.usn": 1,
        "profile.mobileNumber": 1,
        "profile.alternatePhoneNumber": 1
      }
    }
  ]);

  // Transform the data to match the expected format
  const transformedStudents = students.map(student => ({
    _id: student._id,
    name: student.name,
    email: student.email,
    phone: student.phone || student.profile?.mobileNumber || student.profile?.alternatePhoneNumber,
    roleName: student.roleName,
    department: student.profile?.department,
    sem: student.profile?.sem,
    usn: student.profile?.usn
  }));

  res.status(200).json({
    status: "success",
    data: transformedStudents
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
