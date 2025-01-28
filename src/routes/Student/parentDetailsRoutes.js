import express from "express";
import { ParentDetails } from "../../models/Student/ParentDetails.js"; // Ensure correct path to the model

const router = express.Router();

// POST endpoint to save parent details
router.post("/", async (req, res) => {
  try {
    const { fatherFirstName, motherFirstName, ...rest } = req.body;

    // Validate required fields
    if (!fatherFirstName || !motherFirstName) {
      return res.status(400).json({
        message: "Father's and mother's first names are required.",
      });
    }

    // Create new parent details instance
    const parentDetails = new ParentDetails({
      fatherFirstName,
      motherFirstName,
      ...rest,
    });

    // Save to database
    await parentDetails.save();
    res.status(200).json({
      message: "Parent details saved successfully!",
      data: parentDetails,
    });
  } catch (error) {
    console.error("Error saving parent details:", error);
    res.status(500).json({
      message: "An error occurred while saving parent details",
      error: error.message,
    });
  }
});

// GET endpoint to retrieve parent details
router.get("/", async (req, res) => {
  try {
    const parentDetails = await ParentDetails.find(); // Retrieve all parent details
    res.status(200).json(parentDetails);
  } catch (error) {
    console.error("Error retrieving parent details:", error);
    res.status(500).json({
      message: "An error occurred while retrieving parent details",
      error: error.message,
    });
  }
});

export default router;
