import TYLScores from '../models/TYLScores.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

export const getTYLScores = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const tylScores = await TYLScores.findOne({ userId });

  if (!tylScores) {
    // Create initial document with all semesters if none exists
    const initialSemesters = Array.from({ length: 8 }, (_, i) => ({
      semester: i + 1,
      scores: {
        "Language Proficiency in English": { target: "", actual: "" },
        "Aptitude": { target: "", actual: "" },
        "Core Fundamentals": { target: "", actual: "" },
        "Certifications": { target: "", actual: "" },
        "Experiential Mini Projects": { target: "", actual: "" },
        "Internships": { target: "", actual: "" },
        "Soft Skills": { target: "", actual: "" }
      }
    }));

    const newTYLScores = await TYLScores.create({
      userId,
      semesters: initialSemesters
    });

    return res.status(200).json({
      status: 'success',
      data: newTYLScores.semesters
    });
  }

  res.status(200).json({
    status: 'success',
    data: tylScores.semesters
  });
});

export const updateTYLScores = catchAsync(async (req, res, next) => {
  const { userId, semester, scores } = req.body;

  if (!userId || !semester || !scores) {
    return next(new AppError('User ID, semester, and scores are required', 400));
  }

  let tylScores = await TYLScores.findOne({ userId });

  if (!tylScores) {
    // Create new document if none exists
    tylScores = await TYLScores.create({
      userId,
      semesters: [{
        semester,
        scores
      }]
    });
  } else {
    // Update existing semester or add new one
    const semesterIndex = tylScores.semesters.findIndex(s => s.semester === semester);
    
    if (semesterIndex >= 0) {
      tylScores.semesters[semesterIndex].scores = scores;
    } else {
      tylScores.semesters.push({ semester, scores });
    }

    await tylScores.save();
  }

  res.status(200).json({
    status: 'success',
    data: tylScores.semesters
  });
}); 