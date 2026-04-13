import { Router } from "express";
import { protect } from "../../controllers/authController.js";

const router = Router();

router.use(protect);

export default router;
