import { Router } from "express";
import { protect } from "../../controllers/authController.js";
import {
  createOrUpdateCompetition,
  getCompetitionsByUserId,
  getAllCompetitions,
  deleteCompetitionById,
} from "../../controllers/CareerReview/CompetitionController.js";

const router = Router();
router.use(protect);

router.get("/", getAllCompetitions);
router.post("/competition", createOrUpdateCompetition);
router.get("/competition/:id", getCompetitionsByUserId);
router.delete("/competition/:id", deleteCompetitionById);

export default router;
