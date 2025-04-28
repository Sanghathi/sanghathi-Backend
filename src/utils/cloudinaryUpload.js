import cloudinary from '../config/cloudinary.js';
import AppError from './appError.js';

/**
 * Uploads an image to Cloudinary
 * @param {string} file - Base64 encoded image or file path
 * @param {string} folder - Cloudinary folder to upload to
 * @returns {Promise<string>} - URL of the uploaded image
 */
export const uploadToCloudinary = async (file, folder = 'profile-images') => {
  try {
    // Check if file is base64
    const isBase64 = file.includes('base64');
    
    // Upload the image
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    console.log('Cloudinary upload result:', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new AppError(`Error uploading image to Cloudinary: ${error.message}`, 400);
  }
};

/**
 * Deletes an image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new AppError(`Error deleting image from Cloudinary: ${error.message}`, 400);
  }
}; 