import express from 'express';
import { uploadProfileImage, deleteProfileImage } from '../controllers/uploadController.js';
import { protect } from '../controllers/authController.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

router.post('/profile-image', uploadProfileImage);
router.delete('/profile-image/:publicId', deleteProfileImage);

export default router; 