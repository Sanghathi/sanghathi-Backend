import { Router } from "express";
import { protect } from "../controllers/authController.js";
import {
  createVersion,
  getDraft,
  listVersions,
  restoreVersion,
  saveDraft,
} from "../controllers/formDraftController.js";

const router = Router();

router.use(protect);

router.route("/drafts/:formType").get(getDraft).put(saveDraft);

router.route("/versions/:formType").get(listVersions).post(createVersion);

router.route("/versions/:formType/:version/restore").post(restoreVersion);

export default router;
