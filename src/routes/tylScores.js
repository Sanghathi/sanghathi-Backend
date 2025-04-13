import express from 'express';
import { protect, restrictTo } from '../controllers/authController.js';
import { getTYLScores, updateTYLScores } from '../controllers/TYLScoresController.js';

const router = express.Router();

// Apply protect middleware to all routes in this router
router.use(protect);

// Get TYL scores for a user
router.get('/:userId', getTYLScores);

// Update TYL scores (faculty only)
router.post('/', restrictTo('faculty'), updateTYLScores);

export default router; 