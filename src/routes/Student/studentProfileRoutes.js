import express from "express";
import { getStudentProfile } from "../../controllers/Student/studentProfileController.js";
import { protect } from "../../controllers/authController.js";

const router = express.Router();

router.use(protect);

router.get("/:userId", getStudentProfile);

export default router;
