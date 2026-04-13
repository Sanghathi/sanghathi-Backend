import { Router } from "express";
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateComplaint,
  getComplaintByUserId,
  getAllComplaintsWithUsers,
  deleteComplaintByUserId,
} from "../../controllers/Complain/ComplaintController.js";

const router = Router();

router.use(protect);

router.get("/:userId", getComplaintByUserId);

router.get("/", getAllComplaintsWithUsers);

router.post("/", createOrUpdateComplaint);

router.delete("/:userId", deleteComplaintByUserId);

export default router;
