import mongoose from "mongoose";
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import AdminUploadSession from "../../models/AdminUploadSession.js";
import User from "../../models/User.js";
import StudentProfile from "../../models/Student/Profile.js";
import Attendance from "../../models/Student/Attendance.js";
import Iat from "../../models/Admin/IatMarks.js";
import External from "../../models/Admin/ExternalMarks.js";
import TYLScores from "../../models/TYLScores.js";
import MoocData from "../../models/CareerReview/Mooc.js";
import MiniProjectData from "../../models/CareerReview/MiniProject.js";

const VALID_TAB_TYPES = new Set([
  "add-users",
  "add-attendance",
  "add-iat-marks",
  "add-external-marks",
  "add-tyl-marks",
  "add-mooc-details",
  "add-mini-project-details",
]);

const VALID_SOURCES = new Set(["dashboard-ui", "local-script", "api"]);

const toObjectIdList = (values = []) => {
  const seen = new Set();
  const objectIds = [];

  for (const value of values) {
    if (!value) continue;
    const asString = String(value);
    if (!mongoose.Types.ObjectId.isValid(asString) || seen.has(asString)) {
      continue;
    }
    seen.add(asString);
    objectIds.push(new mongoose.Types.ObjectId(asString));
  }

  return objectIds;
};

const inferStatus = ({ requestedStatus, totalRows, successCount, errorCount }) => {
  if (requestedStatus && ["success", "partial", "failed"].includes(requestedStatus)) {
    return requestedStatus;
  }

  if ((successCount || 0) === 0 && (errorCount || 0) > 0) {
    return "failed";
  }

  if ((successCount || 0) > 0 && (errorCount || 0) > 0) {
    return "partial";
  }

  if ((totalRows || 0) > 0 && (successCount || 0) === 0 && (errorCount || 0) === 0) {
    return "failed";
  }

  return "success";
};

const ensureSession = async (sessionId) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("Invalid upload session id", 400);
  }

  const session = await AdminUploadSession.findById(sessionId);
  if (!session) {
    throw new AppError("Upload session not found", 404);
  }

  return session;
};

const resolveUserIdsForSession = (session) => {
  if (session.tabType === "add-users") {
    return toObjectIdList(session.createdUserIds);
  }

  return toObjectIdList(session.affectedUserIds);
};

const getRestoreModelForTab = (tabType) => {
  switch (tabType) {
    case "add-attendance":
      return Attendance;
    case "add-iat-marks":
      return Iat;
    case "add-external-marks":
      return External;
    case "add-tyl-marks":
      return TYLScores;
    case "add-mooc-details":
      return MoocData;
    case "add-mini-project-details":
      return MiniProjectData;
    default:
      return null;
  }
};

const buildPreview = async (session) => {
  const userIds = resolveUserIdsForSession(session);

  if (session.tabType === "add-users") {
    const [userDocs, profileDocs] = await Promise.all([
      User.countDocuments({ _id: { $in: userIds } }),
      StudentProfile.countDocuments({ userId: { $in: userIds } }),
    ]);

    return {
      tabType: session.tabType,
      usersToDelete: userDocs,
      studentProfilesToDelete: profileDocs,
      affectedUserIds: userIds,
    };
  }

  const model = getRestoreModelForTab(session.tabType);
  if (!model) {
    throw new AppError("Restore is not supported for this tab", 400);
  }

  const documentsToDelete = await model.countDocuments({ userId: { $in: userIds } });

  return {
    tabType: session.tabType,
    documentsToDelete,
    affectedUserIds: userIds,
  };
};

const executeRestore = async (session) => {
  const userIds = resolveUserIdsForSession(session);

  if (!userIds.length) {
    return {
      tabType: session.tabType,
      deletedDocuments: 0,
      deletedUsers: 0,
      deletedStudentProfiles: 0,
      message: "No tracked user IDs were found for this upload session.",
    };
  }

  if (session.tabType === "add-users") {
    const [profilesResult, usersResult] = await Promise.all([
      StudentProfile.deleteMany({ userId: { $in: userIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);

    return {
      tabType: session.tabType,
      deletedUsers: usersResult.deletedCount || 0,
      deletedStudentProfiles: profilesResult.deletedCount || 0,
    };
  }

  const model = getRestoreModelForTab(session.tabType);
  if (!model) {
    throw new AppError("Restore is not supported for this tab", 400);
  }

  const result = await model.deleteMany({ userId: { $in: userIds } });

  return {
    tabType: session.tabType,
    deletedDocuments: result.deletedCount || 0,
  };
};

export const createUploadSession = catchAsync(async (req, res, next) => {
  const {
    source,
    tabType,
    fileName = "",
    status,
    totalRows = 0,
    successCount = 0,
    errorCount = 0,
    errors = [],
    affectedUserIds = [],
    createdUserIds = [],
    metadata = {},
  } = req.body || {};

  if (!tabType || !VALID_TAB_TYPES.has(tabType)) {
    return next(new AppError("Invalid tabType for upload session", 400));
  }

  const session = await AdminUploadSession.create({
    adminUserId: req.user._id,
    source: VALID_SOURCES.has(source) ? source : "dashboard-ui",
    tabType,
    fileName,
    totalRows: Number(totalRows) || 0,
    successCount: Number(successCount) || 0,
    errorCount: Number(errorCount) || 0,
    status: inferStatus({
      requestedStatus: status,
      totalRows: Number(totalRows) || 0,
      successCount: Number(successCount) || 0,
      errorCount: Number(errorCount) || 0,
    }),
    errors: Array.isArray(errors) ? errors.slice(0, 200) : [],
    affectedUserIds: toObjectIdList(affectedUserIds),
    createdUserIds: toObjectIdList(createdUserIds),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  });

  res.status(201).json({
    status: "success",
    data: {
      session,
    },
  });
});

export const listUploadSessions = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.tabType && VALID_TAB_TYPES.has(req.query.tabType)) {
    filter.tabType = req.query.tabType;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.source && VALID_SOURCES.has(req.query.source)) {
    filter.source = req.query.source;
  }

  const [sessions, total] = await Promise.all([
    AdminUploadSession.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "adminUserId", select: "name email roleName" })
      .populate({ path: "restoredBy", select: "name email roleName" })
      .lean(),
    AdminUploadSession.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: sessions.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      sessions,
    },
  });
});

export const getUploadSessionById = catchAsync(async (req, res) => {
  const session = await ensureSession(req.params.sessionId);

  res.status(200).json({
    status: "success",
    data: {
      session,
    },
  });
});

export const previewUploadRestore = catchAsync(async (req, res, next) => {
  const session = await ensureSession(req.params.sessionId);

  if (session.restored) {
    return next(new AppError("This upload session has already been restored", 400));
  }

  const preview = await buildPreview(session);

  res.status(200).json({
    status: "success",
    data: {
      preview,
    },
  });
});

export const restoreUploadSession = catchAsync(async (req, res, next) => {
  const session = await ensureSession(req.params.sessionId);

  if (session.restored) {
    return next(new AppError("This upload session has already been restored", 400));
  }

  const restoreSummary = await executeRestore(session);

  session.restored = true;
  session.status = "restored";
  session.restoredAt = new Date();
  session.restoredBy = req.user._id;
  session.restoreSummary = restoreSummary;
  await session.save();

  res.status(200).json({
    status: "success",
    message: "Upload restore completed successfully",
    data: {
      session,
      restoreSummary,
    },
  });
});