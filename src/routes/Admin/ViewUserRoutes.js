import express from 'express';
import { getGroupedStudents } from '../../controllers/Admin/ViewUserController.js';

const router = express.Router();

router.get('/grouped', getGroupedStudents);

export default router;