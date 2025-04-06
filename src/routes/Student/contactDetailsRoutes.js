// routes/Student/contactDetailsRoutes.js

import express from "express"; // <-- you missed this
const router = express.Router(); // <-- create router instance

import { 
  createOrUpdateContactDetail,
  getContactDetails,
  getContactDetailsByUserId 
} from "../../controllers/Student/contactDetailsController.js";

// Define routes
router.post("/", createOrUpdateContactDetail);
router.get("/", getContactDetails); 
router.get("/:userId", getContactDetailsByUserId);

// Export router
export default router;
