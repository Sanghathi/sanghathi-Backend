import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";

// Get all users with optional role filtering
export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role } = req.query;
  let filter = {};

  if (role) {
    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) return next(new AppError("Invalid role", 400));
    filter.role = roleDoc._id;
  }

  const users = await User.find(filter).populate("role").lean();
  const userIds = users.map(u => u._id);

  const StudentProfile = mongoose.model('StudentProfile');
  const FacultyProfile = mongoose.model('FacultyProfile');

  const [studentProfiles, facultyProfiles] = await Promise.all([
    StudentProfile.find({ userId: { $in: userIds } }).lean(),
    FacultyProfile.find({ userId: { $in: userIds } }).lean()
  ]);

  const studentMap = studentProfiles.reduce((acc, p) => ({ ...acc, [p.userId]: p }), {});
  const facultyMap = facultyProfiles.reduce((acc, p) => ({ ...acc, [p.userId]: p }), {});

  const enhancedUsers = users.map(user => {
    const u = { ...user };
    if (user.roleName === 'student' && studentMap[user._id]) {
      Object.assign(u, {
        department: studentMap[user._id].department,
        sem: studentMap[user._id].sem,
        usn: studentMap[user._id].usn
      });
    }
    if (user.roleName === 'faculty' && facultyMap[user._id]) {
      Object.assign(u, {
        department: facultyMap[user._id].department,
        cabin: facultyMap[user._id].cabin
      });
    }
    return u;
  });

  res.status(200).json({ status: 'success', results: enhancedUsers.length, data: { users: enhancedUsers } });
});

// Get user by ID (placeholder)
export function getUser(req, res) {
  res.status(500).json({ status: 'error', message: 'This route is not yet defined!!' });
}

// Create a new user
export const createUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, avatar, roleName, profile, password, passwordConfirm } = req.body;

  if (!roleName) return next(new AppError("roleName is required", 400));

  const roleDoc = await Role.findOne({ name: roleName });
  if (!roleDoc) return next(new AppError("Role not found", 400));

  const newUser = await User.create({
    name,
    email,
    phone,
    avatar,
    role: roleDoc._id,
    roleName: roleDoc.name,
    profile,
    password,
    passwordConfirm,
  });

  newUser.password = undefined;
  res.status(201).json({ status: 'success', _id: newUser._id, data: { user: newUser } });
});

// Update user details
export const updateUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const { roleName, profileId, ...rest } = req.body;
  const update = { ...rest };

  if (roleName) {
    const roleDoc = await Role.findOne({ name: roleName });
    if (!roleDoc) return next(new AppError("Role not found", 400));
    update.role = roleDoc._id;
    update.roleName = roleDoc.name;
  }
  if (profileId) update.profile = profileId;

  const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (!updatedUser) return next(new AppError("User not found", 404));

  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

// Delete a user
export const deleteUser = catchAsync(async (req, res, next) => {
  const deletedUser = await User.findByIdAndDelete(req.params.id);
  if (!deletedUser) return next(new AppError("User not found", 404));
  res.status(204).json({ status: 'success' });
});

// Get user by USN
export const getUserByUSN = catchAsync(async (req, res, next) => {
  const StudentProfile = mongoose.model("StudentProfile");
  const profile = await StudentProfile.findOne({ usn: req.params.usn });
  if (!profile) return next(new AppError("Student profile not found", 404));
  const user = await User.findById(profile.userId);
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: 'success', data: { userId: user._id } });
});

// Reset password for logged-in user
export const resetPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, passwordConfirm, userId } = req.body;
  if (newPassword !== passwordConfirm) return next(new AppError("Passwords do not match", 400));
  const user = await User.findById(userId).select('+password');
  if (!user) return next(new AppError("User not found", 404));
  const valid = await user.checkPassword(currentPassword, user.password);
  if (!valid) return next(new AppError("Current password incorrect", 400));
  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;
  await user.save();
  res.status(200).json({ status: 'success', message: 'Password updated successfully' });
});
