import { Router } from 'express';
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateLocalGuardian,
  getLocalGuardianByUserId
} from '../../controllers/Student/localGuardianController.js';

const router = Router();

router.use(protect);

router.route('/')
  .post(createOrUpdateLocalGuardian);

router.get('/:userId', getLocalGuardianByUserId);

export default router;