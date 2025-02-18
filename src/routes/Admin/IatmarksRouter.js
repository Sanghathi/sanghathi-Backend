import { Router } from "express";
import {
  submitIatData,
  deleteAllIat,
  getIatById,
} from "../../controllers/Admin/IatMarksController.js";

const router = Router();

router.route("/:userId").post(submitIatData).delete(deleteAllIat);

router.get("/:id", getIatById);

export default router;