// import { LocalGuardian } from "../../models/Student/LocalGuardian.js";
// import catchAsync from "../../utils/catchAsync.js";
// import AppError from "../../utils/appError.js";

// // Create a new local guardian profile
// export const createLocalGuardian = catchAsync(async (req, res, next) => {
//   const localGuardianData = req.body;

//   const localGuardian = await LocalGuardian.create(localGuardianData);
  
//   res.status(201).json({
//     status: "success",
//     data: {
//       localGuardian,
//     },
//   });
// });

// // Get local guardian by ID
// export const getLocalGuardianById = catchAsync(async (req, res, next) => {
//   const { id } = req.params;

//   const localGuardian = await LocalGuardian.findById(id);

//   if (!localGuardian) {
//     return next(new AppError("Local Guardian not found", 404));
//   }

//   res.status(200).json({
//     status: "success",
//     data: {
//       localGuardian,
//     },
//   });
// });

// // Get all local guardians
// export const getAllLocalGuardians = catchAsync(async (req, res, next) => {
//   const localGuardians = await LocalGuardian.find();

//   res.status(200).json({
//     status: "success",
//     data: {
//       localGuardians,
//     },
//   });
// });

// // Update local guardian by ID
// export const updateLocalGuardianById = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const updateData = req.body;

//   const updatedLocalGuardian = await LocalGuardian.findByIdAndUpdate(id, updateData, {
//     new: true,
//     runValidators: true,
//   });

//   if (!updatedLocalGuardian) {
//     return next(new AppError("Local Guardian not found", 404));
//   }

//   res.status(200).json({
//     status: "success",
//     data: {
//       localGuardian: updatedLocalGuardian,
//     },
//   });
// });

// // Delete local guardian by ID
// export const deleteLocalGuardianById = catchAsync(async (req, res, next) => {
//   const { id } = req.params;

//   const deletedLocalGuardian = await LocalGuardian.findByIdAndDelete(id);

//   if (!deletedLocalGuardian) {
//     return next(new AppError("Local Guardian not found", 404));
//   }

//   res.status(204).json({
//     status: "success",
//     data: null,
//   });
// });

import { LocalGuardian } from "../../models/Student/LocalGuardian.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";

// Create or update a local guardian profile
export const createOrUpdateLocalGuardian = catchAsync(async (req, res, next) => {
  const { userId, ...localGuardianData } = req.body; // Extract userId from request body

  // Check if a Local Guardian profile already exists for the userId
  const existingLocalGuardian = await LocalGuardian.findOne({ userId });

  if (existingLocalGuardian) {
    // If a profile exists, update it
    Object.assign(existingLocalGuardian, localGuardianData); // Update existing profile with new data
    await existingLocalGuardian.save(); // Save updated profile
    return res.status(200).json({
      status: "success",
      data: {
        localGuardian: existingLocalGuardian,
      },
    });
  } else {
    // If no profile exists, create a new one
    const localGuardian = await LocalGuardian.create({ userId, ...localGuardianData });

    res.status(201).json({
      status: "success",
      data: {
        localGuardian,
      },
    });
  }
});

// Get local guardian by ID
export const getLocalGuardianById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const localGuardian = await LocalGuardian.findById(id);

  if (!localGuardian) {
    return next(new AppError("Local Guardian not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      localGuardian,
    },
  });
});

// Get all local guardians
export const getAllLocalGuardians = catchAsync(async (req, res, next) => {
  const localGuardians = await LocalGuardian.find();

  res.status(200).json({
    status: "success",
    data: {
      localGuardians,
    },
  });
});

// Update local guardian by ID
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
    data: {
      localGuardian: updatedLocalGuardian,
    },
  });
});

// Delete local guardian by ID
export const deleteLocalGuardianById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedLocalGuardian = await LocalGuardian.findByIdAndDelete(id);

  if (!deletedLocalGuardian) {
    return next(new AppError("Local Guardian not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
