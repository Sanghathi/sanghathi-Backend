import AdmissionDetails from '../../models/Student/Admissions.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';
import {
  getScopedCollegeCode,
  mergeCollegeScope,
  resolveCollegeCode,
} from '../../utils/tenantContext.js';

export const createOrUpdateAdmissionDetails = catchAsync(async (req, res, next) => {
  const { userId, ...admissionData } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const resolvedCollegeCode = resolveCollegeCode({
    body: req.body,
    user: req.user,
  });

  const admissionPayload = {
    ...admissionData,
    collegeCode: resolvedCollegeCode,
  };

  try {
    const admissionDetails = await AdmissionDetails.findOneAndUpdate(
      { userId },
      admissionPayload,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { admissionDetails }
    });
  } catch (err) {
    // Handle duplicate key errors (e.g., unique index on usn)
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
      return next(new AppError(`Duplicate field value: ${field}. Please use another value.`, 400));
    }
    throw err;
  }
});

export const getAdmissionDetailsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const collegeCode = getScopedCollegeCode(req);
  const filter = mergeCollegeScope({ userId }, collegeCode);
  const admissionDetails = await AdmissionDetails.findOne(filter);

  // Missing admission details are expected for first-time users.
  if (!admissionDetails) {
    return res.status(200).json({
      status: 'success',
      data: { admissionDetails: null }
    });
  }

  res.status(200).json({
    status: 'success',
    data: { admissionDetails }
  });
});

export const getAllAdmissionDetails = catchAsync(async (req, res) => {
  const collegeCode = getScopedCollegeCode(req);
  const filter = mergeCollegeScope({}, collegeCode);
  const admissionDetails = await AdmissionDetails.find(filter).populate('userId');
  res.status(200).json({
    status: 'success',
    data: admissionDetails
  });
});
