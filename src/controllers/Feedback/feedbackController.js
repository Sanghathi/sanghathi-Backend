import Feedback from "../../models/Feedback/Feedback.js";
import FeedbackWindow from "../../models/Feedback/FeedbackWindow.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

const WINDOW_KEY = "global";

const FEEDBACK_POPULATE = {
  path: "userId",
  select: "name email collegeCode roleName department",
};

const ensureFeedbackWindow = async () => {
  return FeedbackWindow.findOneAndUpdate(
    { key: WINDOW_KEY },
    {
      $setOnInsert: {
        key: WINDOW_KEY,
        isEnabled: false,
        semester: "",
        feedbackRound: 1,
      },
    },
    { new: true, upsert: true }
  );
};

const normalizeRound = (value) => {
  const numericValue = Number(value);
  return [1, 2].includes(numericValue) ? numericValue : null;
};

const buildFeedbackFilter = ({ userId, semester, feedbackRound }) => {
  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  if (semester) {
    filter.semester = semester;
  }

  const normalizedRound = normalizeRound(feedbackRound);
  if (normalizedRound) {
    filter.feedbackRound = normalizedRound;
  }

  return filter;
};

const serializeFeedbackWindow = (windowDoc) => {
  if (!windowDoc) {
    return null;
  }

  return {
    _id: windowDoc._id,
    key: windowDoc.key,
    isEnabled: windowDoc.isEnabled,
    semester: windowDoc.semester,
    feedbackRound: windowDoc.feedbackRound,
    label: `Feedback ${windowDoc.feedbackRound || 1}`,
    updatedBy: windowDoc.updatedBy,
    createdAt: windowDoc.createdAt,
    updatedAt: windowDoc.updatedAt,
  };
};

export const getFeedbackWindow = catchAsync(async (_req, res) => {
  const windowDoc = await ensureFeedbackWindow();

  res.status(200).json({
    status: "success",
    data: {
      window: serializeFeedbackWindow(windowDoc),
    },
  });
});

export const updateFeedbackWindow = catchAsync(async (req, res, next) => {
  const { isEnabled, semester, feedbackRound } = req.body;
  const windowDoc = await ensureFeedbackWindow();

  if (typeof isEnabled === "boolean") {
    windowDoc.isEnabled = isEnabled;
  }

  if (semester !== undefined) {
    windowDoc.semester = String(semester).trim();
  }

  if (feedbackRound !== undefined) {
    const normalizedRound = normalizeRound(feedbackRound);
    if (!normalizedRound) {
      return next(new AppError("feedbackRound must be 1 or 2", 400));
    }
    windowDoc.feedbackRound = normalizedRound;
  }

  if (windowDoc.isEnabled && !windowDoc.semester) {
    return next(new AppError("semester is required to enable feedback", 400));
  }

  windowDoc.updatedBy = req.user._id;
  await windowDoc.save();

  res.status(200).json({
    status: "success",
    data: {
      window: serializeFeedbackWindow(windowDoc),
    },
  });
});

export const createOrUpdateFeedback = catchAsync(async (req, res, next) => {
  const { userId, issues, features, performance, feedback } = req.body;

  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  const activeWindow = await ensureFeedbackWindow();
  if (!activeWindow.isEnabled) {
    return next(new AppError("Feedback is currently disabled", 403));
  }

  if (!activeWindow.semester) {
    return next(new AppError("Feedback semester is not configured", 400));
  }

  const feedbackRound = normalizeRound(activeWindow.feedbackRound);
  if (!feedbackRound) {
    return next(new AppError("Feedback round is not configured", 400));
  }

  const updatedDoc = await Feedback.findOneAndUpdate(
    {
      userId,
      semester: activeWindow.semester,
      feedbackRound,
    },
    {
      $set: {
        userId,
        semester: activeWindow.semester,
        feedbackRound,
        issues,
        features,
        performance,
        feedback,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate(FEEDBACK_POPULATE);

  res.status(200).json({
    status: "success",
    data: {
      feedback: updatedDoc,
      window: serializeFeedbackWindow(activeWindow),
    },
  });
});

export const getFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { semester, feedbackRound } = req.query;

  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const activeWindow = await ensureFeedbackWindow();
  const feedbackDoc = await Feedback.findOne(
    buildFeedbackFilter({
      userId,
      semester: semester || activeWindow.semester,
      feedbackRound: feedbackRound || activeWindow.feedbackRound,
    })
  )
    .sort({ createdAt: -1 })
    .populate(FEEDBACK_POPULATE);

  if (!feedbackDoc) {
    return next(new AppError("Feedback details not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      feedback: feedbackDoc,
      window: serializeFeedbackWindow(activeWindow),
    },
  });
});

export const getFeedbackOverview = catchAsync(async (req, res) => {
  const activeWindow = await ensureFeedbackWindow();
  const { semester, feedbackRound, userId } = req.query;
  const feedbackFilter = buildFeedbackFilter({
    semester: semester || activeWindow.semester,
    feedbackRound: feedbackRound || activeWindow.feedbackRound,
    userId,
  });

  const [feedbacks, totalCount, roundCounts, semesterCounts] = await Promise.all([
    Feedback.find(feedbackFilter)
      .sort({ createdAt: -1 })
      .populate(FEEDBACK_POPULATE)
      .lean(),
    Feedback.countDocuments(feedbackFilter),
    Feedback.aggregate([
      { $match: feedbackFilter },
      { $group: { _id: "$feedbackRound", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Feedback.aggregate([
      { $match: feedbackFilter },
      { $group: { _id: "$semester", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      window: serializeFeedbackWindow(activeWindow),
      summary: {
        totalCount,
        roundCounts,
        semesterCounts,
      },
      feedbacks,
    },
  });
});

export const deleteFeedbackByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { semester, feedbackRound } = req.query;

  if (!userId) {
    return next(new AppError("userId param is required", 400));
  }

  const deletedDoc = await Feedback.findOneAndDelete(
    buildFeedbackFilter({ userId, semester, feedbackRound })
  );

  if (!deletedDoc) {
    return next(new AppError("Feedback details not found for deletion", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
