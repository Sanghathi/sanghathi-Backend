import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

export const uploadImage = catchAsync(async (req, res, next) => {
  // Check if we have file uploaded through multer
  if (req.file) {
    try {
      // Convert the file buffer to base64
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(base64Image, 'mentor-connect/uploads');
      
      return res.status(200).json({
        success: true,
        imageUrl
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      return next(new AppError('Failed to upload image', 500));
    }
  } 
  // Check if we have a base64 image in the request body
  else if (req.body.image) {
    try {
      const imageUrl = await uploadToCloudinary(req.body.image, 'mentor-connect/uploads');
      
      return res.status(200).json({
        success: true,
        imageUrl
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      return next(new AppError('Failed to upload image', 500));
    }
  } else {
    return next(new AppError('No image found in request', 400));
  }
}); 