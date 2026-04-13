import Notification from "../models/Notification.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const getNotifications = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const filter = { userId: req.params.userId };
  if (req.query.unread === "true" || req.query.unread === "1") {
    filter.isUnread = true;
  }
  if (req.query.unread === "false" || req.query.unread === "0") {
    filter.isUnread = false;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

export const createNotification = catchAsync(async (req, res, next) => {
  const { userId, title, description, type } = req.body;
  const notification = await Notification.create({
    userId,
    title,
    description,
    type,
    isUnread: true,
  });
  if (!notification) {
    return next(AppError("Failed to create notification", 500));
  }
  res.status(201).json({ notification });
});
