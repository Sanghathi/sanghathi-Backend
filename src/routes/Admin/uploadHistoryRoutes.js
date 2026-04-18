import { Router } from "express";
import { protect, restrictTo } from "../../controllers/authController.js";
import {
  createUploadSession,
  getUploadSessionById,
  listUploadSessions,
  previewUploadRestore,
  restoreUploadSession,
} from "../../controllers/Admin/uploadHistoryController.js";

const router = Router();

router.use(protect);
router.use(restrictTo("admin"));

router.route("/upload-history").get(listUploadSessions).post(createUploadSession);
router.route("/upload-history/:sessionId").get(getUploadSessionById);
router.route("/upload-history/:sessionId/restore-preview").post(previewUploadRestore);
router.route("/upload-history/:sessionId/restore").post(restoreUploadSession);

export default router;