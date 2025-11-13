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
      logger.info(`New IAT record created for user ${userId}, semester ${semester}`);
      return res.status(201).json({ status: "success", data: { iat: newIat } });
    }

    // Find the index of the existing semester
    const semesterIndex = iat.semesters.findIndex((s) => s.semester === semester);

    if (semesterIndex === -1) {
      // Add a new semester if it doesn't exist
      iat.semesters.push({ semester, subjects });
      logger.info(`New semester ${semester} added for user ${userId}`);
    } else {
      // Update the subjects for the existing semester (FIXED: No duplication)
      iat.semesters[semesterIndex].subjects = subjects;
      logger.info(`Semester ${semester} updated for user ${userId}`);
    }

    await iat.save();
    res.status(200).json({ status: "success", data: { iat } });

  } catch (error) {
    logger.error("Error in submitIatData:", error.message, { stack: error.stack });
    res.status(500).json({ message: "Internal server error: " + error.message });
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

// Delete a specific semester for a user
export const deleteSemester = async (req, res) => {
  try {
    const { userId, semester } = req.params;

    const iat = await Iat.findOne({ userId });

    if (!iat) {
      return res.status(404).json({ message: "No IAT records found for this user" });
    }

    // Filter out the semester to be deleted
    const initialLength = iat.semesters.length;
    iat.semesters = iat.semesters.filter((s) => s.semester !== parseInt(semester));

    if (iat.semesters.length === initialLength) {
      return res.status(404).json({ message: `Semester ${semester} not found` });
    }

    await iat.save();
    logger.info(`Semester ${semester} deleted for user ${userId}`);

    res.status(200).json({ 
      status: "success", 
      message: `Semester ${semester} deleted successfully`,
      data: { iat } 
    });

  } catch (error) {
    logger.error("Error in deleteSemester:", error.message, { stack: error.stack });
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};

// Delete multiple semesters for a user
export const deleteMultipleSemesters = async (req, res) => {
  try {
    const { userId } = req.params;
    const { semesters } = req.body; // Expecting array of semester numbers: [1, 2, 3]

    if (!Array.isArray(semesters) || semesters.length === 0) {
      return res.status(400).json({ message: "Please provide an array of semester numbers to delete" });
    }

    const iat = await Iat.findOne({ userId });

    if (!iat) {
      return res.status(404).json({ message: "No IAT records found for this user" });
    }

    const initialLength = iat.semesters.length;
    
    // Filter out all semesters that are in the semesters array
    iat.semesters = iat.semesters.filter((s) => !semesters.includes(s.semester));

    const deletedCount = initialLength - iat.semesters.length;

    if (deletedCount === 0) {
      return res.status(404).json({ message: "None of the specified semesters were found" });
    }

    await iat.save();
    logger.info(`${deletedCount} semester(s) deleted for user ${userId}`);

    res.status(200).json({ 
      status: "success", 
      message: `${deletedCount} semester(s) deleted successfully`,
      deletedSemesters: semesters.filter((sem) => !iat.semesters.some((s) => s.semester === sem)),
      data: { iat } 
    });

  } catch (error) {
    logger.error("Error in deleteMultipleSemesters:", error.message, { stack: error.stack });
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};

export const deleteAllIat = async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await Iat.deleteMany({ userId: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No IAT records found for user ID" });
    }

    logger.info(`All IAT records deleted for user ${userId}`);
    res.status(200).json({ 
      status: "success",
      message: "All IAT records deleted successfully",
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error("Error in deleteAllIat:", error.message, { stack: error.stack });
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};