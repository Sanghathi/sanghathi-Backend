// import express from "express";
// import {
//   createLocalGuardian,
//   getLocalGuardianById,
//   getAllLocalGuardians,
//   updateLocalGuardianById,
//   deleteLocalGuardianById,
//   createOrUpdateLocalGuardian
// } from "../../controllers/Student/localGuardianController.js";

// const router = express.Router();

// router.route("/")
//   .post(createLocalGuardian)       // Create a new Local Guardian
//   .get(getAllLocalGuardians);      // Get all Local Guardians

// router.route("/:id")
//   .get(getLocalGuardianById)       // Get Local Guardian by ID
//   .patch(updateLocalGuardianById)  // Update Local Guardian by ID
//   .delete(deleteLocalGuardianById); // Delete Local Guardian by ID
// router.post('/local-guardians', createOrUpdateLocalGuardian);
// export default router;

import express from "express";
import {
  getLocalGuardianById,
  getAllLocalGuardians,
  updateLocalGuardianById,
  deleteLocalGuardianById,
  createOrUpdateLocalGuardian,
} from "../../controllers/Student/localGuardianController.js";

const router = express.Router();

// Routes for Local Guardians
router.route("/")
  .post(createOrUpdateLocalGuardian) // Create or update a Local Guardian
  .get(getAllLocalGuardians);        // Get all Local Guardians

router.route("/:id")
  .get(getLocalGuardianById)         // Get Local Guardian by ID
  .patch(updateLocalGuardianById)    // Update Local Guardian by ID
  .delete(deleteLocalGuardianById);   // Delete Local Guardian by ID

export default router;
