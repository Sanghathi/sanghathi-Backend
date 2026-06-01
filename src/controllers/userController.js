import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js";
import bcrypt from "bcrypt";
import { encrypt, compare } from "../utils/passwordHelper.js";
import mongoose from "mongoose";
import { createHash } from "crypto";
import {
  getScopedCollegeCode,
  getScopedDepartment,
  resolveScopedDepartment,
  mergeCollegeScope,
  resolveCollegeCode,
} from "../utils/tenantContext.js";
import Mentorship from "../models/Mentorship.js";

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
  }

  return Boolean(value);
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeSelectFields = (rawFields, allowedFields, fallbackFields) => {
  if (!rawFields || typeof rawFields !== "string") {
    return fallbackFields;
  }

  const fields = rawFields
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field.length > 0 && allowedFields.has(field));

  return fields.length ? fields.join(" ") : fallbackFields;
};

const attachMentorData = async (users = [], collegeCode) => {
  const studentIds = users
    .filter((user) => user?.roleName === "student" && user?._id)
    .map((user) => user._id);

  if (!studentIds.length) {
    return users;
  }

  const mentorships = await Mentorship.find({
    menteeId: { $in: studentIds },
  })
    .select("mentorId menteeId")
    .lean();

  if (!mentorships.length) {
    return users;
  }

  const mentorIds = [
    ...new Set(
      mentorships
        .map((mentorship) => mentorship?.mentorId)
        .filter(Boolean)
        .map((mentorId) => mentorId.toString())
    ),
  ];

  if (!mentorIds.length) {
    return users;
  }

  const mentors = await User.find(
    mergeCollegeScope(
      { _id: { $in: mentorIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      collegeCode
    )
  )
    .select("_id name email avatar roleName")
    .lean();

  const mentorMap = new Map(
    mentors.map((mentor) => [mentor._id.toString(), mentor])
  );
  const menteeToMentorMap = new Map(
    mentorships.map((mentorship) => [
      mentorship.menteeId.toString(),
      mentorship.mentorId.toString(),
    ])
  );

  return users.map((user) => {
    if (user?.roleName !== "student") {
      return user;
    }

    const mentorId = menteeToMentorMap.get(user._id.toString());
    if (!mentorId) {
      return user;
    }

    const mentor = mentorMap.get(mentorId);
    if (!mentor) {
      return user;
    }

    return {
      ...user,
      mentor: {
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        avatar: mentor.avatar || null,
        roleName: mentor.roleName,
      },
    };
  });
};


// Get all users with optional role filtering
export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role, q, fields } = req.query;
  const semesterQuery = req.query.semester ?? req.query.sem;
  const includeProfiles = parseBoolean(req.query.includeProfiles, true);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const skip = (page - 1) * limit;

  const fallbackUserFields = "name email phone avatar role roleName profile status lastActivity collegeCode";
  const allowedUserFields = new Set([
    "_id",
    "name",
    "email",
    "phone",
    "avatar",
    "photo",
    "role",
    "roleName",
    "profile",
    "status",
    "lastActivity",
    "collegeCode",
    "department",
    "sem",
    "usn",
    "cabin",
  ]);

  const selectedUserFields = sanitizeSelectFields(
    fields,
    allowedUserFields,
    fallbackUserFields
  );

  let filter = {};
  const normalizedRole = (role || "").toString().toLowerCase();

  // If a role is provided in the query, filter by role
  if (role) {
    // match role case-insensitively
    const roleDoc = await Role.findOne({ name: new RegExp(`^${role}$`, "i") }).select("_id").lean();

    // If no valid role is found, throw an error
    if (!roleDoc) {
      return next(new AppError("Invalid role", 400));
    }

    // Update filter to match the role ID
    filter.role = roleDoc._id;
  }

  if (q && typeof q === "string") {
    const escapedSearch = escapeRegex(q.trim());
    if (escapedSearch) {
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }
  }

  const collegeCode = getScopedCollegeCode(req);
  const scopedDepartment = await resolveScopedDepartment(req);

  // Debug logs to inspect scoping behaviour for department-scoped admins
  logger.debug("[getAllUsers] resolved req.user summary:", {
    id: req.user?._id,
    email: req.user?.email,
    roleName: req.user?.roleName,
  });
  logger.debug("[getAllUsers] scopedDepartment, collegeCode:", {
    scopedDepartment,
    collegeCode,
  });
  logger.debug("[getAllUsers] initial filter before dept scoping:", filter);

  if (scopedDepartment) {
    // Use a case-insensitive regex for department to avoid casing/whitespace mismatches
    const deptRegex = new RegExp(`^\\s*${escapeRegex(scopedDepartment)}\\s*$`, "i");

    // Find profiles and raw user rows that belong to the scoped department.
    // Some records only store department on the User document, so we need both sources.
    const profileFilterForDept = mergeCollegeScope({ department: deptRegex }, collegeCode);
    const userFilterForDept = mergeCollegeScope({ department: deptRegex }, collegeCode);

    const [studentProfilesByDept, facultyProfilesByDept, scopedUsersByDept] = await Promise.all([
      mongoose.model("StudentProfile").find(profileFilterForDept).select("userId").lean(),
      mongoose.model("FacultyProfile").find(profileFilterForDept).select("userId").lean(),
      User.find(userFilterForDept).select("_id").lean(),
    ]);

    const scopedProfileUserIds = [
      ...studentProfilesByDept.map((profile) => profile.userId),
      ...facultyProfilesByDept.map((profile) => profile.userId),
    ];

    const scopedUserDepartmentIds = scopedUsersByDept.map((user) => user._id);

    // Also include department-scoped admin/director/hod users from the same department
    const deptScopedAdmins = await User.find(
      mergeCollegeScope(
        { roleName: { $in: ["admin", "director", "hod"] }, department: deptRegex },
        collegeCode
      )
    ).select("_id").lean();

    const deptAdminIds = deptScopedAdmins.map((user) => user._id);

    const allowedOrReferencedFilter = {
      $or: [
        { department: deptRegex },
        {
          _id: {
            $in: [...scopedProfileUserIds, ...scopedUserDepartmentIds, ...deptAdminIds],
          },
        },
      ],
    };

    logger.debug("[getAllUsers] scopedProfileUserIds count, deptAdminIds count:", {
      scopedProfileUserIds: scopedProfileUserIds.length,
      scopedUserDepartmentIds: scopedUserDepartmentIds.length,
      deptAdminIds: deptAdminIds.length,
    });
    logger.debug("[getAllUsers] allowedOrReferencedFilter:", allowedOrReferencedFilter);

    // If a role is provided, prefer restricting by role + department/profile membership
    if (role) {
      const profileModel = normalizedRole === "student" ? "StudentProfile" : normalizedRole === "faculty" ? "FacultyProfile" : null;

      if (profileModel) {
          const profileUserIds = await mongoose
            .model(profileModel)
            .find(mergeCollegeScope({ department: deptRegex }, collegeCode))
            .select("userId")
            .lean();

          const mappedIds = profileUserIds.map((profile) => profile.userId).filter(Boolean);
          const fallbackDeptIds = scopedUserDepartmentIds.filter(Boolean);
          const roleScopedIds = [...new Set([...mappedIds, ...fallbackDeptIds])];
          logger.info("[getAllUsers] profileUserIds mapped count for role", { role: normalizedRole, count: mappedIds.length });

          if (roleScopedIds.length > 0) {
            filter._id = { $in: roleScopedIds };
          } else {
            // Strictly enforce department scoping - if no profiles found in the department, return none
            filter._id = { $in: [] };
            logger.info("[getAllUsers] No department-matched profiles found for scoped role", {
              role: normalizedRole,
              scopedDepartment,
            });
          }
        } else {
        // role provided but not student/faculty -> apply role filter and department/profile membership
        filter = { ...filter, $and: [allowedOrReferencedFilter] };
      }

      if (normalizedRole === "student" && semesterQuery !== undefined && semesterQuery !== null && `${semesterQuery}`.trim() !== "") {
        const semesterNumber = Number(semesterQuery);
        if (Number.isInteger(semesterNumber)) {
          const semesterProfiles = await mongoose
            .model("StudentProfile")
            .find(mergeCollegeScope({ sem: semesterNumber }, collegeCode))
            .select("userId")
            .lean();

          const semesterUserIds = semesterProfiles.map((profile) => profile.userId).filter(Boolean).map((id) => id.toString());

          if (semesterUserIds.length > 0) {
            const currentIds = Array.isArray(filter._id?.$in) ? filter._id.$in.map((id) => id.toString()) : null;
            const filteredIds = currentIds ? currentIds.filter((id) => semesterUserIds.includes(id)) : semesterUserIds;
            filter._id = { $in: filteredIds };
          } else {
            filter._id = { $in: [] };
          }
        }
      }
    } else {
      // No explicit role filter: restrict results to the scoped department and related users
      filter = { ...filter, $and: [allowedOrReferencedFilter] };
    }
  }

  // Get all users with profile data
  const scopedFilter = mergeCollegeScope(filter, collegeCode);
  logger.debug("[getAllUsers] scopedFilter to be used for DB query:", scopedFilter);

  const [users, total] = await Promise.all([
    User.find(scopedFilter)
      .select(selectedUserFields)
      .sort({ name: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "role", select: "name permissions" })
      .lean(),
    User.countDocuments(scopedFilter),
  ]);

  if (users.length === 0) {
    return res.status(200).json({
      status: "success",
      results: 0,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      data: {
        users: [],
      },
    });
  }

  if (!includeProfiles) {
    return res.status(200).json({
      status: "success",
      results: users.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      data: {
        users,
      },
    });
  }

  // Get all user IDs
  const userIds = users.map(user => user._id);
  
  // Fetch student profiles
  const collegeScope = mergeCollegeScope({ userId: { $in: userIds } }, collegeCode);
  const studentProfiles = await mongoose
    .model("StudentProfile")
    .find(collegeScope)
    .select("userId department sem usn photo")
    .lean();
  
  // Fetch faculty profiles
  const facultyProfiles = await mongoose
    .model("FacultyProfile")
    .find(collegeScope)
    .select("userId department cabin photo")
    .lean();
  
  // Create maps for quick lookup
  const studentProfileMap = {};
  studentProfiles.forEach(profile => {
    studentProfileMap[profile.userId.toString()] = profile;
  });
  
  const facultyProfileMap = {};
  facultyProfiles.forEach(profile => {
    facultyProfileMap[profile.userId.toString()] = profile;
  });
  
  // Enhance user objects with profile data
  const enhancedUsers = users.map(user => {
    const enhancedUser = { ...user };
    const studentProfile = studentProfileMap[user._id.toString()];
    const facultyProfile = facultyProfileMap[user._id.toString()];
    
    // Add profile data based on role
    if (user.roleName === 'student' && studentProfile) {
      enhancedUser.department = studentProfile.department;
      enhancedUser.sem = studentProfile.sem;
      enhancedUser.usn = studentProfile.usn;
      enhancedUser.photo = studentProfile.photo || null;
      if (studentProfile.photo) {
        enhancedUser.avatar = studentProfile.photo;
      }
    } else if (user.roleName === 'faculty' && facultyProfile) {
      enhancedUser.department = facultyProfile.department;
      enhancedUser.cabin = facultyProfile.cabin;
      enhancedUser.photo = facultyProfile.photo || null;
      if (facultyProfile.photo) {
        enhancedUser.avatar = facultyProfile.photo;
      }
    }
    
    return enhancedUser;
  });

  const usersWithMentors = await attachMentorData(enhancedUsers, collegeCode);

  return res.status(200).json({
    status: "success",
    results: usersWithMentors.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    data: {
      users: usersWithMentors,
    },
  });
});

