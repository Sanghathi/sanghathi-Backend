import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

export const uploadProfileImage = catchAsync(async (req, res, next) => {
  if (!req.body.image) {
    return next(new AppError('No image provided', 400));
  }

  const imageUrl = await uploadToCloudinary(req.body.image);
  console.log('Image uploaded to Cloudinary:', imageUrl);

  res.status(200).json({
    status: 'success',
    data: {
      imageUrl
    }
  });
});

export const deleteProfileImage = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    return next(new AppError('No public ID provided', 400));
  }

  try {
    console.log('Attempting to delete image from Cloudinary:', publicId);
    await deleteFromCloudinary(publicId);
    console.log('Successfully deleted image from Cloudinary:', publicId);

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    
    // If the image doesn't exist, consider it a success
    if (error.message.includes('not found')) {
      return res.status(200).json({
        status: 'success',
        message: 'Image already deleted or not found'
      });
    }
    
    throw error;
  }
}); 