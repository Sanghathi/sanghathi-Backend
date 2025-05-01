import { Router } from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

// Simple test route to check Cloudinary configuration
router.get('/cloudinary-status', (req, res) => {
  try {
    // Return Cloudinary configuration status
    const config = cloudinary.config();
    return res.status(200).json({
      success: true,
      message: 'Cloudinary configuration is valid',
      cloud_name: config.cloud_name,
      api_key_exists: !!config.api_key,
      api_secret_exists: !!config.api_secret
    });
  } catch (error) {
    console.error('Error checking Cloudinary status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check Cloudinary configuration',
      error: error.message
    });
  }
});

// Test route for Cloudinary upload
router.post('/test-upload', upload.single('image'), async (req, res) => {
  try {
    // Check if we have a file or base64 data
    let imageData;
    let uploadResult;
    
    if (req.file) {
      console.log('Processing uploaded file:', req.file.originalname);
      // Convert file buffer to base64
      imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.image) {
      console.log('Processing base64 image');
      imageData = req.body.image;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image found in request'
      });
    }
    
    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    uploadResult = await uploadToCloudinary(imageData, 'mentor-connect/test');
    console.log('Upload successful, image URL:', uploadResult);
    
    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: uploadResult
    });
  } catch (error) {
    console.error('Error in test upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

export default router; 