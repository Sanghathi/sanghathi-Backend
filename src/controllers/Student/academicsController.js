import AcademicDetails from '../../models/Student/Academic.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

import logger from "../../utils/logger.js";
export const createOrUpdateAcademicDetails = catchAsync(async (req, res, next) => {
  const { userId, sslc, puc, localEntry } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const academicDetails = await AcademicDetails.findOneAndUpdate(
    { userId },
    { sslc, puc, localEntry },
    { 
      new: true, 
      upsert: true,
      runValidators: true 
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      academicDetails
    }
  });
});

export const getAcademicDetailsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  logger.info(`Fetching academic details for user: ${userId}`); // Debug log

  const academicDetails = await AcademicDetails.findOne({ userId });

  if (!academicDetails) {
    logger.info('No academic details found'); // Debug log
    return next(new AppError('Academic details not found', 404));
  }

  logger.info('Academic details found:', academicDetails); // Debug log

  res.status(200).json({
    status: 'success',
    data: {
      academicDetails
    }
  });
});
