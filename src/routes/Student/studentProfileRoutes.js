import express from "express";
import { getStudentProfile } from "../../controllers/Student/studentProfileController.js";

const router = express.Router();

router.get("/:userId", getStudentProfile);

export default router;
