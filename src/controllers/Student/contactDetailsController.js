import ContactDetails from '../../models/Student/contactDetails.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

// Changed to singular form to match route import
export const createOrUpdateContactDetail = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  const { currentAddress, permanentAddress } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const contactDetails = await ContactDetails.findOneAndUpdate(
    { userId },
    { currentAddress, permanentAddress },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: { contactDetails }
  });
});

// Changed name to match previous route implementation
export const getContactDetails = catchAsync(async (req, res) => {
  const contactDetails = await ContactDetails.find();
  res.status(200).json({
    status: 'success',
    data: contactDetails
  });
});

// Keep this as separate function for single user lookup
export const getContactDetailsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const contactDetails = await ContactDetails.findOne({ userId });

  if (!contactDetails) {
    return next(new AppError('Contact details not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { contactDetails }
  });
});
