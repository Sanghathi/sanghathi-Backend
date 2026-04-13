import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import {
  submitIatData,
  deleteAllIat,
  getIatById,
} from "../../controllers/Admin/IatMarksController.js";

const router = Router();

router.use(protect);
router.use(restrictTo("admin", "hod", "director"));

router.route("/:userId").post(submitIatData).delete(deleteAllIat);

router.get("/:id", getIatById);

export default router;