import express from "express";
import { protect } from "../../controllers/authController.js";
import { 
  createOrUpdateContactDetail,
  getContactDetails,
  getContactDetailsByUserId 
} from "../../controllers/Student/contactDetailsController.js";

const router = express.Router();

router.use(protect);

// Define routes
router.post("/", createOrUpdateContactDetail);
router.get("/", getContactDetails); 
router.get("/:userId", getContactDetailsByUserId);

// Export router
export default router;
