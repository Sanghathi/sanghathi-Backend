import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import FacultyProfile from "../../models/Faculty/FacultyDetails.js";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createOrUpdateFacultyProfile = catchAsync(async (req, res, next) => {

  const saveImageToFolder = (base64Image, userId) => {
      console.log('saveImageToFolder called with userId:', userId);
      
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
      const fileName = `${userId}_${Date.now()}.jpg`;
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
  
  let photoPath = photo;
  if (typeof photo === 'string' && photo.includes('data:image')) {
    try {
      photoPath = saveImageToFolder(photo, userId);
      console.log('Image saved to path:', photoPath);
    } catch (error) {
      console.error('Error saving image:', error);
    }
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
      photo:photoPath,
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
  