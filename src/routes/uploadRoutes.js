import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/uploadController.js';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

// Route for handling image uploads
router.post('/', upload.single('image'), uploadImage);

export default router; 