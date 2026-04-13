
import express from "express";
import { createOrUpdatePlacements } from "../../controllers/Placement/PlacementController.js";
import { getPlacementsByUserId } from "../../controllers/Placement/PlacementController.js";
import { protect } from "../../controllers/authController.js";

const router = express.Router();

router.use(protect);

router.post("/", createOrUpdatePlacements);
router.get("/placements/:menteeId", getPlacementsByUserId);

export default router;
