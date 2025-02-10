import StudentProfile from "../../models/Student/Profile.js"; 
import asyncHandler from "express-async-handler"; 

export const getStudentProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const studentProfile = await StudentProfile.findOne({ userId });

    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.status(200).json(studentProfile);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
