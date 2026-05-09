import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import dataController from "../../controllers/Admin/dataController.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(protect);
router.use(restrictTo("admin"));

// POST /api/admin/data
router.post(
  "/data",
  dataController.upload.single("file"),
  dataController.uploadData
);

export default router;
