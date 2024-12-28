import {Router} from "express";

import{
    createOrUpdateMooc,
    getMoocByUserId,
    deleteMoocById,
  } from "../../controllers/CareerReview/MoocController.js";

  const router = Router();

   //Routes for Proffessional Body
    router.get("/mooc/:userId",getMoocByUserId);
    router.post("/mooc",createOrUpdateMooc); 
    router.delete("/mooc/:userId",deleteMoocById);

    export default router;