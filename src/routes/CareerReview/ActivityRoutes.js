import {Router} from "express";
import { protect } from "../../controllers/authController.js";

import{
    createOrUpdateActivity,
    getActivityByUserId,
    deleteActivityById,
  } from "../../controllers/CareerReview/ActivityController.js";

  const router = Router();

router.use(protect);

   //Routes for Proffessional Body
    router.get("/activity/:userId",getActivityByUserId);
    router.post("/activity",createOrUpdateActivity); 
    router.delete("/activity/:userId",deleteActivityById);

    export default router;