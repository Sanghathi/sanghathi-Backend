import { Router } from 'express';
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateAcademicDetails,
  getAcademicDetailsByUserId
} from '../../controllers/Student/academicsController.js';

const router = Router();

router.use(protect);

router.route('/')
  .post(createOrUpdateAcademicDetails);

router.route('/:userId')
  .get(getAcademicDetailsByUserId);

export default router;
