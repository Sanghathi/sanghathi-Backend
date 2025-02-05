import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import FacultyProfile from "../../models/Faculty/FacultyDetails.js";

export const createOrUpdateFacultyProfile = catchAsync(async (req, res, next) => {

    const {
      userId,
      fullName,
      department,
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
    } = req.body;
  
    if (!userId) {
      return next(new AppError("User ID is required", 400));
    }
  
    const profileData = {
      userId,
      fullName: {
        firstName: fullName?.firstName,
        middleName: fullName?.middleName,
        lastName: fullName?.lastName,
      },
      department,
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
    };
  
    try {
      const updatedProfile = await FacultyProfile.findOneAndUpdate(
        { userId }, 
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
  
    const facultyProfile = await FacultyProfile.findOne({ userId: id });
  
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
  
    const deletedProfile = await FacultyProfile.findOneAndDelete({ userId: id });
  
    if (!deletedProfile) {
      return next(new AppError("Faculty profile not found for deletion", 404));
    }
  
    res.status(204).json({
      status: "success",
      data: null,
    });
  });
  