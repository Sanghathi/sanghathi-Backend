import { Router } from "express";
import { protect } from "../controllers/authController.js";
import { getCollegeByCode, getColleges } from "../controllers/collegeController.js";

const router = Router();

router.use(protect);

router.get("/colleges", getColleges);
router.get("/colleges/:code", getCollegeByCode);

export default router;
