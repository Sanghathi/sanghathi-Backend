import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import {
  submitIatData,
  deleteAllIat,
  getIatById,
} from "../../controllers/Admin/IatMarksController.js";

const router = Router();

router.use(protect);

router.get("/:id", getIatById);

router.use(restrictTo("admin", "hod", "director"));

router.route("/:userId").post(submitIatData).delete(deleteAllIat);

export default router;