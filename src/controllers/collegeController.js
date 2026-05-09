import College from "../models/College.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { normalizeCollegeCode } from "../utils/tenantContext.js";

export const getColleges = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const colleges = await College.find(filter)
    .sort({ name: 1, code: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: colleges.length,
    data: {
      colleges,
    },
  });
});

export const getCollegeByCode = catchAsync(async (req, res, next) => {
  const code = normalizeCollegeCode(req.params.code);
  if (!code) {
    return next(new AppError("College code is required", 400));
  }

  const college = await College.findOne({ code }).lean();
  if (!college) {
    return next(new AppError("College not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      college,
    },
  });
});
