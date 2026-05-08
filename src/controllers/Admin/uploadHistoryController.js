import mongoose from "mongoose";
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import AdminUploadSession from "../../models/AdminUploadSession.js";
import User from "../../models/User.js";
import StudentProfile from "../../models/Student/Profile.js";
import FacultyProfile from "../../models/Faculty/FacultyDetails.js";
import Attendance from "../../models/Student/Attendance.js";
import Iat from "../../models/Admin/IatMarks.js";
import External from "../../models/Admin/ExternalMarks.js";
import TYLScores from "../../models/TYLScores.js";
import MoocData from "../../models/CareerReview/Mooc.js";
import MiniProjectData from "../../models/CareerReview/MiniProject.js";
import { resolveCollegeCode } from "../../utils/tenantContext.js";

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

const getSessionEntries = (session) => (Array.isArray(session.metadata?.entries) ? session.metadata.entries : []);

const cloneValue = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
};

const normalizeSemester = (value) => {
  const semester = Number.parseInt(value, 10);
  return Number.isFinite(semester) && semester > 0 ? semester : null;
};

const resolveIatRestoreTargets = (session) => {
  const entries = Array.isArray(session.metadata?.entries) ? session.metadata.entries : [];
  const targetsByUser = new Map();

  for (const entry of entries) {
    const userId = entry?.userId ? String(entry.userId) : "";
    const semester = normalizeSemester(entry?.semester);

    if (!userId || !semester) {
      continue;
    }

    if (!targetsByUser.has(userId)) {
      targetsByUser.set(userId, new Set());
    }

    targetsByUser.get(userId).add(semester);
  }

  return targetsByUser;
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
    const [userDocs, profileDocs, facultyDocs] = await Promise.all([
      User.countDocuments({ _id: { $in: userIds } }),
      StudentProfile.countDocuments({ userId: { $in: userIds } }),
      FacultyProfile.countDocuments({ userId: { $in: userIds } }),
    ]);

    return {
      tabType: session.tabType,
      usersToDelete: userDocs,
      studentProfilesToDelete: profileDocs,
      facultyProfilesToDelete: facultyDocs,
      affectedUserIds: userIds,
    };
  }

  const model = getRestoreModelForTab(session.tabType);
  if (!model) {
    throw new AppError("Restore is not supported for this tab", 400);
  }

  const entries = getSessionEntries(session);

  if (["add-attendance", "add-iat-marks", "add-external-marks", "add-tyl-marks", "add-mooc-details", "add-mini-project-details"].includes(session.tabType)) {
    if (entries.length === 0) {
      throw new AppError("This upload session does not include restore metadata and cannot be restored safely.", 400);
    }

    if (session.tabType === "add-attendance") {
      const restoreTargets = entries
        .map((entry) => ({
          userId: entry?.userId ? String(entry.userId) : "",
          semester: normalizeSemester(entry?.semester),
          month: normalizeSemester(entry?.month),
        }))
        .filter((entry) => entry.userId && entry.semester && entry.month);

      return {
        tabType: session.tabType,
        usersToUpdate: new Set(restoreTargets.map((entry) => entry.userId)).size,
        monthsToRestore: restoreTargets.length,
        restoreTargets,
        affectedUserIds: userIds,
      };
    }

    if (["add-iat-marks", "add-external-marks", "add-tyl-marks"].includes(session.tabType)) {
      const restoreTargets = entries
        .map((entry) => ({
          userId: entry?.userId ? String(entry.userId) : "",
          semester: normalizeSemester(entry?.semester),
        }))
        .filter((entry) => entry.userId && entry.semester);

      return {
        tabType: session.tabType,
        usersToUpdate: new Set(restoreTargets.map((entry) => entry.userId)).size,
        semestersToRestore: restoreTargets.length,
        restoreTargets,
        affectedUserIds: userIds,
      };
    }

    if (session.tabType === "add-mooc-details") {
      const restoreTargets = entries
        .map((entry) => ({
          userId: entry?.userId ? String(entry.userId) : "",
          hasSnapshot: Object.prototype.hasOwnProperty.call(entry || {}, "previousMooc"),
        }))
        .filter((entry) => entry.userId && entry.hasSnapshot);

      return {
        tabType: session.tabType,
        usersToUpdate: restoreTargets.length,
        restoreTargets,
        affectedUserIds: userIds,
      };
    }

    if (session.tabType === "add-mini-project-details") {
      const restoreTargets = entries
        .map((entry) => ({
          userId: entry?.userId ? String(entry.userId) : "",
          hasSnapshot: Object.prototype.hasOwnProperty.call(entry || {}, "previousMiniProject"),
        }))
        .filter((entry) => entry.userId && entry.hasSnapshot);

      return {
        tabType: session.tabType,
        usersToUpdate: restoreTargets.length,
        restoreTargets,
        affectedUserIds: userIds,
      };
    }
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
    const [profilesResult, facultyResult, usersResult] = await Promise.all([
      StudentProfile.deleteMany({ userId: { $in: userIds } }),
      FacultyProfile.deleteMany({ userId: { $in: userIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);

    return {
      tabType: session.tabType,
      deletedUsers: usersResult.deletedCount || 0,
      deletedStudentProfiles: profilesResult.deletedCount || 0,
      deletedFacultyProfiles: facultyResult.deletedCount || 0,
    };
  }

  const entries = getSessionEntries(session);

  const restoreSemesterRecord = async ({ model, fieldName, userId, semester, snapshot }) => {
    const document = await model.findOne({ userId });

    if (!document) {
      if (snapshot !== undefined) {
        const createPayload = { userId };
        createPayload[fieldName] = snapshot === null ? [] : [cloneValue(snapshot)];
        await model.create(createPayload);
        return { updated: true, deleted: false };
      }

      return { updated: false, deleted: false };
    }

    const records = Array.isArray(document[fieldName]) ? [...document[fieldName]] : [];
    const recordIndex = records.findIndex((entry) => Number(entry.semester) === semester);

    if (snapshot === undefined) {
      return { updated: false, deleted: false };
    }

    if (snapshot === null) {
      if (recordIndex !== -1) {
        records.splice(recordIndex, 1);
      }
    } else if (recordIndex === -1) {
      records.push(cloneValue(snapshot));
    } else {
      records[recordIndex] = cloneValue(snapshot);
    }

    if (records.length === 0) {
      await model.deleteOne({ _id: document._id });
      return { updated: true, deleted: true };
    }

    document[fieldName] = records;
    await document.save();
    return { updated: true, deleted: false };
  };

  if (session.tabType === "add-attendance") {
    if (entries.length === 0) {
      throw new AppError("This upload session does not include restore metadata and cannot be restored safely.", 400);
    }

    let updatedCount = 0;
    let deletedDocuments = 0;

    for (const entry of entries) {
      const userId = entry?.userId ? String(entry.userId) : "";
      const semester = normalizeSemester(entry?.semester);
      const month = normalizeSemester(entry?.month);
      const previousMonth = Object.prototype.hasOwnProperty.call(entry || {}, "previousMonth") ? entry.previousMonth : undefined;

      if (!userId || !semester || !month) continue;

      const attendance = await Attendance.findOne({ userId });
      if (!attendance) continue;

      const semesterIndex = attendance.semesters.findIndex((item) => Number(item.semester) === semester);
      if (semesterIndex === -1) continue;

      const semesterDoc = attendance.semesters[semesterIndex];
      const monthIndex = semesterDoc.months.findIndex((item) => Number(item.month) === month);

      if (previousMonth === undefined) {
        continue;
      }

      if (previousMonth === null) {
        if (monthIndex !== -1) {
          semesterDoc.months.splice(monthIndex, 1);
        }
      } else if (monthIndex === -1) {
        semesterDoc.months.push(cloneValue(previousMonth));
      } else {
        semesterDoc.months[monthIndex] = cloneValue(previousMonth);
      }

      if (semesterDoc.months.length === 0) {
        attendance.semesters.splice(semesterIndex, 1);
      }

      if (attendance.semesters.length === 0) {
        await Attendance.deleteOne({ _id: attendance._id });
        deletedDocuments += 1;
      } else {
        await attendance.save();
      }

      updatedCount += 1;
    }

    return {
      tabType: session.tabType,
      updatedCount,
      deletedDocuments,
      restoreTargets: entries,
    };
  }

  if (["add-iat-marks", "add-external-marks", "add-tyl-marks"].includes(session.tabType)) {
    if (entries.length === 0) {
      throw new AppError("This upload session does not include restore metadata and cannot be restored safely.", 400);
    }

    const model = session.tabType === "add-iat-marks" ? Iat : session.tabType === "add-external-marks" ? External : TYLScores;
    const fieldName = "semesters";
    const snapshotField = session.tabType === "add-tyl-marks" ? "previousSemester" : "previousSemester";

    let updatedCount = 0;
    let deletedDocuments = 0;

    for (const entry of entries) {
      const userId = entry?.userId ? String(entry.userId) : "";
      const semester = normalizeSemester(entry?.semester);
      const snapshot = Object.prototype.hasOwnProperty.call(entry || {}, snapshotField) ? entry[snapshotField] : undefined;

      if (!userId || !semester) continue;

      const result = await restoreSemesterRecord({ model, fieldName, userId, semester, snapshot });
      if (result.updated) {
        updatedCount += 1;
      }
      if (result.deleted) {
        deletedDocuments += 1;
      }
    }

    return {
      tabType: session.tabType,
      updatedCount,
      deletedDocuments,
      restoreTargets: entries,
    };
  }

  if (["add-mooc-details", "add-mini-project-details"].includes(session.tabType)) {
    if (entries.length === 0) {
      throw new AppError("This upload session does not include restore metadata and cannot be restored safely.", 400);
    }

    const model = session.tabType === "add-mooc-details" ? MoocData : MiniProjectData;
    const fieldName = session.tabType === "add-mooc-details" ? "mooc" : "miniproject";

    let updatedCount = 0;
    let deletedDocuments = 0;

    for (const entry of entries) {
      const userId = entry?.userId ? String(entry.userId) : "";
      const snapshotField = session.tabType === "add-mooc-details" ? "previousMooc" : "previousMiniProject";
      const snapshot = Object.prototype.hasOwnProperty.call(entry || {}, snapshotField) ? entry[snapshotField] : undefined;

      if (!userId || snapshot === undefined) continue;

      if (snapshot === null) {
        const result = await model.deleteOne({ userId });
        deletedDocuments += result.deletedCount || 0;
        updatedCount += 1;
        continue;
      }

      await model.findOneAndUpdate(
        { userId },
        { [fieldName]: cloneValue(snapshot) },
        { new: true, upsert: true }
      );
      updatedCount += 1;
    }

    return {
      tabType: session.tabType,
      updatedCount,
      deletedDocuments,
      restoreTargets: entries,
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
    deletedUsers: userIds.length,
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

  const collegeCode = resolveCollegeCode({ body: req.body, user: req.user });
  let scopedDept = null;
  try {
    const { resolveScopedDepartment } = await import("../../utils/tenantContext.js");
    scopedDept = await resolveScopedDepartment(req);
  } catch (err) {
    scopedDept = null;
  }

  const enrichedMetadata = {
    ...(metadata && typeof metadata === "object" ? metadata : {}),
    collegeCode,
    department: (metadata && metadata.department) || scopedDept || null,
  };

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
    metadata: enrichedMetadata,
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

  // Apply college + department scoping to upload sessions
  try {
    const { getScopedCollegeCode, resolveScopedDepartment, getCollegeScopeFilter } = await import("../../utils/tenantContext.js");
    const collegeCode = getScopedCollegeCode(req);
    const scopedDept = await resolveScopedDepartment(req);

    if (collegeCode) {
      const collegeScope = getCollegeScopeFilter(collegeCode);
      // translate college scope to metadata.collegeCode presence
      const collegeMetaScope = {
        $or: [
          { "metadata.collegeCode": collegeCode },
          { "metadata.collegeCode": { $exists: false } },
          { "metadata.collegeCode": null },
        ],
      };

      filter.$and = filter.$and || [];
      filter.$and.push(collegeMetaScope);
    }

    if (scopedDept) {
      const deptRegex = { $regex: `^${scopedDept}$`, $options: "i" };
      // Show sessions that target this department OR sessions created by the current user
      const deptFilter = {
        $or: [{ "metadata.department": deptRegex }, { adminUserId: req.user._id }],
      };

      filter.$and = filter.$and || [];
      filter.$and.push(deptFilter);
    }
  } catch (err) {
    // ignore scoping errors
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
  // Enforce department scoping: department-scoped admins can only view sessions for their department
  try {
    const { resolveScopedDepartment } = await import("../../utils/tenantContext.js");
    const scopedDept = await resolveScopedDepartment(req);
    if (scopedDept) {
      const metaDept = session.metadata?.department || null;
      if (!metaDept || metaDept.toString().trim().toLowerCase() !== scopedDept.toString().trim().toLowerCase()) {
        // allow if this user created the session
        if (!session.adminUserId || session.adminUserId.toString() !== req.user._id.toString()) {
          throw new AppError("Access denied for this upload session", 403);
        }
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
  }

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

  // Enforce department scoping for preview
  try {
    const { resolveScopedDepartment } = await import("../../utils/tenantContext.js");
    const scopedDept = await resolveScopedDepartment(req);
    if (scopedDept) {
      const metaDept = session.metadata?.department || null;
      if (!metaDept || metaDept.toString().trim().toLowerCase() !== scopedDept.toString().trim().toLowerCase()) {
        if (!session.adminUserId || session.adminUserId.toString() !== req.user._id.toString()) {
          return next(new AppError("Access denied for this upload session", 403));
        }
      }
    }
  } catch (err) {
    // ignore
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

  // Enforce department scoping for restore
  try {
    const { resolveScopedDepartment } = await import("../../utils/tenantContext.js");
    const scopedDept = await resolveScopedDepartment(req);
    if (scopedDept) {
      const metaDept = session.metadata?.department || null;
      if (!metaDept || metaDept.toString().trim().toLowerCase() !== scopedDept.toString().trim().toLowerCase()) {
        if (!session.adminUserId || session.adminUserId.toString() !== req.user._id.toString()) {
          return next(new AppError("Access denied for this upload session", 403));
        }
      }
    }
  } catch (err) {
    // ignore
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