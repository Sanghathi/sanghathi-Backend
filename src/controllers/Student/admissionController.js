import Admission from "../../models/Student/Admissions.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
// Create a new admission record
export const createAdmission = catchAsync(async (req, res, next) => {
  // Validate the incoming data (you can add more validations here)
  const admissionData = req.body;

  // Create a new admission record
  const admission = await Admission.create(admissionData);

  // Respond with the created admission record
  res.status(201).json({
    status: "success",
    data: {
      admission,
    },
  });
});

// Get admission details by ID
export const getAdmissionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find admission by ID
  const admission = await Admission.findById(id);

  // If admission not found, throw an error
  if (!admission) {
    return next(new AppError("Admission not found", 404));
  }

  // Respond with the found admission record
  res.status(200).json({
    status: "success",
    data: {
      admission,
    },
  });
});

// Get all admissions
export const getAllAdmissions = catchAsync(async (req, res, next) => {
  // Retrieve all admissions from the database
  const admissions = await Admission.find();

  // Respond with the list of admissions
  res.status(200).json({
    status: "success",
    results: admissions.length, // Include count of admissions
    data: {
      admissions,
    },
  });
});

// Update admission details by ID
export const updateAdmissionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find admission by ID and update it
  const updatedAdmission = await Admission.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  // If updated admission not found, throw an error
  if (!updatedAdmission) {
    return next(new AppError("Admission not found", 404));
  }

  // Respond with the updated admission record
  res.status(200).json({
    status: "success",
    data: {
      admission: updatedAdmission,
    },
  });
});

// Delete admission record by ID
export const deleteAdmissionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find admission by ID and delete it
  const deletedAdmission = await Admission.findByIdAndDelete(id);

  // If deleted admission not found, throw an error
  if (!deletedAdmission) {
    return next(new AppError("Admission not found", 404));
  }

  // Respond with no content status
  res.status(204).json({
    status: "success",
    data: null,
  });
});
