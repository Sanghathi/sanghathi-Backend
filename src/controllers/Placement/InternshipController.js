import Internship from "../../models/Placement/Internship.js";

export const createOrUpdateInternships = async (req, res) => {
  try {
    const { userId, internships } = req.body;

    const existingRecord = await Internship.findOne({ userId });

    if (existingRecord) {
      existingRecord.internships = internships;
      await existingRecord.save();
    } else {
      await Internship.create({ userId, internships });
    }

    res.status(200).json({ status: "success", message: "Internships saved!" });
  } catch (err) {
    console.error("Error saving internships:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to save internships",
      error: err.message,
    });
  }
};

export const getInternshipsByUserId = async (req, res) => {
  try {
    const { menteeId } = req.params;
    const internshipData = await Internship.findOne({ userId: menteeId });

    res.status(200).json({
      status: "success",
      data: internshipData ? internshipData.internships : [],
    });
  } catch (err) {
    console.error("Error fetching internships by userId:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch internship data",
      error: err.message,
    });
  }
};
