import Department from "../models/Department.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { resolveCollegeCode, normalizeCollegeCode } from "../utils/tenantContext.js";

export const getDepartments = catchAsync(async (req, res, next) => {
  const collegeCode = resolveCollegeCode({ query: req.query, user: req.user });
  if (!collegeCode) {
    return next(new AppError("College code is required", 400));
  }

  const filter = { collegeCode };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const departments = await Department.find(filter)
    .sort({ name: 1, code: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: departments.length,
    data: {
      departments,
    },
  });
});

export const getDepartmentByCode = catchAsync(async (req, res, next) => {
  const collegeCode = resolveCollegeCode({ query: req.query, user: req.user });
  const code = normalizeCollegeCode(req.params.code);

  if (!collegeCode) {
    return next(new AppError("College code is required", 400));
  }

  if (!code) {
    return next(new AppError("Department code is required", 400));
  }

  const department = await Department.findOne({ collegeCode, code }).lean();
  if (!department) {
    return next(new AppError("Department not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      department,
    },
  });
});
