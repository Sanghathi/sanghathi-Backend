import {Router} from "express";

import{
    createOrUpdateMiniProject,
    getMiniProjectByUserId,
    deleteMiniProjectById,
  } from "../../controllers/CareerReview/MiniProjectController.js";

  const router = Router();

   //Routes for Proffessional Body
    router.get("/miniproject/:userId",getMiniProjectByUserId);
    router.post("/miniproject",createOrUpdateMiniProject); 
    router.delete("/miniproject/:userId",deleteMiniProjectById);

    export default router;