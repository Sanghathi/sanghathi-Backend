import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import FacultyProfile from "../../models/Faculty/FacultyDetails.js";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import {
  getScopedCollegeCode,
  mergeCollegeScope,
  resolveCollegeCode,
} from "../../utils/tenantContext.js";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

import logger from "../../utils/logger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createOrUpdateFacultyProfile = catchAsync(async (req, res, next) => {
  const {
    userId,
    fullName,
    department,
    departmentId,
    cabin,
    personalEmail,
    email,
    dateOfBirth,
    bloodGroup,
    mobileNumber,
    alternatePhoneNumber,
    nationality,
    domicile,
    religion,
    category,
    caste,
    aadharCardNumber,
    physicallyChallenged,
    isForeigner,
    photo,
    collegeCode,
  } = req.body;

  let photoUrl = photo;
  if (typeof photo === 'string' && photo.includes('data:image')) {
    try {
      photoUrl = await uploadToCloudinary(photo, 'mentor-connect/faculty');
      logger.info('Image uploaded to Cloudinary:', photoUrl);
    } catch (error) {
      logger.error('Error uploading image to Cloudinary:', error);
      return next(new AppError('Failed to upload image', 500));
    }
  }

  const resolvedCollegeCode = resolveCollegeCode({
    body: { collegeCode },
    user: req.user,
  });

  const profileData = {
    userId,
    fullName: {
      firstName: fullName?.firstName,
      middleName: fullName?.middleName,
      lastName: fullName?.lastName,
    },
    department,
    departmentId,
    cabin,
    personalEmail,
    email,
    dateOfBirth,
    bloodGroup,
    mobileNumber,
    alternatePhoneNumber,
    nationality,
    domicile,
    religion,
    category,
    caste,
    aadharCardNumber,
    physicallyChallenged,
    isForeigner,
    photo: photoUrl,
    collegeCode: resolvedCollegeCode,
  };

  try {
    const collegeScope = mergeCollegeScope({ userId }, resolvedCollegeCode);
    const updatedProfile = await FacultyProfile.findOneAndUpdate(
      collegeScope,
      { $set: profileData },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: "success",
      data: {
        facultyProfile: updatedProfile,
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
});

/**
 * Fetch a single faculty by ID.
 */
export const getFacultyProfileById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const collegeCode = getScopedCollegeCode(req);
  const filter = mergeCollegeScope({ userId: id }, collegeCode);
  const facultyProfile = await FacultyProfile.findOne(filter);

  if (!facultyProfile) {
    return next(new AppError("Faculty profile not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      facultyProfile,
    },
  });
});

/**
 * Delete a faculty.
 */
export const Faculty = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const faculty = await User.findByIdAndDelete(id);

  if (!faculty) {
    return next(new AppError("Faculty not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Delete a Faculty Profile
export const deleteFacultyProfileById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const collegeCode = getScopedCollegeCode(req);
  const filter = mergeCollegeScope({ userId: id }, collegeCode);
  const deletedProfile = await FacultyProfile.findOneAndDelete(filter);

  if (!deletedProfile) {
    return next(new AppError("Faculty profile not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
  