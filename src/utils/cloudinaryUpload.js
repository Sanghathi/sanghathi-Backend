import cloudinary from '../config/cloudinary.js';

export const uploadToCloudinary = async (base64Image, folder = 'mentor-connect') => {
  try {
    // Remove the data:image/...;base64, prefix
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64Data}`,
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      }
    );
    
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}; 