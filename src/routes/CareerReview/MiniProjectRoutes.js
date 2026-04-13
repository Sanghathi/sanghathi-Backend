import {Router} from "express";
import { protect } from "../../controllers/authController.js";

import{
    createOrUpdateMiniProject,
    getMiniProjectByUserId,
    deleteMiniProjectById,
  } from "../../controllers/CareerReview/MiniProjectController.js";

  const router = Router();

router.use(protect);

   //Routes for Proffessional Body
    router.get("/miniproject/:userId",getMiniProjectByUserId);
    router.post("/miniproject",createOrUpdateMiniProject); 
    router.delete("/miniproject/:userId",deleteMiniProjectById);

    export default router;