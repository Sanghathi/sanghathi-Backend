import Notification from "../models/Notification.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const getNotifications = catchAsync(async (req, res, next) => {
  const filter = { userId: req.params.userId };
  if (req.query.unread) {
    filter.isUnread = true;
  }
  const notifications = await Notification.find(filter);
  res.status(200).json({ notifications });
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
