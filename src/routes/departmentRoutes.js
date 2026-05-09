import { Router } from "express";
import { protect } from "../controllers/authController.js";
import {
  getDepartmentByCode,
  getDepartments,
} from "../controllers/departmentController.js";

const router = Router();

router.use(protect);

router.get("/departments", getDepartments);
router.get("/departments/:code", getDepartmentByCode);

export default router;
