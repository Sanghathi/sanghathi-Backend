import LocalGuardian from '../../models/Student/LocalGuardian.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

export const createOrUpdateLocalGuardian = catchAsync(async (req, res, next) => {
  const { userId, ...guardianData } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const localGuardian = await LocalGuardian.findOneAndUpdate(
    { userId },
    guardianData,
    { 
      new: true,
      upsert: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: { localGuardian }
  });
});

export const getLocalGuardianByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const localGuardian = await LocalGuardian.findOne({ userId });

  if (!localGuardian) {
    return res.status(200).json({
      status: 'success',
      data: null
    });
  }

  res.status(200).json({
    status: 'success',
    data: { localGuardian }
  });
});

export const deleteLocalGuardianByUSN = catchAsync(async (req, res, next) => {
  const { usn } = req.params;

  const localGuardian = await LocalGuardian.findOneAndDelete({ usn });

  if (!localGuardian) {
    return next(new AppError('No local guardian data found with that USN', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});