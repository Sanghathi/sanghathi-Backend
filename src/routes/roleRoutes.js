import express from 'express';
import { getRoleByName, getAllRoles } from '../controllers/roleController.js';

const router = express.Router();

// Route to get a role by name
router.get('/roles/:role', getRoleByName);

// Route to get all roles
router.get('/roles', getAllRoles);

export default router;
