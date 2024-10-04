import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Role from "../models/Role.js";

export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role } = req.query;
  const filter = role ? { role: role } : {};

  // Find the role document by name
  const roleDoc = await Role.findOne({ name: role });

  if (role && !roleDoc) {
    return next(new AppError("Invalid role", 400));
  }

  // Update the filter to use the role ID
  if (roleDoc) {
    filter.role = roleDoc._id;
  }

  const users = await User.find(filter).populate("role");
  // Check if users array is empty
  if (users.length === 0) {
    res.status(200).json({
      status: "success",
      results: 0,
      data: {
        users: [],
      },
    });
  } else {
    // Send response with user array
    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  }
});

export function getUser(req, res) {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined!!",
  });
}

export async function createUser(req, res, next) {
  const { name, email, phone, avatar, role, password, passwordConfirm } =
    req.body;
  try {
    const newUser = await User.create({
      name,
      email,
      phone,
      avatar,
      role,
      password,
      passwordConfirm,
    });

    newUser.password = undefined;
    res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    logger.error("Error creating user", {
      error: err.message,
      stack: err.stack,
    });
    return next(new AppError(err, 500));
  }
}

export const updateUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  // Update the user and return the new document
  const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
    runValidators: true,
    new: true,
    context: "query",
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

export const deleteUser = catchAsync(async (req, res, next) => {
  logger.info("Deleting user", { userId: req.params.id });
  const { id: userId } = req.params;
  // perform the delete operation here, e.g.:
  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(204).json(); // return a success response with no content
});