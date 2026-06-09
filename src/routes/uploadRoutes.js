import express from 'express';
import multer from 'multer';
import { uploadProfileImage, deleteProfileImage, uploadThreadAttachment } from '../controllers/uploadController.js';
import { protect } from '../controllers/authController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const uploadThreadAttachmentFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'fail',
        message: 'Attachment must be 10 MB or smaller',
      });
    }

    if (error) {
      return next(error);
    }

    return next();
  });
};

// Protect all routes after this middleware
router.use(protect);

router.post('/profile-image', uploadProfileImage);
router.post('/thread-attachment', uploadThreadAttachmentFile, uploadThreadAttachment);
router.delete('/profile-image/:publicId', deleteProfileImage);

export default router;
