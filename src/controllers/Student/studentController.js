import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import StudentProfile from "../../models/Student/Profile.js";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createOrUpdateStudentProfile = catchAsync(async (req, res, next) => {

  const saveImageToFolder = (base64Image, usn) => {
    console.log('saveImageToFolder called with usn/userId:', usn);
    
    // Check if it's a base64 image string
    const isBase64Image = base64Image.includes('data:image') && base64Image.includes('base64');
    
    if (!isBase64Image) {
      console.log('Not a base64 image, returning as is');
      return base64Image; // Return as is if not a base64 image
    }
    
    // Find the position after the base64 prefix
    const base64Prefix = 'base64,';
    const base64Index = base64Image.indexOf(base64Prefix);
    
    if (base64Index === -1) {
      console.log('Base64 prefix not found, returning as is');
      return base64Image; // Not in expected format
    }
    
    // Extract the actual base64 data
    const base64Data = base64Image.substring(base64Index + base64Prefix.length);
    
    // Create buffer from base64
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create filename using USN for uniqueness
    const fileName = `${usn}_${Date.now()}.jpg`;
    console.log('Generated filename:', fileName);
    
    // Define the path to save
    const imagePath = path.join('src', 'images', fileName);
    console.log('Full image path:', imagePath);
    
    // Log the directory structure
    console.log('Current directory:', __dirname);
    console.log('Target directory:', path.dirname(imagePath));
    
    // Ensure directory exists
    const dir = path.dirname(imagePath);
    const dirExists = fs.existsSync(dir);
    console.log('Directory exists?', dirExists);
    
    if (!dirExists) {
      console.log('Creating directory:', dir);
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Directory created successfully');
      } catch (error) {
        console.error('Error creating directory:', error);
        throw error;
      }
    }
    
    // Write the file
    try {
      console.log('Writing file...');
      fs.writeFileSync(imagePath, buffer);
      console.log('File written successfully');
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
    
    const relativePath = `/src/images/${fileName}`;
    console.log('Returning relative path:', relativePath);
    return relativePath;
  };

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

  let photoPath = photo;
  if (typeof photo === 'string' && photo.includes('data:image')) {
    try {
      photoPath = saveImageToFolder(photo, usn || userId);
      console.log('Image saved to path:', photoPath);
    } catch (error) {
      console.error('Error saving image:', error);
    }
  }

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
    photo: photoPath,
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
        as: "mentor"
      }
    },
    {
      $unwind: {
        path: "$mentor",
        preserveNullAndEmptyArrays: true
      }
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
        profile: 1,
        mentor: 1
      }
    }
  ]);

  res.status(200).json({
    status: "success",
    data: students
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
