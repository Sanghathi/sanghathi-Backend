import TYLScores from '../models/TYLScores.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import notificationService from '../services/notificationService.js';

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
  let isUpdated = false;

  if (!tylScores) {
    // Create new document if none exists
    tylScores = await TYLScores.create({
      userId,
      semesters: [{
        semester,
        scores
      }]
    });
    isUpdated = true;
  } else {
    // Update existing semester or add new one
    const semesterIndex = tylScores.semesters.findIndex(s => s.semester === semester);
    
    if (semesterIndex >= 0) {
      tylScores.semesters[semesterIndex].scores = scores;
    } else {
      tylScores.semesters.push({ semester, scores });
    }

    await tylScores.save();
    isUpdated = true;
  }

  // Send notification and email to student
  if (isUpdated && userId) {
    const emailHtml = `
      <h2>TYL Scorecard Updated</h2>
      <p>Your TYL (Technical Yearly Learning) scorecard has been updated.</p>
      <p><strong>Semester:</strong> ${semester}</p>
      <p>Log in to Sanghathi to view your updated scores.</p>
      <p><a href="https://sanghathi.com/student/tyl-scorecard">View TYL Scorecard</a></p>
    `;

    await notificationService.notifyUser(
      userId,
      "TYL Scorecard Updated",
      `Your TYL scorecard for Semester ${semester} has been updated`,
      "scorecard",
      "Your TYL Scorecard Has Been Updated - Sanghathi",
      `Your TYL (Technical Yearly Learning) scorecard for Semester ${semester} has been updated. Log in to Sanghathi to view your scores.`,
      emailHtml
    );
  }

  res.status(200).json({
    status: 'success',
    data: tylScores.semesters
  });
}); 

export const deleteTYLScores = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const result = await TYLScores.deleteMany({ userId });

  if (!result.deletedCount) {
    return next(new AppError('No TYL records found for this user', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'TYL scores deleted successfully',
    deletedCount: result.deletedCount,
  });
});