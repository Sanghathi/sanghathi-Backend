import {Router} from "express";
import {
  createOrUpdateCareerCounselling,
  getCareerCounsellingById,
  getAllCareer,
  deleteCareerCounsellingbyId,
} from "../../controllers/CareerReview/CareerCounsellingController.js";

import{
  createOrUpdateClubs,
  getClubsByUserId,
  deleteClubById,
} from "../../controllers/CareerReview/ClubController.js";

import{
  createOrUpdateClubEvents,
  getClubEventsByUserId,
  deleteClubEventById,
} from "../../controllers/CareerReview/ClubEventController.js";


const router = Router();

//Routes for career review
router.get("/",getAllCareer); 
router.post("/career",createOrUpdateCareerCounselling);
router.get("/career/:id",getCareerCounsellingById); 
router.delete("/career/:id",deleteCareerCounsellingbyId);

//Routes for clubs
router.get("/clubs/:id",getClubsByUserId);
router.post("/clubs",createOrUpdateClubs); 
router.delete("/clubs/:id",deleteClubById);

//Routes for Club Events
router.get("/clubevent/:id",getClubEventsByUserId);
router.post("/clubevent",createOrUpdateClubEvents); 
router.delete("/clubevent/:id",deleteClubEventById);

export default router;