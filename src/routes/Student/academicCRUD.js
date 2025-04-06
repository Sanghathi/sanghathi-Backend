import { Router } from 'express';
import {
  createOrUpdateAcademicDetails,
  getAcademicDetailsByUserId
} from '../../controllers/Student/academicsController.js';

const router = Router();

router.route('/')
  .post(createOrUpdateAcademicDetails);

router.route('/:userId')
  .get(getAcademicDetailsByUserId);

export default router;
