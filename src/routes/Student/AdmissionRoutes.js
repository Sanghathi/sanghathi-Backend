import { Router } from 'express';
import {
  createOrUpdateAdmissionDetails,
  getAdmissionDetailsByUserId,
  getAllAdmissionDetails
} from '../../controllers/Student/admissionController.js';

const router = Router();

router.route('/')
  .post(createOrUpdateAdmissionDetails)
  .get(getAllAdmissionDetails);

router.get('/:userId', getAdmissionDetailsByUserId);

export default router;