// Get user by ID (not yet implemented, could return an error or be defined later)
export const getUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError(`Invalid user ID: ${userId}`, 400));
  }

  const includeProfiles = parseBoolean(
    req.query.includeProfiles ?? req.query.includeProfile,
    true
  );

  const fallbackUserFields = "name email phone avatar role roleName profile status lastActivity collegeCode";
  const allowedUserFields = new Set([
    "_id",
    "name",
    "email",
    "phone",
    "avatar",
    "photo",
    "role",
    "roleName",
    "profile",
    "status",
    "lastActivity",
    "collegeCode",
    "department",
    "sem",
    "usn",
    "cabin",
  ]);

  const selectedUserFields = sanitizeSelectFields(
    req.query.fields,
    allowedUserFields,
    fallbackUserFields
  );

  const user = await User.findById(userId)
    .select(selectedUserFields)
    .populate({ path: "role", select: "name permissions" })
    .lean();

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const collegeCode = getScopedCollegeCode(req);
  if (collegeCode && user.collegeCode && user.collegeCode !== collegeCode) {
    logger.warn("[getUser] College mismatch access denied", {
      requestedId: userId,
      userCollege: user.collegeCode,
      scopedCollege: collegeCode,
    });
    return next(new AppError("Access denied for this college", 403));
  }

  // Use the async resolver for department scoping if applicable
  const scopedDepartment = await resolveScopedDepartment(req);
  if (scopedDepartment) {
    const normalizedScoped = (scopedDepartment || "").trim().toLowerCase();
    
    // Check both User-level department and potential profile-level department
    const profileDeptMatch = [user.department]
      .filter(Boolean)
      .map((d) => d.trim().toLowerCase());

    // We only restrict if the user ALREADY has a department field and it doesn't match
    // If they don't have it yet, we'll check again after fetching profiles
    if (profileDeptMatch.length && !profileDeptMatch.includes(normalizedScoped)) {
      logger.warn("[getUser] Department mismatch access denied", {
        requestedId: userId,
        userDept: user.department,
        scopedDept: normalizedScoped,
      });
      return next(new AppError("Access denied for this department", 403));
    }
  }

  if (!includeProfiles) {
    return res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  }

  const profileFilter = mergeCollegeScope({ userId: user._id }, collegeCode);

  const [studentProfile, facultyProfile] = await Promise.all([
    mongoose
      .model("StudentProfile")
      .findOne(profileFilter)
      .lean(),
    mongoose
      .model("FacultyProfile")
      .findOne(profileFilter)
      .lean(),
  ]);

  const enhancedUser = { ...user };
  
  // Attach profiles for components that expect them (like ViewingContextHeader)
  if (studentProfile) {
    enhancedUser.studentProfile = studentProfile;
    enhancedUser.department = studentProfile.department;
    enhancedUser.sem = studentProfile.sem;
    enhancedUser.usn = studentProfile.usn;
    enhancedUser.photo = studentProfile.photo || null;
    if (studentProfile.photo) {
      enhancedUser.avatar = studentProfile.photo;
    }
  }

  if (facultyProfile) {
    enhancedUser.facultyProfile = facultyProfile;
    if (!enhancedUser.department) {
      enhancedUser.department = facultyProfile.department;
    }
    enhancedUser.cabin = facultyProfile.cabin;
    if (!enhancedUser.photo) {
      enhancedUser.photo = facultyProfile.photo || null;
    }
    if (facultyProfile.photo) {
      enhancedUser.avatar = facultyProfile.photo;
    }
  }

    const [userWithMentor] = await attachMentorData([enhancedUser], collegeCode);

  // Final department scoping check if it was deferred
    if (scopedDepartment && userWithMentor.department) {
     const normalizedScoped = (scopedDepartment || "").trim().toLowerCase();
      if (userWithMentor.department.trim().toLowerCase() !== normalizedScoped) {
        logger.warn("[getUser] Defered department mismatch access denied", {
            requestedId: userId,
          resolvedDept: userWithMentor.department,
            scopedDept: normalizedScoped
        });
        return next(new AppError("Access denied for this department", 403));
     }
  }

  return res.status(200).json({
    status: "success",
    data: {
      user: userWithMentor,
    },
  });
});

