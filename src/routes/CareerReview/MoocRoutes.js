import {Router} from "express";
import { protect } from "../../controllers/authController.js";

import{
    createOrUpdateMooc,
    getMoocByUserId,
    deleteMoocById,
  } from "../../controllers/CareerReview/MoocController.js";

  const router = Router();

router.use(protect);

   //Routes for Proffessional Body
    router.get("/mooc/:userId",getMoocByUserId);
    router.post("/mooc",createOrUpdateMooc); 
    router.delete("/mooc/:userId",deleteMoocById);

    export default router;