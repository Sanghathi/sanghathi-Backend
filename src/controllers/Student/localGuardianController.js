import LocalGuardian from '../../models/Student/LocalGuardian.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';
import LocalGuardian from '../../models/Student/LocalGuardian.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

export const createOrUpdateLocalGuardian = catchAsync(async (req, res, next) => {
  const { userId, ...guardianData } = req.body;
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
    return res.status(200).json({
      status: 'success',
      data: null
    });
  }

  res.status(200).json({
    status: 'success',
    data: { localGuardian }
    status: 'success',
    data: { localGuardian }
  });
});