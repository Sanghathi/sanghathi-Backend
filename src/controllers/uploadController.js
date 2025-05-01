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
  try {
    const { publicId } = req.params;
    console.log('[Backend Delete] Received delete request for:', publicId);

    // Log Cloudinary config
    console.log('[Backend Delete] Cloudinary config:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });

    // Use the imported deleteFromCloudinary function instead of cloudinary directly
    const result = await deleteFromCloudinary(publicId);
    console.log('[Backend Delete] Cloudinary response:', result);

    res.json({ 
      status: 'success', 
      message: 'Image deleted successfully',
      result 
    });
  } catch (error) {
    console.error('[Backend Delete] Error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to delete image',
      error: error.message 
    });
    return next(new AppError('Failed to delete image', 500));
  }
});