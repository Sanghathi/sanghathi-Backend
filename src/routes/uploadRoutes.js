import express from 'express';
import { uploadProfileImage, deleteProfileImage } from '../controllers/uploadController.js';
import { protect } from '../controllers/authController.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Test endpoint to check Cloudinary configuration
router.get('/cloudinary-status', (req, res) => {
  try {
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

// Protect all routes after this middleware
router.use(protect);

router.post('/profile-image', uploadProfileImage);
router.delete('/profile-image/:publicId', deleteProfileImage);

export default router; 