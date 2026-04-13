import express from 'express';
import { getRoleByName, getAllRoles } from '../controllers/roleController.js';
import { protect, restrictTo } from "../controllers/authController.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin", "hod", "director"));

// Route to get a role by name
router.get('/roles/:role', getRoleByName);

// Route to get all roles
router.get('/roles', getAllRoles);

export default router;
