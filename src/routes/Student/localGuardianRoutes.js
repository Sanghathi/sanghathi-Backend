import { Router } from 'express';
import {
  createOrUpdateLocalGuardian,
  getLocalGuardianByUserId
} from '../../controllers/Student/localGuardianController.js';

const router = Router();

router.route('/')
  .post(createOrUpdateLocalGuardian);

router.get('/:userId', getLocalGuardianByUserId);

export default router;
