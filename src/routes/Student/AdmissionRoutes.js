import express from "express";
import {
  createAdmission,
  getAdmissionById,
  getAllAdmissions,
  updateAdmissionById,
  deleteAdmissionById,
} from "../../controllers/Student/admissionController.js";

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const admission = new Admission(req.body);
    await admission.save();
    res.status(201).json({ success: true, data: admission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.route("/")
  .post(createAdmission)       // Create a new admission record
  .get(getAllAdmissions);      // Get all admissions

router.route("/:id")
  .get(getAdmissionById)       // Get admission by ID
  .patch(updateAdmissionById)  // Update admission by ID
  .delete(deleteAdmissionById); // Delete admission by ID

export default router;
