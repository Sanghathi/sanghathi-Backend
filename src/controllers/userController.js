import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js"; // Ensure you have a logger setup

// Get all users with optional role filtering
export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role } = req.query;
  let filter = {};

  // If a role is provided in the query, filter by role
  if (role) {
    const roleDoc = await Role.findOne({ name: role });

    // If no valid role is found, throw an error
    if (!roleDoc) {
      return next(new AppError("Invalid role", 400));
    }

    // Update filter to match the role ID
    filter.role = roleDoc._id;
  }

  // Get all users based on the filter (if any)
  const users = await User.find(filter).populate("role");

  if (users.length === 0) {
    return res.status(200).json({
      status: "success",
      results: 0,
      data: {
        users: [],
      },
    });
  }

  return res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

// Get user by ID (not yet implemented, could return an error or be defined later)
export function getUser(req, res) {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined!!",
  });
}

// Create a new user
export async function createUser(req, res, next) {
  const { name, email, phone, avatar, role, password, passwordConfirm } = req.body;

  try {
    // Create a new user with the provided data
    const newUser = await User.create({
      name,
      email,
      phone,
      avatar,
      role,
      password,
      passwordConfirm,
    });

    // Ensure password is not sent in the response
    newUser.password = undefined;

    res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    // Log error if something goes wrong
    logger.error("Error creating user", { error: err.message, stack: err.stack });
    return next(new AppError(err.message || "An error occurred while creating the user", 500));
  }
}

// Update user details
export const updateUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  // Update the user and return the new document
  const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
    runValidators: true,
    new: true,
  });

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// Delete a user
export const deleteUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  // Delete the user by ID
  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    return next(new AppError("User not found", 404));
  }

  // Log the successful deletion of the user
  logger.info("User deleted successfully", { userId });

  res.status(204).json({
    status: "success",
    message: "User deleted successfully",
  });
});
