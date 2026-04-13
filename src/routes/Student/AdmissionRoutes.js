import { Router } from 'express';
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateAdmissionDetails,
  getAdmissionDetailsByUserId,
  getAllAdmissionDetails
} from '../../controllers/Student/admissionController.js';

const router = Router();

router.use(protect);

router.route('/')
  .post(createOrUpdateAdmissionDetails)
  .get(getAllAdmissionDetails);

router.get('/:userId', getAdmissionDetailsByUserId);

export default router;