// Create a new user
export async function createUser(req, res, next) {
  try {
    logger.info("Received Data:", req.body); // Debugging log

    const {
      name,
      email,
      phone,
      avatar,
      role,
      roleName,
      profile,
      password,
      passwordConfirm,
      collegeCode,
    } = req.body;

    if (!roleName) {
      return next(new AppError("roleName is required but not provided", 400));
    }

    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return next(new AppError("Invalid role ID", 400));
    }

    const resolvedCollegeCode = resolveCollegeCode({
      body: { collegeCode },
      user: req.user,
    });

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
      collegeCode: resolvedCollegeCode,
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
    logger.error("Error in createUser:", err);
    next(new AppError(err.message || "Error creating user", 500));
  }
}

// Update user details
export const updateUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;
  const { role, profileId, collegeCode } = req.body; // Extract profileId

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

  if (Object.prototype.hasOwnProperty.call(req.body, "collegeCode")) {
    updateData.collegeCode = resolveCollegeCode({
      body: { collegeCode },
      user: req.user,
    });
  }

  // Update user details
  const scopedCollegeCode = getScopedCollegeCode(req);
  const updateFilter = mergeCollegeScope({ _id: userId }, scopedCollegeCode);
  const updatedUser = await User.findOneAndUpdate(updateFilter, updateData, {
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
  const collegeCode = getScopedCollegeCode(req);
  const deleteFilter = mergeCollegeScope({ _id: userId }, collegeCode);
  const deletedUser = await User.findOneAndDelete(deleteFilter);

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

//Get User by USN
export const getUserByUSN = async (req, res) => {
  try {
    const { usn } = req.params;
    
    // First, find the student profile(s) with this USN
    const StudentProfile = mongoose.model("StudentProfile");
    const collegeCode = getScopedCollegeCode(req);
    const profileFilter = mergeCollegeScope({ usn }, collegeCode);

    // Try to find a profile whose userId points to an existing User.
    // This handles orphaned/duplicate studentprofile documents (same USN).
    const candidateProfiles = await StudentProfile.find(profileFilter).select("userId").lean();

    if (!candidateProfiles || candidateProfiles.length === 0) {
      return res.status(404).json({ message: "Student profile with this USN not found" });
    }

    let foundUser = null;
    for (const profile of candidateProfiles) {
      if (!profile?.userId) continue;
      const user = await User.findById(profile.userId).select("_id").lean();
      if (user) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      // No linked user exists for any of the profiles with this USN
      return res.status(404).json({ message: "User associated with this USN not found" });
    }

    res.json({ userId: foundUser._id });
  } catch (error) {
    logger.error("Error in getUserByUSN:", error);
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = catchAsync(async (req, res, next) => {
  try {
    const { currentPassword, newPassword, passwordConfirm, userId } = req.body;

    // Check if passwords match
    if (newPassword !== passwordConfirm) {
      return next(new AppError("Passwords do not match", 400));
    }

    // Find user by ID and select password field
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Verify current password using the user's method
    const isPasswordValid = await user.checkPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return next(new AppError("Current password is incorrect", 400));
    }

    // Update password (the pre-save middleware will handle hashing)
    user.password = newPassword;
    user.passwordConfirm = passwordConfirm; // Add passwordConfirm field
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export const resetPasswordWithToken = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;

  const user = await User.findOne({
    passwordResetToken: createHash("sha256").update(req.params.token).digest("hex"),
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password reset successful",
  });
});

// Allow a STR Coordinator to set their department (used for director/strcoordinator flows)
export const setStrCoordinatorDepartment = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;
  const { department } = req.body;

  if (!userId) return next(new AppError("Unauthorized", 401));

  if (!department || typeof department !== "string" || !department.trim()) {
    return next(new AppError("department is required", 400));
  }

  // Only allow users with roleName 'strcoordinator' to use this endpoint
  const roleName = (req.user?.roleName || "").toString().toLowerCase();
  if (roleName !== "strcoordinator") {
    return next(new AppError("Only STR Coordinator users can set department via this endpoint", 403));
  }

  const updated = await User.findOneAndUpdate({ _id: userId }, { department: department.trim() }, { new: true });

  if (!updated) return next(new AppError("User not found", 404));

  res.status(200).json({ status: "success", data: { user: updated } });
});
