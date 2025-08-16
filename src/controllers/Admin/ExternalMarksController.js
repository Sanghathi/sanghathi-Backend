import External from "../../models/Admin/ExternalMarks.js";
import logger from "../../utils/logger.js";
import AppError from "../../utils/appError.js";

export const submitExternalData = async (req, res) => {
  try {
    const { semester, subjects, passingDate, sgpa } = req.body;
    const userId = req.params.userId;

    if (!semester || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ message: "Missing or invalid required fields (semester, subjects)" });
    }

    for (const subject of subjects) {
      if (
        !subject.subjectCode ||
        !subject.subjectName ||
        subject.internalMarks == null ||
        subject.externalMarks == null ||
        subject.total == null
      ) {
        return res.status(400).json({
          message: "Each subject must have subjectCode, subjectName, internalMarks, externalMarks, and total.",
        });
      }
    }

    let external = await External.findOne({ userId });

    if (!external) {
      // No record exists, create new with semester, passingDate, sgpa
      const newExternal = new External({
        userId,
        semesters: [{
          semester,
          subjects,
          passingDate,
          sgpa
        }]
      });

      await newExternal.save();
      return res.status(201).json({ status: "success", data: { external: newExternal } });
    }

    // Record exists — find semester
    const semesterIndex = external.semesters.findIndex((s) => s.semester === semester);

    if (semesterIndex !== -1) {
      // Update existing semester
      external.semesters[semesterIndex].subjects = subjects;
      external.semesters[semesterIndex].passingDate = passingDate;
      external.semesters[semesterIndex].sgpa = sgpa;
    } else {
      // Add new semester
      external.semesters.push({
        semester,
        subjects,
        passingDate,
        sgpa
      });
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