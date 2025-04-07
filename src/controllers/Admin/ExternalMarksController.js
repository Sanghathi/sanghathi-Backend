import External from "../../models/Admin/ExternalMarks.js";
import logger from "../../utils/logger.js";
import AppError from "../../utils/appError.js";

export const submitExternalData = async (req, res) => {
  try {
    const { semester, subjects } = req.body;
    const userId = req.params.userId;

    if (!semester || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ message: "Missing or invalid required fields (semester, subjects)" });
    }

    for (const subject of subjects) {
      if (!subject.subjectCode || !subject.subjectName) {
        return res.status(400).json({ message: "Each subject must have subjectCode and subjectName" });
      }
    }

    let external = await External.findOne({ userId });

    if (!external) {
      // Create a new External record if one doesn't exist
      const newExternal = new External({
        userId,
        semesters: [{
          semester,
          subjects,
        }],
      });
      await newExternal.save();
      return res.status(201).json({ status: "success", data: { external: newExternal } });
    }

    // Find the existing semester
    let semesterObj = external.semesters.find((s) => s.semester === semester);

    if (!semesterObj) {
      // Add a new semester if it doesn't exist
      semesterObj = { semester, subjects };
      external.semesters.push(semesterObj);
    } else {
      // Update the subjects for the existing semester
      semesterObj.subjects = subjects;
    }

    await external.save();
    res.status(200).json({ status: "success", data: { external } });

  } catch (error) {
    logger.error("Error in submitExternalData:", error.message, { stack: error.stack });
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};

export const getExternalById = async (req, res, next) => {
  const { userId } = req.params;

  const external = await External.findOne({ userId });

  if (!external) {
    return next(new AppError("External marks data not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      external,
    },
  });
};

export const deleteAllExternal = async (req, res) => {
  const userId = req.params.userId;

  const result = await External.deleteMany({ userId: userId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "No External records found for user ID" });
  }

  res.status(204).json({ message: "All External records deleted successfully" });
}; 