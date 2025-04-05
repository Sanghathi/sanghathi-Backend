import POAttainment from "../../models/Student/POAttainment.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

// Create or update PO Attainment data
export const createOrUpdatePOAttainment = catchAsync(async (req, res, next) => {
  const { userId, semester, poAttainment, bloomLevel } = req.body;

  if (!userId || !semester) {
    return next(
      new AppError(
        "Please provide userId and semester in the request body",
        400
      )
    );
  }

  try {
    console.log("Creating or updating PO Attainment data for userId:", userId, "semester:", semester);
    
    // Find the user's PO attainment document or create if it doesn't exist
    let poAttainmentDoc = await POAttainment.findOne({ userId });
    
    if (!poAttainmentDoc) {
      // Create a new document with the semester data
      poAttainmentDoc = await POAttainment.create({
        userId,
        semesters: [{ semester, poAttainment, bloomLevel }]
      });
    } else {
      // Check if this semester already exists
      const semesterIndex = poAttainmentDoc.semesters.findIndex(
        sem => sem.semester === parseInt(semester, 10)
      );
      
      if (semesterIndex >= 0) {
        // Update existing semester
        poAttainmentDoc.semesters[semesterIndex].poAttainment = poAttainment;
        poAttainmentDoc.semesters[semesterIndex].bloomLevel = bloomLevel;
      } else {
        // Add new semester to the array
        poAttainmentDoc.semesters.push({ semester, poAttainment, bloomLevel });
      }
      
      // Sort semesters by semester number
      poAttainmentDoc.semesters.sort((a, b) => a.semester - b.semester);
      
      // Save changes
      await poAttainmentDoc.save();
    }

    res.status(200).json({
      status: "success",
      data: {
        poAttainment: poAttainmentDoc
      },
    });
  } catch (err) {
    console.error("Error in createOrUpdatePOAttainment:", err);
    next(new AppError(err.message, 400));
  }
});

// Get PO Attainment data by user ID and semester
export const getPOAttainmentByUserIdAndSemester = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { semester } = req.query;
  
  console.log("Fetching PO Attainment for userId:", id, "semester:", semester);
  
  if (!semester) {
    return next(new AppError("Semester parameter is required", 400));
  }
  
  const poAttainmentDoc = await POAttainment.findOne({ userId: id });

  if (!poAttainmentDoc) {
    return res.status(200).json({
      status: "success",
      data: null
    });
  }

  // Find the specific semester data
  const semesterData = poAttainmentDoc.semesters.find(
    sem => sem.semester === parseInt(semester, 10)
  );

  res.status(200).json({
    status: "success",
    data: semesterData || null
  });
});

// Get all PO Attainment data for a user
export const getAllPOAttainmentByUserId = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  console.log("Fetching all PO Attainment data for userId:", id);
  
  const poAttainmentDoc = await POAttainment.findOne({ userId: id });

  if (!poAttainmentDoc) {
    return res.status(200).json({
      status: "success",
      data: { semesters: [] }
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      semesters: poAttainmentDoc.semesters
    }
  });
}); 