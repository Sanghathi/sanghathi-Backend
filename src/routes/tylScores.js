import express from 'express';
import { protect, restrictTo } from '../controllers/authController.js';
import { deleteTYLScores, getTYLScores, updateTYLScores } from '../controllers/TYLScoresController.js';

const router = express.Router();

// Apply protect middleware to all routes in this router
router.use(protect);

// Get TYL scores for a user
router.get('/:userId', getTYLScores);

// Update TYL scores (faculty/admin)
router.post('/', restrictTo('faculty', 'admin'), updateTYLScores);

// Delete TYL scores for rollback workflows (admin)
router.delete('/:userId', restrictTo('admin'), deleteTYLScores);

export default router; 