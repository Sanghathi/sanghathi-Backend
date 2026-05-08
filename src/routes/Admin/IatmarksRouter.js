import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import {
  submitIatData,
  deleteAllIat,
  getIatById,
} from "../../controllers/Admin/IatMarksController.js";

const router = Router();

router.use(protect);

// Allow all authenticated users to GET their IAT data.
// Restrict create/delete operations to admin/hod/director only.
router.route('/:userId')
  .post(restrictTo('admin', 'hod', 'director'), submitIatData)
  .delete(restrictTo('admin', 'hod', 'director'), deleteAllIat);

router.get('/:id', getIatById);

export default router;