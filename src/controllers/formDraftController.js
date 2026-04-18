import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import FormDraft from "../models/FormDraft.js";
import FormVersion from "../models/FormVersion.js";

const normalizeScopeId = (scopeId) =>
  scopeId && String(scopeId).trim() ? String(scopeId).trim() : "default";

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getLatestVersionNumber = async ({ userId, formType, scopeId }) => {
  const latest = await FormVersion.findOne({ userId, formType, scopeId })
    .sort({ version: -1 })
    .select("version")
    .lean();

  return latest?.version || 0;
};

export const getDraft = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const formType = req.params.formType;
  const scopeId = normalizeScopeId(req.query.scopeId);

  const draft = await FormDraft.findOne({ userId, formType, scopeId });

  res.status(200).json({
    status: "success",
    data: {
      draft,
    },
  });
});

export const saveDraft = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const formType = req.params.formType;
  const {
    scopeId: rawScopeId,
    draftData,
    version,
    checksum = "",
    isDirty = true,
  } = req.body || {};

  if (draftData === undefined) {
    return next(new AppError("draftData is required", 400));
  }

  const scopeId = normalizeScopeId(rawScopeId);
  const fallbackVersion = 1;
  const normalizedVersion = parsePositiveInteger(version) || fallbackVersion;

  const draft = await FormDraft.findOneAndUpdate(
    { userId, formType, scopeId },
    {
      $set: {
        draftData,
        version: normalizedVersion,
        checksum,
        isDirty: typeof isDirty === "boolean" ? isDirty : true,
      },
      $setOnInsert: {
        userId,
        formType,
        scopeId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      draft,
    },
  });
});

export const createVersion = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const formType = req.params.formType;
  const {
    scopeId: rawScopeId,
    snapshot,
    changedFields = [],
    reason = "manual-save",
  } = req.body || {};

  if (snapshot === undefined) {
    return next(new AppError("snapshot is required", 400));
  }

  const scopeId = normalizeScopeId(rawScopeId);
  const nextVersion =
    (await getLatestVersionNumber({ userId, formType, scopeId })) + 1;

  const versionDoc = await FormVersion.create({
    userId,
    formType,
    scopeId,
    version: nextVersion,
    snapshot,
    changedFields,
    reason,
  });

  await FormDraft.findOneAndUpdate(
    { userId, formType, scopeId },
    {
      $set: {
        draftData: snapshot,
        version: nextVersion,
        isDirty: false,
      },
      $setOnInsert: {
        userId,
        formType,
        scopeId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  res.status(201).json({
    status: "success",
    data: {
      version: versionDoc,
    },
  });
});

export const listVersions = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const formType = req.params.formType;
  const scopeId = normalizeScopeId(req.query.scopeId);
  const requestedLimit = parsePositiveInteger(req.query.limit);
  const limit = requestedLimit ? Math.min(requestedLimit, 100) : 20;

  const versions = await FormVersion.find({ userId, formType, scopeId })
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json({
    status: "success",
    results: versions.length,
    data: {
      versions,
    },
  });
});

export const restoreVersion = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const formType = req.params.formType;
  const scopeId = normalizeScopeId(req.body?.scopeId || req.query.scopeId);
  const targetVersion = parsePositiveInteger(req.params.version);

  if (!targetVersion) {
    return next(new AppError("Version must be a positive integer", 400));
  }

  const target = await FormVersion.findOne({
    userId,
    formType,
    scopeId,
    version: targetVersion,
  });

  if (!target) {
    return next(new AppError("Requested version not found", 404));
  }

  const nextVersion =
    (await getLatestVersionNumber({ userId, formType, scopeId })) + 1;

  const restoredVersion = await FormVersion.create({
    userId,
    formType,
    scopeId,
    version: nextVersion,
    snapshot: target.snapshot,
    changedFields: [`restored-from-v${targetVersion}`],
    reason: "restore",
  });

  const draft = await FormDraft.findOneAndUpdate(
    { userId, formType, scopeId },
    {
      $set: {
        draftData: target.snapshot,
        version: nextVersion,
        isDirty: false,
      },
      $setOnInsert: {
        userId,
        formType,
        scopeId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      restoredFromVersion: targetVersion,
      restoredVersion,
      draft,
    },
  });
});
