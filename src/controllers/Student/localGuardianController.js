import { LocalGuardian } from "../../models/Student/LocalGuardian.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

// Create or update a local guardian profile
export const createOrUpdateLocalGuardian = catchAsync(async (req, res, next) => {
  const { userId, ...localGuardianData } = req.body;

  const existingLocalGuardian = await LocalGuardian.findOne({ userId });

  if (existingLocalGuardian) {
    Object.assign(existingLocalGuardian, localGuardianData);
    await existingLocalGuardian.save();
    return res.status(200).json({
      status: "success",
      data: { localGuardian: existingLocalGuardian },
    });
  } else {
    const localGuardian = await LocalGuardian.create({ userId, ...localGuardianData });
    res.status(201).json({
      status: "success",
      data: { localGuardian },
    });
  }
});

// Get local guardian by MongoDB ID
export const getLocalGuardianById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const localGuardian = await LocalGuardian.findById(id);

  if (!localGuardian) {
    return next(new AppError("Local Guardian not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { localGuardian },
  });
});

// Get local guardian by User ID (not Mongo ID)
export const getLocalGuardianByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const localGuardian = await LocalGuardian.findOne({ userId });

  if (!localGuardian) {
    return next(new AppError("Local Guardian not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { localGuardian },
  });
});

// Get all local guardians
export const getAllLocalGuardians = catchAsync(async (req, res, next) => {
  const localGuardians = await LocalGuardian.find();
  res.status(200).json({
    status: "success",
    results: localGuardians.length,
    data: { localGuardians },
  });
});

// Update local guardian by MongoDB ID
export const updateLocalGuardianById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  const updatedLocalGuardian = await LocalGuardian.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedLocalGuardian) {
    return next(new AppError("Local Guardian not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { localGuardian: updatedLocalGuardian },
  });
});

// Delete local guardian by MongoDB ID
export const deleteLocalGuardianById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedGuardian = await LocalGuardian.findByIdAndDelete(id);

  if (!deletedGuardian) {
    return next(new AppError("Local Guardian not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
