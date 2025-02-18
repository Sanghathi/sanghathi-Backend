// iatController.js
import Iat from "../../models/Admin/IatMarks.js";
import logger from "../../utils/logger.js";
import AppError from "../../utils/appError.js";

export const submitIatData = async (req, res) => {
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


    let iat = await Iat.findOne({ userId });

    if (!iat) {
      // Create a new IAT record if one doesn't exist
      const newIat = new Iat({
        userId,
        semesters: [{
          semester,
          subjects,
        }],
      });
      await newIat.save();
      return res.status(201).json({ status: "success", data: { iat: newIat } });
    }

    // Find the existing semester
    let semesterObj = iat.semesters.find((s) => s.semester === semester);

    if (!semesterObj) {
      // Add a new semester if it doesn't exist
      semesterObj = { semester, subjects };
      iat.semesters.push(semesterObj);
    } else {
      // Update the subjects for the existing semester.
      semesterObj.subjects = subjects;
    }

    await iat.save();
    res.status(200).json({ status: "success", data: { iat } });

  } catch (error) {
    logger.error("Error in submitIatData:", error.message, { stack: error.stack });
    res.status(500).json({ message: "Internal server error: " + error.message }); // More specific error
  }
};

export const getIatById = async (req, res, next) => {
  const { id } = req.params;

  const iat = await Iat.findOne({ userId: id });

  if (!iat) {
    return next(new AppError("IAT data not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      iat,
    },
  });
};

export const deleteAllIat = async (req, res) => {
  const userId = req.params.userId;

  const result = await Iat.deleteMany({ userId: userId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "No IAT records found for user ID" });
  }

  res.status(204).json({ message: "All IAT records deleted successfully" });
};