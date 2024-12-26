import {Router} from "express";

import{
    createOrUpdatePBEvents,
    getPBEventsByUserId,
    deletePBEventById,
  } from "../../controllers/CareerReview/PBEventController.js";

import{
    createOrUpdatePB,
    getPBByUserId,
    deletePBById,
  } from "../../controllers/CareerReview/PBController.js";

  const router = Router();

  //Routes for Proffessional Body
  router.get("/proffessionalbody/:id",getPBByUserId);
  router.post("/proffessionalbody",createOrUpdatePB); 
  router.delete("/proffessionalbody/:id",deletePBById);

  //Routes for Proffessional Body Events
  router.get("/professionalbodyevent/:id",getPBEventsByUserId);
  router.post("/professionalbodyevent",createOrUpdatePBEvents); 
  router.delete("/professionalbodyevent/:id",deletePBEventById);

  export default router;