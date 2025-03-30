import express from "express";
import { ParentDetails } from "../../models/Student/ParentDetails.js"; // Ensure correct model path

const router = express.Router();

/**
 * @route   POST /api/parent-details
 * @desc    Save parent details
 */
router.post("/", async (req, res) => {
  try {
    const { fatherFirstName, motherFirstName, userId, ...rest } = req.body;

    // Validate required fields
    if (!fatherFirstName || !motherFirstName) {
      return res.status(400).json({ message: "Father's and mother's first names are required." });
    }

    // Check if parent details already exist for the user
    let existingDetails = await ParentDetails.findOne({ userId });

    if (existingDetails) {
      return res.status(400).json({ message: "Parent details already exist for this user." });
    }

    // Create new parent details instance
    const parentDetails = new ParentDetails({
      userId,
      fatherFirstName,
      motherFirstName,
      ...rest,
    });

    // Save to database
    await parentDetails.save();
    res.status(201).json({ message: "Parent details saved successfully!", data: parentDetails });
  } catch (error) {
    console.error("Error saving parent details:", error);
    res.status(500).json({ message: "An error occurred while saving parent details", error: error.message });
  }
});

/**
 * @route   GET /api/parent-details
 * @desc    Retrieve all parent details
 */
router.get("/", async (req, res) => {
  try {
    const parentDetails = await ParentDetails.find();
    res.status(200).json(parentDetails);
  } catch (error) {
    console.error("Error retrieving parent details:", error);
    res.status(500).json({ message: "Error retrieving details", error: error.message });
  }
});

/**
 * @route   GET /api/parent-details/:userId
 * @desc    Retrieve parent details by userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const parentDetails = await ParentDetails.findOne({ userId });

    if (!parentDetails) {
      return res.status(404).json({ message: "Parent details not found!" });
    }

    res.status(200).json(parentDetails);
  } catch (error) {
    console.error("Error retrieving parent details:", error);
    res.status(500).json({ message: "Error retrieving details", error: error.message });
  }
});

/**
 * @route   PUT /api/parent-details/:userId
 * @desc    Update parent details by userId
 */
router.post("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedData = req.body;

    const updatedParentDetails = await ParentDetails.findOneAndUpdate(
      { userId },
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedParentDetails) {
      return res.status(404).json({ message: "Parent details not found!" });
    }

    res.status(200).json({ message: "Parent details updated successfully!", data: updatedParentDetails });
  } catch (error) {
    console.error("Error updating parent details:", error);
    res.status(500).json({ message: "Error updating details", error: error.message });
  }
});

/**
 * @route   DELETE /api/parent-details/:userId
 * @desc    Delete parent details by userId
 */
router.delete("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedParentDetails = await ParentDetails.findOneAndDelete({ userId });

    if (!deletedParentDetails) {
      return res.status(404).json({ message: "Parent details not found!" });
    }

    res.status(200).json({ message: "Parent details deleted successfully!" });
  } catch (error) {
    console.error("Error deleting parent details:", error);
    res.status(500).json({ message: "Error deleting details", error: error.message });
  }
});

export default router;
