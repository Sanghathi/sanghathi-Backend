import express from 'express';
import { getGroupedStudents } from '../../controllers/Admin/ViewUserController.js';
import { protect, restrictTo } from "../../controllers/authController.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "hod", "director"));

router.get('/grouped', getGroupedStudents);

export default router;