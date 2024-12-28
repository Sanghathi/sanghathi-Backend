import {Router} from "express";

import{
    createOrUpdateHobbies,
    getHobbiesByUserId,
    getAllHobbies,
    deleteHobbiesByUserId,
  } from "../../controllers/CareerReview/HobbiesController.js";

  const router = Router();

   //Routes for Proffessional Body
    router.get("/hobbies/:userId",getHobbiesByUserId);
    router.get("/",getAllHobbies);
    router.post("/hobbies",createOrUpdateHobbies);
    router.delete("/hobbies/:userId",deleteHobbiesByUserId);

    export default router;