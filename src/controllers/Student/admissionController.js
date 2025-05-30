import AdmissionDetails from '../../models/Student/Admissions.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

export const createOrUpdateAdmissionDetails = catchAsync(async (req, res, next) => {
  const { userId, ...admissionData } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  // Clean up empty enum fields
  if (admissionData.admissionType === '') delete admissionData.admissionType;
  if (admissionData.semester === '') delete admissionData.semester;

  // Remove empty strings from documentsSubmitted array
  if (Array.isArray(admissionData.documentsSubmitted)) {
    admissionData.documentsSubmitted = admissionData.documentsSubmitted.filter(doc => doc && doc.trim());
  }

  const admissionDetails = await AdmissionDetails.findOneAndUpdate(
    { userId },
    admissionData,
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: { admissionDetails }
  });
});

export const getAdmissionDetailsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const admissionDetails = await AdmissionDetails.findOne({ userId });

  if (!admissionDetails) {
    return next(new AppError('Admission details not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { admissionDetails }
  });
});

export const getAllAdmissionDetails = catchAsync(async (req, res) => {
  const admissionDetails = await AdmissionDetails.find().populate('userId');
  res.status(200).json({
    status: 'success',
    data: admissionDetails
  });
});
