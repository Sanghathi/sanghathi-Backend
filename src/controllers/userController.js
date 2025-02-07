import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js";

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
  try {
    console.log("Received Data:", req.body); // Debugging log

    const { name, email, phone, avatar, role, roleName, profile, password, passwordConfirm } = req.body;

    if (!roleName) {
      return next(new AppError("roleName is required but not provided", 400));
    }

    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return next(new AppError("Invalid role ID", 400));
    }

    const newUser = await User.create({
      name,
      email,
      phone,
      avatar,
      role,
      roleName,
      profile,
      password,
      passwordConfirm,
    });

    // Ensure password is not sent in the response
    newUser.password = undefined;

    res.status(201).json({
      status: "success",
      _id: newUser._id,
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    console.error("Error in createUser:", err);
    next(new AppError(err.message || "Error creating user", 500));
  }
}


// Update user details
// Update user details
export const updateUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;
  const { role, profileId } = req.body; // Extract profileId

  let updateData = { ...req.body };

  // If role is being updated, fetch the new role name
  if (role) {
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return next(new AppError("Invalid role ID", 400));
    }
    updateData.roleName = roleDoc.name; // Update roleName in DB
  }

  // Ensure profileId gets updated
  if (profileId) {
    updateData.profile = profileId;
  }

  // Update user details
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
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
